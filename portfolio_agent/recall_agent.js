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
const VOLATILE = ["SOL", "WETH"];
const POLL_INTERVAL = 60 * 1000;
const MAX_POSITION = 0.4; // 40% max in any one token
const MIN_TRADE_USD = 20;
const MOMENTUM_WINDOW = 5; // 5 cycles (minutes)
const REBALANCE_INTERVAL = 60; // every 60 cycles (1 hour)

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

async function getTokenPrice(tokenObj) {
  try {
    const params = {
      token: tokenObj.address,
      chain: tokenObj.chain,
      specificChain: tokenObj.chain === 'evm' ? 'eth' : 'svm'
    };
    const res = await api.get('/price', { params });
    if (res.data && res.data.success && typeof res.data.price === 'number') {
      return res.data.price;
    } else {
      console.warn(`[PRICE WARNING] No price for token ${tokenObj.symbol} (${tokenObj.address})`);
      return null;
    }
  } catch (error) {
    console.warn(`[PRICE ERROR] Could not fetch price for ${tokenObj.symbol}:`, error.response?.data || error.message);
    return null;
  }
}

function flattenUSDC(tokens) {
  return tokens.filter(t => USDC_SYMBOLS.includes(t.symbol)).reduce((sum, t) => sum + (Number(t.value) || 0), 0);
}

function getTotalPortfolioValue(tokens) {
  return tokens.reduce((sum, t) => sum + (Number(t.value) || 0), 0);
}

function getTokenByAddress(address) {
  return Object.values(TOKENS).find(t => t.address === address);
}

function getUsdcTokenForChain(chain) {
  // Prefer the first USDC token for the chain
  return Object.values(TOKENS).find(tok => USDC_SYMBOLS.includes(tok.symbol) && tok.chain === chain);
}

function getChainAndSpecific(token) {
  return {
    chain: token.chain,
    specific: 'mainnet'
  };
}

async function executeTrade(fromTokenAddr, toTokenAddr, amount, reason, fromTokenObj, toTokenObj) {
  const fromChainInfo = getChainAndSpecific(fromTokenObj);
  const toChainInfo = getChainAndSpecific(toTokenObj);
  const tradeData = {
    fromToken: fromTokenAddr,
    toToken: toTokenAddr,
    amount: amount.toString(),
    reason,
    slippageTolerance: "0.5",
    fromChain: fromChainInfo.chain,
    fromSpecificChain: fromChainInfo.specific,
    toChain: toChainInfo.chain,
    toSpecificChain: toChainInfo.specific
  };
  console.log(`[TRADE ATTEMPT]`, tradeData);
  try {
    const res = await api.post("/trade/execute", tradeData);
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error(`[TRADE ERROR] Status: ${error.response.status}`);
      console.error(`[TRADE ERROR] Data:`, error.response.data);
    } else {
      console.error(`[TRADE ERROR]`, error.message);
    }
    throw error;
  }
}

async function canTrade(fromTokenObj, toTokenObj, amount) {
  // Check price for both tokens
  const fromPrice = await getTokenPrice(fromTokenObj);
  const toPrice = await getTokenPrice(toTokenObj);
  if (!fromPrice || !toPrice) {
    console.warn(`[TRADE SKIP] No price for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`);
    return false;
  }
  // Check trade quote
  try {
    const params = {
      fromToken: fromTokenObj.address,
      toToken: toTokenObj.address,
      amount: amount.toString(),
      fromChain: fromTokenObj.chain,
      fromSpecificChain: fromTokenObj.chain === 'evm' ? 'eth' : 'svm',
      toChain: toTokenObj.chain,
      toSpecificChain: toTokenObj.chain === 'evm' ? 'eth' : 'svm'
    };
    const res = await api.get('/trade/quote', { params });
    if (res.data && res.data.fromAmount > 0 && res.data.toAmount > 0) {
      return true;
    } else {
      console.warn(`[TRADE SKIP] No quote for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`);
      return false;
    }
  } catch (error) {
    console.warn(`[TRADE SKIP] Quote error for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`);
    return false;
  }
}

