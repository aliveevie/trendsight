import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("RECALL_API_KEY")
BASE_URL = "https://api.sandbox.competitions.recall.network"
RECALL_API_URL = f"{BASE_URL}/api/trade/execute"
PORTFOLIO_API_URL = f"{BASE_URL}/api/account/portfolio"

def recall_trade_tool(fromToken: str, toToken: str, amount: str, reason: str) -> dict:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    trade_data = {
        "fromToken": fromToken,
        "toToken": toToken,
        "amount": amount,
        "reason": reason
    }
    response = requests.post(RECALL_API_URL, json=trade_data, headers=headers)
    try:
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_portfolio() -> dict:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.get(PORTFOLIO_API_URL, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        # Return empty data if Recall API fails
        return {}

def get_balances() -> dict:
    portfolio = get_portfolio()
    return portfolio.get('balances', {})

def get_trading_history() -> list:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    # If Recall API exposes a trading history endpoint, use it here. Example:
    TRADES_API_URL = f"{BASE_URL}/api/account/trades"
    try:
        resp = requests.get(TRADES_API_URL, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json().get('trades', [])
    except Exception as e:
        return [] 