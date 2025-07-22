import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const GAIA_API_KEY = process.env.GAIA_API_KEY || "gaia-NzVjMDA0YmMtYjhkMi00NmRjLTg0ZTYtZTAzNGU0NjkwYzI5-9Qpnx3GHuvvNx-Uo";
const RECALL_API_KEY = process.env.RECALL_SANDBOX_API_KEY;
const BASE_URL = "https://api.sandbox.competitions.recall.network/api";

// Token addresses for Gaia agent (focusing on major tokens)
const TOKENS = {
  USDC_ETH: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  WETH: {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "WETH",
    chain: "evm",
    decimals: 18
  },
  WBTC: {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "WBTC",
    chain: "evm",
    decimals: 8
  },
  ARBITRUM: {
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    symbol: "ARB",
    chain: "evm",
    decimals: 18
  },
  OPTIMISM: {
    address: "0x4200000000000000000000000000000000000042",
    symbol: "OP",
    chain: "evm",
    decimals: 18
  }
};

// Gaia agent configuration
const TREND_TOKENS = ["WETH", "WBTC", "ARB", "OP"];
const USDC_SYMBOLS = ["USDC"];
const POLL_INTERVAL = 60 * 1000;
const MAX_POSITION = 0.3; // 30% max in any one token
const MIN_TRADE_USD = 50;
const MIN_TRADE_AMOUNTS = {
  USDC: 10,
  WETH: 0.01,
  WBTC: 0.001,
  ARB: 1,
  OP: 1
};
const TREND_THRESHOLD = 0.02; // 2% trend threshold
const MOMENTUM_WINDOW = 5;
const REBALANCE_INTERVAL = 60;

if (!RECALL_API_KEY) {
  console.error("Missing RECALL_SANDBOX_API_KEY in .env");
  process.exit(1);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${RECALL_API_KEY}`,
  },
  timeout: 20000,
});

// Gaia API client for trend analysis
const gaiaClient = axios.create({
  baseURL: "https://qwen72b.gaia.domains/v1",
  headers: {
    "Authorization": `Bearer ${GAIA_API_KEY}`,
    "Content-Type": "application/json"
  },
  timeout: 30000,
});

async function getPortfolio() {
  const res = await api.get("/agent/portfolio");
  return res.data;
}

async function getTokenPrice(tokenObj) {
  try {
    const params = {
      token: tokenObj.address
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

async function analyzeTrendWithGaia(symbol) {
  try {
    const prompt = `Analyze the current market trend for ${symbol} (${symbol.toLowerCase()}) cryptocurrency. 
    Consider price action, volume, and market sentiment over the last 7 days.
    Return a JSON response with:
    {
      "symbol": "${symbol}",
      "trend": "bullish|bearish|neutral",
      "confidence": 0-100,
      "action": "BUY|SELL|HOLD",
      "reason": "brief explanation",
      "price_change_7d": "percentage change"
    }`;

    const response = await gaiaClient.post('/chat/completions', {
      model: 'qwen2.5-72b-instruct',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const content = response.data.choices[0].message.content;
    try {
      return JSON.parse(content);
    } catch (e) {
      console.warn(`[GAIA WARNING] Could not parse trend analysis for ${symbol}:`, content);
      return {
        symbol: symbol,
        trend: "neutral",
        confidence: 50,
        action: "HOLD",
        reason: "No trend data available",
        price_change_7d: "0%"
      };
    }
  } catch (error) {
    console.warn(`[GAIA ERROR] Could not get trend analysis for ${symbol}:`, error.message);
    return {
      symbol: symbol,
      trend: "neutral",
      confidence: 50,
      action: "HOLD",
      reason: "API error",
      price_change_7d: "0%"
    };
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
  return TOKENS.USDC_ETH; // Always use Ethereum USDC
}

async function executeTrade(fromTokenAddr, toTokenAddr, amount, reason, fromTokenObj, toTokenObj) {
  const amountNum = parseFloat(amount);
  if (amountNum < MIN_TRADE_AMOUNTS[fromTokenObj.symbol]) {
    console.warn(`[TRADE SKIP] Amount too small: ${amount} ${fromTokenObj.symbol} (min: ${MIN_TRADE_AMOUNTS[fromTokenObj.symbol]})`);
    return { success: false, error: 'Amount too small' };
  }

  const tradeData = {
    fromToken: fromTokenAddr,
    toToken: toTokenAddr,
    amount: amount.toString(),
    reason,
    slippageTolerance: "0.5"
  };

  console.log(`[TRADE ATTEMPT] ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`, tradeData);
  try {
    const res = await api.post("/trade/execute", tradeData);
    if (res.data && res.data.success) {
      console.log(`✅ [TRADE SUCCESS] ${fromTokenObj.symbol} -> ${toTokenObj.symbol}:`, {
        fromAmount: res.data.transaction?.fromAmount,
        toAmount: res.data.transaction?.toAmount,
        tradeValue: res.data.transaction?.tradeAmountUsd,
        transactionId: res.data.transaction?.id
      });
    } else {
      console.error(`❌ [TRADE FAILED] ${fromTokenObj.symbol} -> ${toTokenObj.symbol}:`, res.data?.error || 'Unknown error');
    }
    return res.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ [TRADE ERROR] ${fromTokenObj.symbol} -> ${toTokenObj.symbol} Status: ${error.response.status}`);
      console.error(`❌ [TRADE ERROR] Data:`, error.response.data);
    } else {
      console.error(`❌ [TRADE ERROR] ${fromTokenObj.symbol} -> ${toTokenObj.symbol}:`, error.message);
    }
    throw error;
  }
}