function formatNum(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Track price history for momentum/mean reversion
const priceHistory = {};
function updatePriceHistory(tokens) {
  for (const t of tokens) {
    if (!priceHistory[t.token]) priceHistory[t.token] = [];
    priceHistory[t.token].push(t.price);
    if (priceHistory[t.token].length > MOMENTUM_WINDOW) priceHistory[t.token].shift();
  }
}
function getMomentum(tokenAddr) {
  const hist = priceHistory[tokenAddr];
  if (!hist || hist.length < MOMENTUM_WINDOW) return 0;
  return (hist[hist.length - 1] - hist[0]) / hist[0];
}

function getAllocations(tokens, totalValue) {
  const alloc = {};
  for (const t of tokens) {
    alloc[t.symbol] = (alloc[t.symbol] || 0) + (Number(t.value) || 0);
  }
  for (const k in alloc) alloc[k] = alloc[k] / totalValue;
  return alloc;
}

async function main() {
  const initialPortfolio = await getPortfolio();
  const snapshotTokens = initialPortfolio.tokens;
  const initialTotalValue = getTotalPortfolioValue(snapshotTokens);
  let cycleCount = 0;
  let lastRebalance = 0;
  let cumulativeProfit = 0;
  let lastTotalValue = initialTotalValue;

  while (true) {
    cycleCount++;
    let usdcSpent = 0;
    let usdcGained = 0;
    let coinsBought = [];
    let coinsSold = [];
    try {
      const portfolio = await getPortfolio();
      const tokens = portfolio.tokens;
      const totalValue = getTotalPortfolioValue(tokens);
      const usdcValue = flattenUSDC(tokens);
      updatePriceHistory(tokens);
      const alloc = getAllocations(tokens, totalValue);
      // --- SELL LOGIC: Take profit on strong momentum or overweight ---
      for (const t of tokens) {
        if (VOLATILE.includes(t.symbol) && t.amount > 0) {
          const price = await getTokenPrice(getTokenByAddress(t.token));
          if (!price) continue;
          const momentum = getMomentum(t.token);
          // Take profit if up >2% in window or allocation > max
          if ((momentum > 0.02 || alloc[t.symbol] > MAX_POSITION) && t.value > MIN_TRADE_USD) {
            const usdcToken = getUsdcTokenForChain(t.chain);
            if (await canTrade(getTokenByAddress(t.token), usdcToken, t.amount)) {
              await executeTrade(
                t.token,
                usdcToken.address,
                t.amount,
                momentum > 0.02 ? "Momentum profit taking" : "Rebalance overweight",
                getTokenByAddress(t.token),
                usdcToken
              );
              usdcGained += t.amount * price;
              coinsSold.push(`${t.symbol} (${formatNum(t.amount)})`);
            }
          }
        }
      }
      // --- BUY LOGIC: Buy dips or underweight, mean reversion ---
      for (const sym of VOLATILE) {
        const t = tokens.find(x => x.symbol === sym);
        if (!t) continue;
        const price = await getTokenPrice(getTokenByAddress(t.token));
        if (!price) continue;
        const momentum = getMomentum(t.token);
        // Buy if down >2% in window or allocation < half max
        if ((momentum < -0.02 || alloc[sym] < MAX_POSITION / 2) && usdcValue > MIN_TRADE_USD * 2) {
          const usdcToken = getUsdcTokenForChain(t.chain);
          const buyUSD = Math.min(usdcValue * 0.15, MIN_TRADE_USD * 5, (MAX_POSITION - (alloc[sym] || 0)) * totalValue);
          if (buyUSD > MIN_TRADE_USD) {
            const buyAmount = buyUSD / price;
            if (await canTrade(usdcToken, getTokenByAddress(t.token), buyAmount)) {
              await executeTrade(
                usdcToken.address,
                t.token,
                buyAmount,
                momentum < -0.02 ? "Mean reversion buy" : "Rebalance underweight",
                usdcToken,
                getTokenByAddress(t.token)
              );
              usdcSpent += buyUSD;
              coinsBought.push(`${sym} (${formatNum(buyAmount)})`);
            }
          }
        }
      }
      // --- REBALANCE LOGIC: Every hour, rebalance to target allocation ---
      if (cycleCount - lastRebalance >= REBALANCE_INTERVAL) {
        lastRebalance = cycleCount;
        const targets = { USDC: 0.5, SOL: 0.25, WETH: 0.25 };
        for (const sym of Object.keys(targets)) {
          const curAlloc = alloc[sym] || 0;
          const target = targets[sym];
          if (curAlloc > target + 0.1 && sym !== "USDC") {
            const t = tokens.find(x => x.symbol === sym);
            if (t && t.value > MIN_TRADE_USD) {
              const price = await getTokenPrice(getTokenByAddress(t.token));
              if (!price) continue;
              const usdcToken = getUsdcTokenForChain(t.chain);
              if (await canTrade(getTokenByAddress(t.token), usdcToken, t.amount * 0.5)) {
                await executeTrade(
                  t.token,
                  usdcToken.address,
                  t.amount * 0.5,
                  "Rebalance excess",
                  getTokenByAddress(t.token),
                  usdcToken
                );
                usdcGained += t.amount * 0.5 * price;
                coinsSold.push(`${sym} (rebalance)`);
              }
            }
          } else if (curAlloc < target - 0.1 && sym !== "USDC" && usdcValue > MIN_TRADE_USD * 2) {
            const t = tokens.find(x => x.symbol === sym);
            if (t) {
              const price = await getTokenPrice(getTokenByAddress(t.token));
              if (!price) continue;
              const usdcToken = getUsdcTokenForChain(t.chain);
              const buyUSD = Math.min((target - curAlloc) * totalValue, usdcValue * 0.2);
              if (buyUSD > MIN_TRADE_USD) {
                const buyAmount = buyUSD / price;
                if (await canTrade(usdcToken, getTokenByAddress(t.token), buyAmount)) {
                  await executeTrade(
                    usdcToken.address,
                    t.token,
                    buyAmount,
                    "Rebalance deficit",
                    usdcToken,
                    getTokenByAddress(t.token)
                  );
                  usdcSpent += buyUSD;
                  coinsBought.push(`${sym} (rebalance)`);
                }
              }
            }
          }
        }
      }
      // --- PROFIT TRACKING ---
      const profit = totalValue - lastTotalValue;
      cumulativeProfit += profit;
      lastTotalValue = totalValue;
      // --- LOGGING ---
      console.log(`\nCycle ${cycleCount} | ${new Date().toLocaleTimeString()}`);
      console.log(`Portfolio Value: $${formatNum(totalValue)}`);
      console.log(`USDC: $${formatNum(usdcValue)}`);
      console.log(`Coins Bought: ${coinsBought.length ? coinsBought.join(', ') : 'None'}`);
      console.log(`Coins Sold: ${coinsSold.length ? coinsSold.join(', ') : 'None'}`);
      console.log(`USDC Spent: $${formatNum(usdcSpent)} | USDC Gained: $${formatNum(usdcGained)}`);
      console.log(`Cycle Profit: $${formatNum(profit)} | Cumulative Profit: $${formatNum(cumulativeProfit)}`);
    } catch (error) {
      console.error(`[ERROR] Cycle ${cycleCount}: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 