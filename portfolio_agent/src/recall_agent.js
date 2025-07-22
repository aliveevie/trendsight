import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const API_KEY = process.env.RECALL_SANDBOX_API_KEY;
const BASE_URL = "https://api.sandbox.competitions.recall.network/api";

// Token addresses and symbols from snapshot
const TOKENS = {
  USDC_ETH: {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  USDC_POLYGON: {
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
  USDC_ARB: {
    address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    symbol: "USDC",
    chain: "evm",
    decimals: 6
  },
  USDC_OPTIMISM: {
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
  USDC_SOL: {
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
  },
  // Native chain tokens for multi-chain trading
  ARB: {
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    symbol: "ARB",
    chain: "evm",
    decimals: 18,
    chainSpecific: "arbitrum"
  },
  OP: {
    address: "0x4200000000000000000000000000000000000042",
    symbol: "OP",
    chain: "evm",
    decimals: 18,
    chainSpecific: "optimism"
  },
  MATIC: {
    address: "0x0000000000000000000000000000000000001010",
    symbol: "MATIC",
    chain: "evm",
    decimals: 18,
    chainSpecific: "polygon"
  },
  // Additional high-volume tokens for more trading opportunities
  LINK: {
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    symbol: "LINK",
    chain: "evm",
    decimals: 18
  },
  UNI: {
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    symbol: "UNI",
    chain: "evm",
    decimals: 18
  }
};

const USDC_SYMBOLS = ["USDC", "USDbC"];
const VOLATILE = ["SOL", "WETH", "ARB", "OP", "MATIC", "LINK", "UNI"]; // Expanded for multi-chain trading
const POLL_INTERVAL = 60 * 1000;
const MAX_POSITION = 0.25; // Reduced to 25% max for better diversification across more tokens
const MIN_TRADE_USD = 50; // Minimum USD value for trades
const MIN_TRADE_AMOUNTS = {
  USDC: 10,     // 10 USDC minimum
  USDbC: 10,    // 10 USDbC minimum  
  SOL: 0.1,     // 0.1 SOL minimum  
  WETH: 0.01,   // 0.01 WETH minimum
  ARB: 0.5,     // 0.5 ARB minimum (reduced for easier trading)
  OP: 0.5,      // 0.5 OP minimum (reduced for easier trading)
  MATIC: 5,     // 5 MATIC minimum (reduced from 10)
  LINK: 0.3,    // 0.3 LINK minimum (reduced from 0.5)
  UNI: 0.5      // 0.5 UNI minimum (reduced from 1)
};
const MOMENTUM_WINDOW = 5; // 5 cycles (minutes)
const REBALANCE_INTERVAL = 30; // Reduced to 30 cycles for more active rebalancing

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
      token: tokenObj.address
    };

    // Only add chain specifications for Solana tokens
    if (tokenObj.chain === 'svm') {
      params.chain = "svm";
      params.specificChain = "mainnet";
    }

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
  // Return the appropriate USDC token for the given chain
  if (chain === 'evm') {
    return TOKENS.USDC_ETH; // Use Ethereum USDC for EVM chains
  } else if (chain === 'svm') {
    return TOKENS.USDC_SOL; // Use Solana USDC for SVM chains
  }
  // Fallback to Ethereum USDC
  return TOKENS.USDC_ETH;
}



async function executeTrade(fromTokenAddr, toTokenAddr, amount, reason, fromTokenObj, toTokenObj) {
  // Validate minimum trade amount - check against the target token being bought/sold
  const amountNum = parseFloat(amount);
  
  // For selling: check against fromToken minimum (we're selling this token)
  // For buying: check against toToken minimum (we're buying this token) 
  const relevantToken = USDC_SYMBOLS.includes(fromTokenObj.symbol) ? toTokenObj : fromTokenObj;
  const minAmount = MIN_TRADE_AMOUNTS[relevantToken.symbol];
  
  if (minAmount && amountNum < minAmount) {
    console.warn(`[TRADE SKIP] Amount too small: ${amount} ${relevantToken.symbol} (min: ${minAmount})`);
    return { success: false, error: 'Amount too small' };
  }

  // Build trade data based on token chains
  const tradeData = {
    fromToken: fromTokenAddr,
    toToken: toTokenAddr,
    amount: amount.toString(),
    reason,
    slippageTolerance: "0.5"
  };

  // Only add chain specifications for Solana tokens
  if (fromTokenObj.chain === 'svm') {
    tradeData.fromChain = "svm";
    tradeData.fromSpecificChain = "mainnet";
  }
  if (toTokenObj.chain === 'svm') {
    tradeData.toChain = "svm";
    tradeData.toSpecificChain = "mainnet";
  }

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
    // Check price for both tokens
    const fromPrice = await getTokenPrice(fromTokenObj);
    const toPrice = await getTokenPrice(toTokenObj);
    if (!fromPrice || !toPrice) {
      console.warn(`[TRADE SKIP] No price for pair: ${fromTokenObj.symbol} -> ${toTokenObj.symbol}`);
      return false;
    }
    
    // Check trade quote
    const params = {
      fromToken: fromTokenObj.address,
      toToken: toTokenObj.address,
      amount: amount.toString()
    };

    // Only add chain specifications for Solana tokens
    if (fromTokenObj.chain === 'svm') {
      params.fromChain = "svm";
      params.fromSpecificChain = "mainnet";
    }
    if (toTokenObj.chain === 'svm') {
      params.toChain = "svm";
      params.toSpecificChain = "mainnet";
    }

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
      // --- AGGRESSIVE SELL LOGIC: Rapid profit taking and position management ---
      for (const t of tokens) {
        if (VOLATILE.includes(t.symbol) && t.amount > 0) {
          const price = await getTokenPrice(getTokenByAddress(t.token));
          if (!price) continue;
          const momentum = getMomentum(t.token);
          const currentAlloc = alloc[t.symbol] || 0;
          
          // Ultra-aggressive sell conditions for 24hr profit maximization
          const shouldSell = (
            momentum > 0.01 ||  // Take profit on even smaller gains (1% instead of 1.5%)
            currentAlloc > MAX_POSITION * 0.8 ||  // Sell if over 80% of max position
            (momentum < -0.003 && currentAlloc > MAX_POSITION * 0.3)  // Cut losses very fast
          );
          
          if (shouldSell && t.value > MIN_TRADE_USD && t.amount >= MIN_TRADE_AMOUNTS[t.symbol]) {
            const usdcToken = getUsdcTokenForChain(t.chain);
            
            // Determine sell amount based on conditions - ultra-aggressive for 24hr
            let sellAmount = t.amount;
            if (momentum > 0.01 && currentAlloc < MAX_POSITION) {
              sellAmount = t.amount * 0.7; // More aggressive partial profit taking
            } else if (momentum < -0.003) {
              sellAmount = t.amount * 0.9; // Very aggressive loss cutting
            }
            
            console.log(`[AGGRESSIVE SELL] ${t.symbol}: momentum=${momentum.toFixed(4)}, alloc=${currentAlloc.toFixed(3)}, selling=${sellAmount.toFixed(4)}`);
            
            if (sellAmount >= MIN_TRADE_AMOUNTS[t.symbol] && await canTrade(getTokenByAddress(t.token), usdcToken, sellAmount)) {
              const reason = momentum > 0.01 ? `Profit taking (${momentum.toFixed(3)})` : 
                           momentum < -0.003 ? `Loss cutting (${momentum.toFixed(3)})` : 
                           "Position rebalance";
              
              await executeTrade(
                t.token,
                usdcToken.address,
                sellAmount,
                reason,
                getTokenByAddress(t.token),
                usdcToken
              );
              usdcGained += sellAmount * price;
              coinsSold.push(`${t.symbol} (${formatNum(sellAmount)})`);
            } else {
              console.log(`[SKIP] ${t.symbol} sell validation failed: amount=${sellAmount}, min=${MIN_TRADE_AMOUNTS[t.symbol]}`);
            }
          } else {
            console.log(`[SKIP] ${t.symbol} no sell signal: momentum=${momentum.toFixed(4)}, alloc=${currentAlloc.toFixed(3)}, value=${t.value.toFixed(2)}`);
          }
        }
      }
      // --- AGGRESSIVE BUY LOGIC: Multi-token momentum and opportunity trading ---
      for (const sym of VOLATILE) {
        // Get token definition from TOKENS object, not just portfolio
        const tokenObj = Object.values(TOKENS).find(token => token.symbol === sym);
        if (!tokenObj) {
          console.log(`[ERROR] Token definition not found for ${sym}`);
          continue;
        }
        
        // Check if token exists in current portfolio
        const t = tokens.find(x => x.symbol === sym);
        const price = await getTokenPrice(tokenObj);
        if (!price) {
          console.log(`[SKIP] ${sym} no price available`);
          continue;
        }
        
        const momentum = getMomentum(tokenObj.address);
        const currentAlloc = alloc[sym] || 0;
        
        // Ultra-aggressive buying conditions for 24hr profit maximization
        const shouldBuy = (
          momentum < -0.005 ||  // Buy on very small dips (0.5%)
          currentAlloc < MAX_POSITION * 0.9 ||  // Buy if under 90% of max position
          (momentum > 0.005 && currentAlloc < MAX_POSITION * 0.7)  // Buy on small momentum if under 70% allocation
        );
        
        if (shouldBuy && usdcValue > MIN_TRADE_USD) {
          const usdcToken = getUsdcTokenForChain(tokenObj.chain);
          // More aggressive position sizing
          let buyUSD = Math.min(
            usdcValue * 0.4,  // Use up to 40% of USDC per trade
            (MAX_POSITION - currentAlloc) * totalValue,
            MIN_TRADE_USD * 5  // Larger max trade size
          );
          
          // Special aggressive logic for high-momentum tokens
          if (momentum > 0.005) {
            buyUSD = Math.min(buyUSD * 1.5, usdcValue * 0.6); // Extra aggressive on positive momentum
            console.log(`[MOMENTUM BUY] ${sym}: Positive momentum ${momentum.toFixed(4)}, increasing buy size`);
          }
          
          if (buyUSD >= MIN_TRADE_USD) {
            const buyAmount = buyUSD / price;
            console.log(`[AGGRESSIVE BUY] ${sym}: momentum=${momentum.toFixed(4)}, alloc=${currentAlloc.toFixed(3)}, buyUSD=${buyUSD.toFixed(2)}`);
            
            if (buyAmount >= MIN_TRADE_AMOUNTS[sym] && await canTrade(usdcToken, tokenObj, buyAmount)) {
              const reason = momentum < -0.005 ? `Dip buy (${momentum.toFixed(3)})` : 
                           momentum > 0.005 ? `Momentum follow (${momentum.toFixed(3)})` : 
                           "Position building";
              
              await executeTrade(
                usdcToken.address,
                tokenObj.address,
                buyAmount,
                reason,
                usdcToken,
                tokenObj
              );
              usdcSpent += buyUSD;
              coinsBought.push(`${sym} (${formatNum(buyAmount)})`);
            } else {
              console.log(`[SKIP] ${sym} trade validation failed: amount=${buyAmount}, min=${MIN_TRADE_AMOUNTS[sym]}`);
            }
          }
        } else {
          console.log(`[SKIP] ${sym} no buy signal: momentum=${momentum.toFixed(4)}, alloc=${currentAlloc.toFixed(3)}, usdcValue=${usdcValue.toFixed(2)}`);
        }
      }
      // --- AGGRESSIVE REBALANCE LOGIC: Multi-token diversification for profit maximization ---
      if (cycleCount - lastRebalance >= REBALANCE_INTERVAL) {
        lastRebalance = cycleCount;
        console.log(`\n⚖️ AGGRESSIVE REBALANCING PORTFOLIO (Cycle ${cycleCount}):`);
        
        // Aggressive multi-token allocation for 24hr profit maximization
        const targets = { 
          USDC: 0.30,   // Reduced USDC for more active trading
          WETH: 0.20,   // ETH exposure
          SOL: 0.20,    // Solana exposure
          ARB: 0.10,    // Arbitrum native
          OP: 0.10,     // Optimism native
          MATIC: 0.05,  // Polygon native
          LINK: 0.03,   // DeFi blue chip
          UNI: 0.02     // DEX token
        };
        for (const sym of Object.keys(targets)) {
          const curAlloc = alloc[sym] || 0;
          const target = targets[sym];
          if (curAlloc > target + 0.1 && sym !== "USDC") {
            const t = tokens.find(x => x.symbol === sym);
            if (t && t.value > MIN_TRADE_USD && t.amount * 0.5 >= MIN_TRADE_AMOUNTS[sym]) {
              const price = await getTokenPrice(getTokenByAddress(t.token));
              if (!price) continue;
              const usdcToken = getUsdcTokenForChain(t.chain);
              console.log(`[DEBUG] ${sym} rebalance sell: amount=${t.amount * 0.5}, min=${MIN_TRADE_AMOUNTS[sym]}, curAlloc=${curAlloc}, target=${target}`);
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
              } else {
                console.log(`[SKIP] ${sym} rebalance sell canTrade check failed`);
              }
            } else {
              console.log(`[SKIP] ${sym} rebalance sell conditions not met: value=${t?.value}, amount=${t?.amount * 0.5}, min=${MIN_TRADE_AMOUNTS[sym]}`);
            }
          } else if (curAlloc < target - 0.1 && sym !== "USDC" && usdcValue > MIN_TRADE_USD * 2) {
            // Get token definition from TOKENS object for rebalancing
            const tokenObj = Object.values(TOKENS).find(token => token.symbol === sym);
            if (tokenObj) {
              const price = await getTokenPrice(tokenObj);
              if (!price) {
                console.log(`[SKIP] ${sym} rebalance buy: no price available`);
                continue;
              }
              const usdcToken = getUsdcTokenForChain(tokenObj.chain);
              const buyUSD = Math.min((target - curAlloc) * totalValue, usdcValue * 0.3);
              if (buyUSD >= MIN_TRADE_USD) {
                const buyAmount = buyUSD / price;
                console.log(`[REBALANCE BUY] ${sym}: USD=${buyUSD.toFixed(2)}, amount=${buyAmount.toFixed(4)}, curAlloc=${(curAlloc * 100).toFixed(1)}%, target=${(target * 100).toFixed(1)}%`);
                // Ensure minimum amount in token units
                if (buyAmount >= MIN_TRADE_AMOUNTS[sym] && await canTrade(usdcToken, tokenObj, buyAmount)) {
                  await executeTrade(
                    usdcToken.address,
                    tokenObj.address,
                    buyAmount,
                    `Rebalance to ${(target * 100).toFixed(1)}%`,
                    usdcToken,
                    tokenObj
                  );
                  usdcSpent += buyUSD;
                  coinsBought.push(`${sym} (rebalance)`);
                } else {
                  if (buyAmount < MIN_TRADE_AMOUNTS[sym]) {
                    console.log(`[SKIP] ${sym} rebalance buy amount too small: ${buyAmount.toFixed(4)} < ${MIN_TRADE_AMOUNTS[sym]}`);
                  } else {
                    console.log(`[SKIP] ${sym} rebalance buy canTrade check failed`);
                  }
                }
              } else {
                console.log(`[SKIP] ${sym} rebalance buy USD too small: ${buyUSD.toFixed(2)} < ${MIN_TRADE_USD}`);
              }
            } else {
              console.log(`[ERROR] ${sym} token definition not found for rebalancing`);
            }
          } else {
            console.log(`[SKIP] ${sym} rebalance conditions not met: curAlloc=${curAlloc}, target=${target}, usdcValue=${usdcValue}`);
          }
        }
      }
      // --- PROFIT TRACKING ---
      const profit = totalValue - lastTotalValue;
      cumulativeProfit += profit;
      lastTotalValue = totalValue;
      // --- COMPREHENSIVE LOGGING ---
      console.log(`\n🚀 AGGRESSIVE MULTI-CHAIN CYCLE ${cycleCount} | ${new Date().toLocaleString()}`);
      console.log(`💰 Portfolio Value: $${formatNum(totalValue)} | USDC Available: $${formatNum(usdcValue)}`);
      
      // Show current allocations across all tokens
      console.log(`📊 Current Allocations:`);
      for (const sym of VOLATILE) {
        const allocation = alloc[sym] || 0;
        const tokenData = tokens.find(t => t.symbol === sym);
        const value = (allocation * totalValue) || 0;
        const amount = tokenData?.amount || 0;
        
        // Show all VOLATILE tokens to track diversification progress
        console.log(`   ${sym}: ${(allocation * 100).toFixed(1)}% ($${formatNum(value)}) [${amount > 0 ? formatNum(amount) : '0'} tokens]`);
      }
      
      console.log(`🔄 Trading Activity:`);
      console.log(`   Bought: ${coinsBought.length ? coinsBought.join(', ') : 'None'}`);
      console.log(`   Sold: ${coinsSold.length ? coinsSold.join(', ') : 'None'}`);
      console.log(`   Capital Flow: -$${formatNum(usdcSpent)} spent | +$${formatNum(usdcGained)} gained | Net: $${formatNum(usdcGained - usdcSpent)}`);
      
      console.log(`📈 Performance:`);
      console.log(`   Cycle Profit: $${formatNum(profit)} | Cumulative Profit: $${formatNum(cumulativeProfit)}`);
      console.log(`   Total Return: ${((totalValue / initialTotalValue - 1) * 100).toFixed(2)}%`);
      console.log(`   Profit Rate: $${formatNum(cumulativeProfit / cycleCount)} per cycle`);
    } catch (error) {
      console.error(`[ERROR] Cycle ${cycleCount}: ${error.message}`);
      console.error(`[ERROR] Stack trace:`, error.stack);
      // Continue to next cycle instead of crashing
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 