import os, json, time, math, requests, schedule, openai
from decimal import Decimal, ROUND_DOWN
from dotenv import load_dotenv

load_dotenv()  # read .env

# ------------------------------------------------------------
#  Configuration
# ------------------------------------------------------------
RECALL_KEY = "57f3236691e652e4_5dd73dc0ea97b21e"  # Your provided API key
OPENAI_KEY = os.getenv("OPENAI_API_KEY")  # may be None
SANDBOX_API = "https://api.sandbox.competitions.recall.network"

TOKEN_MAP = {  # main-net addresses (sandbox forks main-net)
    "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # 6 dec
    "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  # 18 dec
    "WBTC": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",  # 8 dec
}

DECIMALS = {"USDC": 6, "WETH": 18, "WBTC": 8}

COINGECKO_IDS = {  # symbol → CG id
    "USDC": "usd-coin",
    "WETH": "weth",
    "WBTC": "wrapped-bitcoin",
}

DRIFT_THRESHOLD = 0.02  # rebalance if > 2 % off target
REB_TIME = "09:00"  # local server time

# ------------------------------------------------------------
#  Helper utilities
# ------------------------------------------------------------
def load_targets() -> dict[str, float]:
    with open("portfolio_config.json") as f:
        return json.load(f)

def to_base_units(amount_float: float, decimals: int) -> str:
    """Convert human units → integer string that Recall expects."""
    scaled = Decimal(str(amount_float)) * (10 ** decimals)
    return str(int(scaled.quantize(Decimal("1"), rounding=ROUND_DOWN)))

# ------------------------------------------------------------
#  Market data
# ------------------------------------------------------------
def fetch_prices(symbols: list[str]) -> dict[str, float]:
    ids = ",".join(COINGECKO_IDS[sym] for sym in symbols)
    r = requests.get(
        "https://api.coingecko.com/api/v3/simple/price",
        params={"ids": ids, "vs_currencies": "usd"},
        timeout=10,
    )
    data = r.json()
    return {sym: data[COINGECKO_IDS[sym]]["usd"] for sym in symbols}

def fetch_holdings() -> dict[str, float]:
    """Return whole-token balances from Recall's sandbox."""
    try:
        # Try the portfolio endpoint first
        r = requests.get(
            f"{SANDBOX_API}/api/account/portfolio",
            headers={"Authorization": f"Bearer {RECALL_KEY}"},
            timeout=10,
        )
        if r.status_code == 200:
            portfolio_data = r.json()
            balances = portfolio_data.get('balances', {})
            holdings = {}
            for token_symbol, balance_info in balances.items():
                if isinstance(balance_info, dict) and 'balance' in balance_info:
                    holdings[token_symbol] = float(balance_info['balance'])
                elif isinstance(balance_info, (int, float)):
                    holdings[token_symbol] = float(balance_info)
            return holdings
        else:
            # Try the balance endpoint from docs
            r = requests.get(
                f"{SANDBOX_API}/api/balance",
                headers={"Authorization": f"Bearer {RECALL_KEY}"},
                timeout=10,
            )
            r.raise_for_status()
            return r.json()
    except Exception as e:
        print(f"⚠️ Error fetching holdings: {e}")
        print("\n🔧 Setup Instructions:")
        print("1. Register at https://register.recall.network")
        print("2. Get your API key from the dashboard")
        print("3. Fund your sandbox wallet using the faucet")
        print("4. Make sure your API key is active")
        print(f"\nCurrent API Key: {RECALL_KEY}")
        raise

# ------------------------------------------------------------
#  Trading logic
# ------------------------------------------------------------
def compute_orders(targets, prices, holdings):
    """Return a list of {'symbol','side','amount'} trades."""
    total_value = sum(holdings.get(s, 0) * prices[s] for s in targets)
    if total_value == 0:
        raise ValueError("No balances found; fund your sandbox wallet first.")

    overweight, underweight = [], []
    for sym, weight in targets.items():
        current_val = holdings.get(sym, 0) * prices[sym]
        target_val = total_value * weight
        drift_pct = (current_val - target_val) / total_value
        if abs(drift_pct) >= DRIFT_THRESHOLD:
            delta_val = abs(target_val - current_val)
            token_amt = delta_val / prices[sym]
            side = "sell" if drift_pct > 0 else "buy"
            (overweight if side == "sell" else underweight).append(
                {"symbol": sym, "side": side, "amount": token_amt}
            )

    # Execute sells first so we have USDC to fund buys
    return overweight + underweight

def execute_trade(symbol, side, amount_float):
    from_token, to_token = (
        (TOKEN_MAP[symbol], TOKEN_MAP["USDC"]) if side == "sell"
        else (TOKEN_MAP["USDC"], TOKEN_MAP[symbol])
    )

    payload = {
        "fromToken": from_token,
        "toToken": to_token,
        "amount": to_base_units(amount_float, DECIMALS[symbol]),
        "reason": "Automatic portfolio rebalance",
    }
    r = requests.post(
        f"{SANDBOX_API}/api/trade/execute",
        json=payload,
        headers={
            "Authorization": f"Bearer {RECALL_KEY}",
            "Content-Type": "application/json",
        },
        timeout=20,
    )
    r.raise_for_status()
    return r.json()

# ------------------------------------------------------------
#  Optional: GPT-4o target adjustments
# ------------------------------------------------------------
def ai_adjust_targets(targets: dict[str, float]) -> dict[str, float]:
    if not OPENAI_KEY:
        return targets  # AI disabled

    client = openai.OpenAI(api_key=OPENAI_KEY)

    prompt = (
        "Here is my current target allocation (weights sum to 1):\n"
        f"{json.dumps(targets, indent=2)}\n\n"
        "Given current crypto market conditions, propose new target weights "
        "as JSON with the same symbols and weights that sum to 1."
    )
    chat = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )
    raw = chat.choices[0].message.content
    try:
        # Remove triple-backtick blocks if model returns Markdown
        clean = raw.strip("` \n")
        return json.loads(clean)
    except json.JSONDecodeError:
        print("⚠️ GPT response was not valid JSON, keeping existing targets")
        return targets

# ------------------------------------------------------------
#  Daily job
# ------------------------------------------------------------
def rebalance():
    targets = load_targets()
    targets = ai_adjust_targets(targets)
    prices = fetch_prices(list(targets.keys()))
    holdings = fetch_holdings()
    orders = compute_orders(targets, prices, holdings)

    if not orders:
        print("✅ Portfolio already within ±2 % of target.")
        return

    for order in orders:
        res = execute_trade(**order)
        print("Executed", order, "→", res["status"])

    print("🎯 Rebalance complete.")

# ------------------------------------------------------------
#  Scheduler
# ------------------------------------------------------------
schedule.every().day.at(REB_TIME).do(rebalance)

if __name__ == "__main__":
    print("🚀 Starting portfolio manager… (Ctrl-C to quit)")
    print(f"🔑 Using API Key: {RECALL_KEY[:10]}...")
    rebalance()  # run once at launch
    while True:
        schedule.run_pending()
        time.sleep(60)
