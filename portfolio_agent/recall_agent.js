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
const BUY_THRESHOLD = -0.02; // -2% (buy when price drops)
const REINVESTMENT_PERCENTAGE = 0.1; // 10% of USDC for reinvestment
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
  return tokens.filter(t => USDC_SYMBOLS.includes(t.symbol)).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
}

function getTotalPortfolioValue(tokens) {
  return tokens.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
}

async function executeTrade({ token, side, amount }) {
  const body = {
    tokenAddress: token.address,
    amount: amount.toString(),
    side,
  };
  const res = await api.post("/trade/execute", body);
  return res.data;
}

function findOpportunities(snapshot, current) {
  const sellOps = [];
  const buyOps = [];
  
  for (const key in TOKENS) {
    if (USDC_SYMBOLS.includes(TOKENS[key].symbol)) continue;
    
    const snap = snapshot.find(t => t.token === TOKENS[key].address);
    const curr = current.find(t => t.token === TOKENS[key].address);
    
    if (!snap || !curr) continue;
    
    const change = snap.price ? (curr.price - snap.price) / snap.price : 0;
    
    // Sell opportunity: price increased by threshold
    if (change >= PROFIT_THRESHOLD && curr.amount > 0) {
      sellOps.push({ 
        token: TOKENS[key], 
        side: "sell", 
        amount: curr.amount, 
        price: curr.price, 
        change,
        value: curr.value
      });
    }
    
    // Buy opportunity: price dropped significantly
    if (change <= BUY_THRESHOLD) {
      buyOps.push({ 
        token: TOKENS[key], 
        side: "buy", 
        price: curr.price, 
        change,
        targetPrice: snap.price
      });
    }
  }
  
  return { sellOps, buyOps };
}

function calculateReinvestmentAmount(usdcTotal, buyOps) {
  if (buyOps.length === 0) return 0;
  
  const reinvestmentAmount = usdcTotal * REINVESTMENT_PERCENTAGE;
  const amountPerToken = reinvestmentAmount / buyOps.length;
  
  return Math.min(amountPerToken, usdcTotal * 0.05); // Max 5% per token
}

function formatNum(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function main() {
  const initialPortfolio = await getPortfolio();
  const snapshotTokens = initialPortfolio.tokens;
  const snapshotTime = initialPortfolio.snapshotTime;
  const initialUSDC = flattenUSDC(snapshotTokens);
  const initialTotalValue = getTotalPortfolioValue(snapshotTokens);
  let cumulativeProfit = 0;
  let cycleCount = 0;

  while (true) {
    cycleCount++;
    const cycleStart = new Date();
    let usdcSpent = 0;
    let usdcGained = 0;
    let coinsBought = [];
    let coinsSold = [];
    try {
      const portfolio = await getPortfolio();
      const currentTokens = portfolio.tokens;
      const currentUSDC = flattenUSDC(currentTokens);
      const currentTotalValue = getTotalPortfolioValue(currentTokens);
      const { sellOps, buyOps } = findOpportunities(snapshotTokens, currentTokens);

      // Sells
      for (const op of sellOps) {
        const minAmount = 10 ** -op.token.decimals;
        if (op.amount > minAmount) {
          try {
            await executeTrade({ token: op.token, side: "sell", amount: op.amount });
            usdcGained += Number(op.value) || 0;
            coinsSold.push(`${op.token.symbol} (${formatNum(op.amount)})`);
          } catch (error) {}
        }
      }
      // Buys
      if (buyOps.length > 0 && currentUSDC > 100) {
        const reinvestAmount = calculateReinvestmentAmount(currentUSDC, buyOps);
        for (const op of buyOps) {
          if (reinvestAmount > 10) {
            const buyAmount = reinvestAmount / op.price;
            try {
              await executeTrade({ token: op.token, side: "buy", amount: buyAmount });
              usdcSpent += reinvestAmount;
              coinsBought.push(`${op.token.symbol} (${formatNum(buyAmount)})`);
            } catch (error) {}
          }
        }
      }
      // Profit calculation
      const usdcChange = currentUSDC - initialUSDC;
      const totalValueChange = currentTotalValue - initialTotalValue;
      cumulativeProfit += usdcGained - usdcSpent;
      const usdcChangePercent = initialUSDC ? (usdcChange / initialUSDC) * 100 : 0;
      const totalValueChangePercent = initialTotalValue ? (totalValueChange / initialTotalValue) * 100 : 0;
      const cycleEnd = new Date();
      const cycleDuration = cycleEnd - cycleStart;
      // Log summary
      console.log(`\nCycle ${cycleCount} | ${cycleEnd.toLocaleTimeString()}`);
      console.log(`USDC: $${formatNum(currentUSDC)} (${usdcChange >= 0 ? '+' : ''}${formatNum(usdcChange)}, ${usdcChangePercent >= 0 ? '+' : ''}${formatNum(usdcChangePercent)}%)`);
      console.log(`Total Value: $${formatNum(currentTotalValue)} (${totalValueChange >= 0 ? '+' : ''}${formatNum(totalValueChange)}, ${totalValueChangePercent >= 0 ? '+' : ''}${formatNum(totalValueChangePercent)}%)`);
      console.log(`Coins Bought: ${coinsBought.length ? coinsBought.join(', ') : 'None'}`);
      console.log(`Coins Sold: ${coinsSold.length ? coinsSold.join(', ') : 'None'}`);
      console.log(`USDC Spent: $${formatNum(usdcSpent)} | USDC Gained: $${formatNum(usdcGained)}`);
      console.log(`Cumulative Profit: $${formatNum(cumulativeProfit)}`);
      console.log(`Cycle Duration: ${cycleDuration}ms`);
    } catch (error) {
      console.error(`[ERROR] Cycle ${cycleCount}: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 