async function canTrade(fromTokenObj, toTokenObj, amount) {
  try {
    const fromPrice = await getTokenPrice(fromTokenObj);
    const toPrice = await getTokenPrice(toTokenObj);
    if (!fromPrice || !toPrice) {
      console.warn(`[TRADE SKIP] No price for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`);
      return false;
    }
    
    const params = {
      fromToken: fromTokenObj.address,
      toToken: toTokenObj.address,
      amount: amount.toString()
    };

    const res = await api.get('/trade/quote', { params });
    if (res.data && res.data.fromAmount > 0 && res.data.toAmount > 0) {
      return true;
    } else {
      console.warn(`[TRADE SKIP] No quote for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`);
      return false;
    }
  } catch (error) {
    console.warn(`[TRADE SKIP] Quote error for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}: ${error.message}`);
    return false;
  }
}

function formatNum(n) {
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  console.log("🚀 Starting Gaia Trend Following Agent...");
  console.log(`📊 Monitoring tokens: ${TREND_TOKENS.join(', ')}`);
  console.log(`🎯 Trend threshold: ${TREND_THRESHOLD * 100}%`);
  console.log(`⏰ Poll interval: ${POLL_INTERVAL / 1000}s`);
  
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

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🌍 GAIA CYCLE ${cycleCount} | ${new Date().toLocaleString()}`);
      console.log(`${'='.repeat(80)}`);

      // Get Gaia trend analysis for all monitored tokens
      console.log(`\n🔮 GAIA TREND ANALYSIS:`);
      const trendAnalysis = {};
      for (const symbol of TREND_TOKENS) {
        const analysis = await analyzeTrendWithGaia(symbol);
        trendAnalysis[symbol] = analysis;
        console.log(`   ${symbol}: ${analysis.trend.toUpperCase()} (${analysis.confidence}% confidence) - ${analysis.action}`);
        console.log(`   Reason: ${analysis.reason}`);
      }

      // Execute trades based on Gaia analysis
      console.log(`\n💹 EXECUTING TRADES BASED ON GAIA ANALYSIS:`);
      
      for (const symbol of TREND_TOKENS) {
        const analysis = trendAnalysis[symbol];
        const tokenObj = Object.values(TOKENS).find(t => t.symbol === symbol);
        if (!tokenObj) continue;

        const price = await getTokenPrice(tokenObj);
        if (!price) continue;

        const currentAllocation = alloc[symbol] || 0;
        const usdcToken = getUsdcTokenForChain(tokenObj.chain);

        if (analysis.action === "BUY" && analysis.confidence > 70) {
          // Gaia suggests BUY with high confidence
          const maxBuyUSD = Math.min((MAX_POSITION - currentAllocation) * totalValue, usdcValue * 0.4);
          const buyUSD = Math.max(MIN_TRADE_USD, Math.min(maxBuyUSD, usdcValue * 0.2));
          
          if (buyUSD >= MIN_TRADE_USD) {
            const buyAmount = buyUSD / price;
            if (buyAmount >= MIN_TRADE_AMOUNTS[symbol] && await canTrade(usdcToken, tokenObj, buyUSD)) {
              console.log(`✅ [GAIA BUY] ${symbol}: ${buyUSD} USDC → ${buyAmount} ${symbol}`);
              await executeTrade(
                usdcToken.address,
                tokenObj.address,
                buyUSD,
                `Gaia trend analysis: ${analysis.reason}`,
                usdcToken,
                tokenObj
              );
              usdcSpent += buyUSD;
              coinsBought.push(`${symbol} (${formatNum(buyAmount)})`);
            }
          }
        } else if (analysis.action === "SELL" && analysis.confidence > 70) {
          // Gaia suggests SELL with high confidence
          const t = tokens.find(x => x.symbol === symbol);
          if (t && t.value > MIN_TRADE_USD && t.amount >= MIN_TRADE_AMOUNTS[symbol]) {
            if (await canTrade(tokenObj, usdcToken, t.amount)) {
              console.log(`✅ [GAIA SELL] ${symbol}: ${t.amount} ${symbol} → ${t.value} USDC`);
              await executeTrade(
                tokenObj.address,
                usdcToken.address,
                t.amount,
                `Gaia trend analysis: ${analysis.reason}`,
                tokenObj,
                usdcToken
              );
              usdcGained += t.amount * price;
              coinsSold.push(`${symbol} (${formatNum(t.amount)})`);
            }
          }
        }
      }

      // Rebalance logic every hour
      if (cycleCount - lastRebalance >= REBALANCE_INTERVAL) {
        lastRebalance = cycleCount;
        console.log(`\n⚖️ REBALANCING PORTFOLIO:`);
        
        const targets = { USDC: 0.4, WETH: 0.2, WBTC: 0.2, ARB: 0.1, OP: 0.1 };
        for (const sym of Object.keys(targets)) {
          const curAlloc = alloc[sym] || 0;
          const target = targets[sym];
          const tokenObj = Object.values(TOKENS).find(t => t.symbol === sym);
          
          if (!tokenObj) continue;
          
          if (curAlloc > target + 0.1 && sym !== "USDC") {
            const t = tokens.find(x => x.symbol === sym);
            if (t && t.value > MIN_TRADE_USD && t.amount * 0.5 >= MIN_TRADE_AMOUNTS[sym]) {
              const price = await getTokenPrice(tokenObj);
              if (!price) continue;
              const usdcToken = getUsdcTokenForChain(tokenObj.chain);
              if (await canTrade(tokenObj, usdcToken, t.amount * 0.5)) {
                console.log(`✅ [REBALANCE SELL] ${sym}: ${t.amount * 0.5} ${sym} → ${t.amount * 0.5 * price} USDC`);
                await executeTrade(
                  tokenObj.address,
                  usdcToken.address,
                  t.amount * 0.5,
                  "Portfolio rebalancing",
                  tokenObj,
                  usdcToken
                );
                usdcGained += t.amount * 0.5 * price;
                coinsSold.push(`${sym} (rebalance)`);
              }
            }
          } else if (curAlloc < target - 0.1 && sym !== "USDC" && usdcValue > MIN_TRADE_USD * 2) {
            const t = tokens.find(x => x.symbol === sym);
            if (t) {
              const price = await getTokenPrice(tokenObj);
              if (!price) continue;
              const usdcToken = getUsdcTokenForChain(tokenObj.chain);
              const buyUSD = Math.min((target - curAlloc) * totalValue, usdcValue * 0.2);
              if (buyUSD > MIN_TRADE_USD) {
                const buyAmount = buyUSD / price;
                if (buyAmount >= MIN_TRADE_AMOUNTS[sym] && await canTrade(usdcToken, tokenObj, buyUSD)) {
                  console.log(`✅ [REBALANCE BUY] ${sym}: ${buyUSD} USDC → ${buyAmount} ${sym}`);
                  await executeTrade(
                    usdcToken.address,
                    tokenObj.address,
                    buyUSD,
                    "Portfolio rebalancing",
                    usdcToken,
                    tokenObj
                  );
                  usdcSpent += buyUSD;
                  coinsBought.push(`${sym} (rebalance)`);
                }
              }
            }
          }
        }
      }

      // Profit tracking and reporting
      const profit = totalValue - lastTotalValue;
      cumulativeProfit += profit;
      lastTotalValue = totalValue;

      // Comprehensive portfolio reporting
      console.log(`\n💰 PORTFOLIO SUMMARY:`);
      console.log(`   Total Value: $${formatNum(totalValue)}`);
      console.log(`   USDC Holdings: $${formatNum(usdcValue)}`);
      console.log(`   Cycle Profit: $${formatNum(profit)}`);
      console.log(`   Cumulative Profit: $${formatNum(cumulativeProfit)}`);
      console.log(`   Profit %: ${((profit / lastTotalValue) * 100).toFixed(2)}%`);

      // Current holdings
      console.log(`\n📈 CURRENT HOLDINGS:`);
      const holdings = {};
      for (const t of tokens) {
        if (!holdings[t.symbol]) {
          holdings[t.symbol] = { amount: 0, value: 0, price: 0 };
        }
        holdings[t.symbol].amount += Number(t.amount) || 0;
        holdings[t.symbol].value += Number(t.value) || 0;
        holdings[t.symbol].price = Number(t.price) || 0;
      }

      for (const [symbol, data] of Object.entries(holdings)) {
        if (data.value > 0) {
          const allocation = ((data.value / totalValue) * 100).toFixed(2);
          console.log(`   ${symbol}: ${formatNum(data.amount)} @ $${formatNum(data.price)} = $${formatNum(data.value)} (${allocation}%)`);
        }
      }

      // Trading activity
      console.log(`\n🔄 TRADING ACTIVITY:`);
      console.log(`   Coins Bought: ${coinsBought.length ? coinsBought.join(', ') : 'None'}`);
      console.log(`   Coins Sold: ${coinsSold.length ? coinsSold.join(', ') : 'None'}`);
      console.log(`   USDC Spent: $${formatNum(usdcSpent)}`);
      console.log(`   USDC Gained: $${formatNum(usdcGained)}`);
      console.log(`   Net USDC Flow: $${formatNum(usdcGained - usdcSpent)}`);

      // Performance metrics
      console.log(`\n📊 PERFORMANCE METRICS:`);
      const totalReturn = ((totalValue - initialTotalValue) / initialTotalValue * 100).toFixed(2);
      console.log(`   Total Return: ${totalReturn}%`);
      console.log(`   Average Return per Cycle: ${(totalReturn / cycleCount).toFixed(2)}%`);
      console.log(`   Best Single Cycle: $${formatNum(Math.max(profit, 0))}`);
      console.log(`   Worst Single Cycle: $${formatNum(Math.min(profit, 0))}`);

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🌍 LEAVING GAIA PORTFOLIO FOR CYCLE ${cycleCount + 1}`);
      console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
      console.error(`[ERROR] Cycle ${cycleCount}: ${error.message}`);
      console.error(`[ERROR] Stack trace:`, error.stack);
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 