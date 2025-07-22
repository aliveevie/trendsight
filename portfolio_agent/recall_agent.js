import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const API_KEY = process.env.RECALL_SANDBOX_API_KEY;
const BASE_URL = "https://api.sandbox.competitions.recall.network/api";

// Token addresses and symbols from snapshot
const TOKENS = {
  USDC_1: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  USDC_2: {
    address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  USDbC: {
    address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA",
    symbol: "USDbC",
    chain: "evm",
    decimals: 6
  },
  USDC_3: {
    address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  USDC_4: {
    address: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  SOL: {
    address: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    chain: "svm",
    decimals: 9
  },
  USDC_SVM: {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    chain: "svm",
    decimals: 6
  },
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    chain: "evm",
    decimals: 18
  }
};

const USDC_SYMBOLS = ["USDC", "USDbC"];
const PROFIT_THRESHOLD = 0.005; // 0.5%
const POLL_INTERVAL = 60 * 1000; // 1 minute

if (!API_KEY) {
  console.error("Missing RECALL_SANDBOX_API_KEY in .env");
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  },
  timeout: 20000,
});

async function getPortfolio() {
  const res = await api.get("/agent/portfolio");
  return res.data;
}

function flattenUSDC(tokens) {
  // Sum all USDC and USDbC tokens
  return tokens.filter(t => USDC_SYMBOLS.includes(t.symbol)).reduce((sum, t) => sum + t.value, 0);
}

async function executeTrade({ token, side, amount }) {
  const body = {
    tokenAddress: token.address,
    amount: amount.toString(),
    side, // 'buy' or 'sell'
  };
  const res = await api.post("/trade/execute", body);
  return res.data;
}

function findOpportunities(snapshot, current) {
  const ops = [];
  for (const key in TOKENS) {
    if (USDC_SYMBOLS.includes(TOKENS[key].symbol)) continue;
    const snap = snapshot.find(t => t.token === TOKENS[key].address);
    const curr = current.find(t => t.token === TOKENS[key].address);
    if (!snap || !curr) continue;
    const change = (curr.price - snap.price) / snap.price;
    if (change >= PROFIT_THRESHOLD && curr.amount > 0) {
      ops.push({ token: TOKENS[key], side: "sell", amount: curr.amount, price: curr.price, change });
    }
  }
  return ops;
}

async function main() {
  // Initial snapshot
  const initialPortfolio = await getPortfolio();
  const snapshotTokens = initialPortfolio.tokens;
  const snapshotTime = initialPortfolio.snapshotTime;
  console.log(`Initial snapshot taken at ${snapshotTime}`);

  while (true) {
    try {
      const portfolio = await getPortfolio();
      const currentTokens = portfolio.tokens;
      const ops = findOpportunities(snapshotTokens, currentTokens);
      for (const op of ops) {
        // Sell all profitable tokens back to USDC
        const minAmount = 10 ** -op.token.decimals;
        if (op.amount > minAmount) {
          const trade = await executeTrade({ token: op.token, side: "sell", amount: op.amount });
          console.log(`[TRADE] Sold ${op.amount} ${op.token.symbol} at $${op.price} (+${(op.change*100).toFixed(2)}%)`);
        }
      }
      // Calculate total USDC (all variants)
      const usdcTotal = flattenUSDC(currentTokens);
      console.log(`[INFO] USDC (all) balance: ${usdcTotal}`);
    } catch (e) {
      console.error("[ERROR]", e.message);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 