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
    decimals: 6,
    chainSpecific: "base"
  },
  // Base chain native token
  ETH_BASE: {
    address: "0x4200000000000000000000000000000000000006",
    symbol: "ETH_BASE",
    chain: "evm",
    decimals: 18,
    chainSpecific: "base"
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
  // Multi-chain native tokens for maximum opportunities
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
  // High-volume tokens for more opportunities
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
// ALL VOLATILE TOKENS for maximum 2X potential
const VOLATILE = ["SOL", "WETH", "ARB", "OP", "MATIC", "ETH_BASE", "LINK", "UNI"];
const POLL_INTERVAL = 60 * 1000;
const MAX_POSITION = 0.30; // Increased for more aggressive trading
const MIN_TRADE_USD = 50;
const MIN_TRADE_AMOUNTS = {
  USDC: 10,
  USDbC: 10,
  SOL: 0.1,
  WETH: 0.01,
  ARB: 0.5,
  OP: 0.5,
  MATIC: 5,
  ETH_BASE: 0.01,
  LINK: 0.5,
  UNI: 0.5
};
const MOMENTUM_WINDOW = 5;
const REBALANCE_INTERVAL = 20; // More frequent rebalancing

// Enhanced error tracking for unstoppable 24hr operation
const errorTracker = {
  priceErrors: {},
  tradeErrors: {},
  consecutiveErrors: 0,
  lastError: null,
  tokenAgeErrors: new Set() // Track tokens with age errors specifically
};

// Dynamic blacklist - tokens can recover
const temporaryBlacklist = new Map(); // token -> expiry timestamp

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
  timeout: 30000, // Increased timeout to 30 seconds
});

async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`⏳ Retry ${attempt}/${maxRetries} in ${delay}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

async function getPortfolio() {
  return await withRetry(async () => {
    const res = await api.get("/agent/portfolio");
    if (!res.data || !res.data.tokens) {
      throw new Error("Invalid portfolio response");
    }
    return res.data;
  });
}

async function getTokenPrice(tokenObj) {
  // Check temporary blacklist
  if (temporaryBlacklist.has(tokenObj.symbol)) {
    const expiry = temporaryBlacklist.get(tokenObj.symbol);
    if (Date.now() < expiry) {
      return null; // Still blacklisted
    } else {
      temporaryBlacklist.delete(tokenObj.symbol); // Expired, remove from blacklist
      console.log(`🔄 [RECOVERY] ${tokenObj.symbol} removed from temporary blacklist`);
    }
  }

  const cacheKey = `${tokenObj.symbol}_${tokenObj.address}`;
  
  return await withRetry(async () => {
    const params = {
      token: tokenObj.address
    };

    // Only add chain specifications for Solana tokens
    if (tokenObj.chain === 'svm') {
      params.chain = "svm";
      params.specificChain = "mainnet";
    }

    const res = await api.get('/price', { 
      params,
      timeout: 15000
    });
    
    if (res.data && res.data.success && typeof res.data.price === 'number') {
      // Reset error counter on success
      if (errorTracker.priceErrors[cacheKey]) {
        delete errorTracker.priceErrors[cacheKey];
      }
      return res.data.price;
    } else {
      throw new Error(`Invalid price response for ${tokenObj.symbol}`);
    }
  }, 3, 2000).catch(error => {
    // Track price errors but don't permanently blacklist
    errorTracker.priceErrors[cacheKey] = (errorTracker.priceErrors[cacheKey] || 0) + 1;
    
    // Temporary blacklist for 5 minutes after repeated errors
    if (errorTracker.priceErrors[cacheKey] >= 5) {
      const blacklistUntil = Date.now() + (5 * 60 * 1000); // 5 minutes
      temporaryBlacklist.set(tokenObj.symbol, blacklistUntil);
      console.warn(`⏰ [TEMP BLACKLIST] ${tokenObj.symbol} blacklisted for 5 minutes due to price errors`);
    }
    
    console.warn(`[PRICE FAILURE] ${tokenObj.symbol}: ${error.message}`);
    return null;
  });
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

function getUsdcTokenForChain(tokenObj) {
  // Return the appropriate USDC token based on the target token's chain
  if (tokenObj.chain === 'svm') {
    return TOKENS.USDC_SOL; // Solana USDC for SVM tokens
  }
  
  // For EVM tokens, use chain-specific USDC based on chainSpecific property
  if (tokenObj.chainSpecific) {
    switch (tokenObj.chainSpecific) {
      case 'arbitrum':
        return TOKENS.USDC_ARB; // Arbitrum USDC for ARB token
      case 'optimism':
        return TOKENS.USDC_OPTIMISM; // Optimism USDC for OP token
      case 'polygon':
        return TOKENS.USDC_POLYGON; // Polygon USDC for MATIC token
      case 'base':
        return TOKENS.USDbC; // Base USDC for ETH_BASE token
      default:
        return TOKENS.USDC_ETH; // Default to Ethereum USDC
    }
  }
  
  // For tokens without specific chain requirements, use Ethereum USDC
  return TOKENS.USDC_ETH;
}



async function executeTrade(fromTokenAddr, toTokenAddr, amount, reason, fromTokenObj, toTokenObj) {
  // Check temporary blacklist for both tokens
  const fromBlacklisted = temporaryBlacklist.has(fromTokenObj.symbol) && Date.now() < temporaryBlacklist.get(fromTokenObj.symbol);
  const toBlacklisted = temporaryBlacklist.has(toTokenObj.symbol) && Date.now() < temporaryBlacklist.get(toTokenObj.symbol);
  
  if (fromBlacklisted || toBlacklisted) {
    return { success: false, error: 'Token temporarily blacklisted' };
  }

  // Validate minimum trade amount
  const amountNum = parseFloat(amount);
  const relevantToken = USDC_SYMBOLS.includes(fromTokenObj.symbol) ? toTokenObj : fromTokenObj;
  const minAmount = MIN_TRADE_AMOUNTS[relevantToken.symbol];
  
  if (minAmount && amountNum < minAmount) {
    return { success: false, error: 'Amount too small' };
  }

  // Build trade data
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
  
  return await withRetry(async () => {
    const res = await api.post("/trade/execute", tradeData, {
      timeout: 25000
    });
    
    if (res.data && res.data.success) {
      console.log(`✅ [TRADE SUCCESS] ${fromTokenObj.symbol} -> ${toTokenObj.symbol}:`, {
        fromAmount: res.data.transaction?.fromAmount,
        toAmount: res.data.transaction?.toAmount,
        tradeValue: res.data.transaction?.tradeAmountUsd,
        transactionId: res.data.transaction?.id
      });
      
      // Reset error tracking on success
      errorTracker.consecutiveErrors = 0;
      return res.data;
    } else {
      throw new Error(res.data?.error || 'Trade failed');
    }
  }, 2, 3000).catch(error => {
    errorTracker.consecutiveErrors++;
    
    // Handle specific error types more gracefully
    if (error.response?.status === 400) {
      const errorMsg = error.response.data?.error || '';
      
      if (errorMsg.includes('minimum age')) {
        // Temporary blacklist for token age errors (30 minutes)
        const blacklistUntil = Date.now() + (30 * 60 * 1000);
        temporaryBlacklist.set(fromTokenObj.symbol, blacklistUntil);
        temporaryBlacklist.set(toTokenObj.symbol, blacklistUntil);
        errorTracker.tokenAgeErrors.add(`${fromTokenObj.symbol}-${toTokenObj.symbol}`);
        console.warn(`⏰ [TOKEN AGE] ${fromTokenObj.symbol}->${toTokenObj.symbol} blacklisted for 30min (age requirement)`);
        return { success: false, error: 'Token pair too new - temporarily blacklisted' };
      }
      
      if (errorMsg.includes('Insufficient balance')) {
        console.warn(`💰 [INSUFFICIENT] ${fromTokenObj.symbol}: ${errorMsg}`);
        return { success: false, error: 'Insufficient balance' };
      }
    }
    
    console.error(`❌ [TRADE FAILURE] ${fromTokenObj.symbol} -> ${toTokenObj.symbol}: ${error.message}`);
    return { success: false, error: error.message };
  });
}

async function canTrade(fromTokenObj, toTokenObj, amount) {
  // Check temporary blacklist
  const fromBlacklisted = temporaryBlacklist.has(fromTokenObj.symbol) && Date.now() < temporaryBlacklist.get(fromTokenObj.symbol);
  const toBlacklisted = temporaryBlacklist.has(toTokenObj.symbol) && Date.now() < temporaryBlacklist.get(toTokenObj.symbol);
  
  if (fromBlacklisted || toBlacklisted) {
    return false;
  }

  try {
    // Check prices first with timeout
    const [fromPrice, toPrice] = await Promise.allSettled([
      getTokenPrice(fromTokenObj),
      getTokenPrice(toTokenObj)
    ]);
    
    if (fromPrice.status === 'rejected' || toPrice.status === 'rejected' || 
        !fromPrice.value || !toPrice.value) {
      return false;
    }
    
    // Quick quote check with shorter timeout
    const params = {
      fromToken: fromTokenObj.address,
      toToken: toTokenObj.address,
      amount: amount.toString()
    };

    if (fromTokenObj.chain === 'svm') {
      params.fromChain = "svm";
      params.fromSpecificChain = "mainnet";
    }
    if (toTokenObj.chain === 'svm') {
      params.toChain = "svm";
      params.toSpecificChain = "mainnet";
    }

    const res = await api.get('/trade/quote', { 
      params,
      timeout: 10000
    });
    
    return res.data && res.data.fromAmount > 0 && res.data.toAmount > 0;
  } catch (error) {
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
  console.log(`\n🚀 ULTRA-AGGRESSIVE 24-HOUR 2X TRADING MARATHON! 🚀`);
  console.log(`🎯 TARGET: 100% PORTFOLIO INCREASE (2X MULTIPLIER)`);
  console.log(`💪 ALL TOKENS ENABLED: ${VOLATILE.join(', ')}`);
  console.log(`🛡️ UNSTOPPABLE: Enhanced error recovery with temporary blacklisting`);
  console.log(`⚡ MAXIMUM PROFIT MODE: Increased position sizes and frequency`);
  
  const initialPortfolio = await getPortfolio();
  const snapshotTokens = initialPortfolio.tokens;
  const initialTotalValue = getTotalPortfolioValue(snapshotTokens);
  let cycleCount = 0;
  let lastRebalance = 0;
  let cumulativeProfit = 0;
  let lastTotalValue = initialTotalValue;
  
  const startTime = Date.now();
  const endTime = startTime + (24 * 60 * 60 * 1000);
  let lastHourlyReport = 0;
  const hourlyData = [];
  
  console.log(`📅 Start Time: ${new Date(startTime).toLocaleString()}`);
  console.log(`💰 Starting Portfolio: $${formatNum(initialTotalValue)}`);
  console.log(`🏁 End Time: ${new Date(endTime).toLocaleString()}`);
  console.log(`🎯 Target Portfolio: $${formatNum(initialTotalValue * 2)} (2X)\n`);

  while (Date.now() < endTime) {
    cycleCount++;
    let usdcSpent = 0;
    let usdcGained = 0;
    let coinsBought = [];
    let coinsSold = [];
    
    // Emergency circuit breaker - but much higher threshold for 24hr marathon
    if (errorTracker.consecutiveErrors > 20) {
      console.warn(`🚨 [EMERGENCY CIRCUIT BREAKER] ${errorTracker.consecutiveErrors} consecutive errors - pausing for recovery`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL * 5));
      errorTracker.consecutiveErrors = 0;
      continue;
    }
    
    // Hourly progress tracking with 2X target focus
    const currentTime = Date.now();
    const hoursElapsed = Math.floor((currentTime - startTime) / (60 * 60 * 1000));
    
    if (hoursElapsed > lastHourlyReport) {
      lastHourlyReport = hoursElapsed;
      try {
        const currentPortfolio = await getPortfolio();
        const currentValue = getTotalPortfolioValue(currentPortfolio.tokens);
        const hourlyProfit = currentValue - initialTotalValue;
        const hourlyReturn = ((currentValue / initialTotalValue - 1) * 100);
        const progressTo2X = (currentValue / initialTotalValue);
        
        // Calculate required hourly return to reach 2X
        const hoursRemaining = 24 - hoursElapsed;
        const requiredMultiplier = 2.0;
        const currentMultiplier = currentValue / initialTotalValue;
        const requiredHourlyGrowth = hoursRemaining > 0 ? Math.pow(requiredMultiplier / currentMultiplier, 1 / hoursRemaining) - 1 : 0;
        
        hourlyData.push({
          hour: hoursElapsed,
          value: currentValue,
          profit: hourlyProfit,
          return: hourlyReturn,
          multiplier: progressTo2X,
          time: new Date(currentTime).toLocaleString()
        });
        
        console.log(`\n🕐 HOURLY PROGRESS REPORT - Hour ${hoursElapsed}/24`);
        console.log(`📊 Portfolio Value: $${formatNum(currentValue)}`);
        console.log(`💰 Total Profit: $${formatNum(hourlyProfit)} (${hourlyReturn.toFixed(2)}%)`);
        console.log(`🎯 2X Progress: ${progressTo2X.toFixed(2)}x / 2.0x (${((progressTo2X / 2.0) * 100).toFixed(1)}% to target)`);
        console.log(`📈 Required Hourly Growth: ${(requiredHourlyGrowth * 100).toFixed(2)}% to reach 2X`);
        
        // Temporary blacklist status
        const activeBlacklist = Array.from(temporaryBlacklist.entries())
          .filter(([token, expiry]) => Date.now() < expiry)
          .map(([token, expiry]) => `${token}(${Math.ceil((expiry - Date.now()) / 60000)}min)`);
        
        console.log(`⏰ Temp Blacklisted: ${activeBlacklist.length ? activeBlacklist.join(', ') : 'None'}`);
        console.log(`🔥 Token Age Errors: ${errorTracker.tokenAgeErrors.size} pairs affected`);
        console.log(`⚡ System Health: ${errorTracker.consecutiveErrors} consecutive errors`);
        console.log(`⏳ Time Remaining: ${24 - hoursElapsed} hours\n`);
      } catch (error) {
        console.error(`❌ [HOURLY REPORT ERROR] ${error.message}`);
      }
    }
    
    try {
      const portfolio = await getPortfolio();
      const tokens = portfolio.tokens;
      const totalValue = getTotalPortfolioValue(tokens);
      const usdcValue = flattenUSDC(tokens);
      updatePriceHistory(tokens);
      const alloc = getAllocations(tokens, totalValue);
      const usdcRatio = usdcValue / totalValue;
      
      // Get available tokens (not temporarily blacklisted)
      const availableTokens = VOLATILE.filter(sym => {
        const isBlacklisted = temporaryBlacklist.has(sym) && Date.now() < temporaryBlacklist.get(sym);
        return !isBlacklisted;
      });
      
      const blacklistedCount = VOLATILE.length - availableTokens.length;
      
      // Aggressive emergency USDC management
      if (usdcRatio < 0.10) { // More aggressive threshold
        console.log(`🚨 [CRITICAL USDC] Only ${(usdcRatio * 100).toFixed(1)}% USDC - EMERGENCY SELLING!`);
        for (const t of tokens) {
          if (availableTokens.includes(t.symbol) && t.amount > 0 && t.value > MIN_TRADE_USD) {
            const tokenObj = getTokenByAddress(t.token);
            if (tokenObj) {
              const usdcToken = getUsdcTokenForChain(tokenObj);
              const emergencySellAmount = t.amount * 0.7; // Sell 70% in emergency
              
              if (emergencySellAmount >= MIN_TRADE_AMOUNTS[t.symbol]) {
                const tradeResult = await executeTrade(
                  tokenObj.address,
                  usdcToken.address,
                  emergencySellAmount,
                  "CRITICAL USDC REPLENISHMENT",
                  tokenObj,
                  usdcToken
                );
                
                if (tradeResult.success) {
                  usdcGained += emergencySellAmount * (await getTokenPrice(tokenObj) || 0);
                  coinsSold.push(`${t.symbol} (CRITICAL)`);
                  break;
                }
              }
            }
          }
        }
      }
      
      // ULTRA-AGGRESSIVE SELLING for maximum profit taking
      for (const t of tokens) {
        if (availableTokens.includes(t.symbol) && t.amount > 0) {
          const tokenObj = getTokenByAddress(t.token);
          if (!tokenObj) continue;
          
          const price = await getTokenPrice(tokenObj);
          if (!price) continue;
          
          const momentum = getMomentum(t.token);
          const currentAlloc = alloc[t.symbol] || 0;
          const isUsdcLow = usdcRatio < 0.20;
          
          // More aggressive selling conditions for 2X target
          const shouldSell = (
            momentum > 0.003 ||  // Take profit on smaller gains
            currentAlloc > MAX_POSITION * 0.7 ||  // Sell at 70% of max position
            (momentum < -0.002 && currentAlloc > MAX_POSITION * 0.2) ||  // Quick loss cutting
            (isUsdcLow && t.value > MIN_TRADE_USD) ||  // Sell when USDC low
            (momentum > 0.001 && isUsdcLow)  // Any profit when USDC needed
          );
          
          if (shouldSell && t.value > MIN_TRADE_USD && t.amount >= MIN_TRADE_AMOUNTS[t.symbol]) {
            const usdcToken = getUsdcTokenForChain(tokenObj);
            let sellAmount = isUsdcLow ? t.amount * 0.8 : 
                           momentum > 0.003 ? t.amount * 0.7 : 
                           momentum < -0.002 ? t.amount * 0.9 : t.amount * 0.6;
            
            if (sellAmount >= MIN_TRADE_AMOUNTS[t.symbol]) {
              const canTradeResult = await canTrade(tokenObj, usdcToken, sellAmount);
              if (canTradeResult) {
                const reason = isUsdcLow ? `USDC replenishment (${(usdcRatio * 100).toFixed(1)}%)` :
                             momentum > 0.003 ? `Profit taking (${momentum.toFixed(3)})` : 
                             momentum < -0.002 ? `Loss cutting (${momentum.toFixed(3)})` : 
                             "Aggressive rebalance";
                
                const tradeResult = await executeTrade(
                  t.token,
                  usdcToken.address,
                  sellAmount,
                  reason,
                  tokenObj,
                  usdcToken
                );
                
                if (tradeResult.success) {
                  usdcGained += sellAmount * price;
                  coinsSold.push(`${t.symbol} (${formatNum(sellAmount)})`);
                }
              }
            }
          }
        }
      }
      
      // ULTRA-AGGRESSIVE BUYING for maximum opportunities
      for (const sym of availableTokens) {
        const tokenObj = Object.values(TOKENS).find(token => token.symbol === sym);
        if (!tokenObj) continue;
        
        const price = await getTokenPrice(tokenObj);
        if (!price) continue;
        
        const momentum = getMomentum(tokenObj.address);
        const currentAlloc = alloc[sym] || 0;
        
        // More aggressive buying for 2X target
        const shouldBuy = (
          momentum < -0.002 ||  // Buy on smaller dips
          currentAlloc < MAX_POSITION * 0.8 ||  // Buy up to 80% of max position
          (momentum > 0.003 && currentAlloc < MAX_POSITION * 0.6) ||  // Chase momentum
          (currentAlloc === 0 && availableTokens.length > blacklistedCount) // Always try to get exposure
        );
        
        if (shouldBuy && usdcValue > MIN_TRADE_USD * 3) {
          const usdcToken = getUsdcTokenForChain(tokenObj);
          let buyUSD = Math.min(
            usdcValue * 0.20,  // Up to 20% of USDC per trade
            (MAX_POSITION - currentAlloc) * totalValue,
            MIN_TRADE_USD * 3,
            usdcValue - (MIN_TRADE_USD * 2)
          );
          
          // Momentum boost for 2X strategy
          if (momentum > 0.003 && usdcValue > MIN_TRADE_USD * 6) {
            buyUSD = Math.min(buyUSD * 1.5, usdcValue * 0.30);
          }
          
          if (buyUSD >= MIN_TRADE_USD && buyUSD <= usdcValue - MIN_TRADE_USD) {
            const buyAmount = buyUSD / price;
            
            if (buyAmount >= MIN_TRADE_AMOUNTS[sym]) {
              const canTradeResult = await canTrade(usdcToken, tokenObj, buyAmount);
              if (canTradeResult) {
                const reason = momentum < -0.002 ? `Aggressive dip buy (${momentum.toFixed(3)})` : 
                             momentum > 0.003 ? `Momentum chase (${momentum.toFixed(3)})` : 
                             currentAlloc === 0 ? "New position entry" :
                             "Aggressive accumulation";
                
                const tradeResult = await executeTrade(
                  usdcToken.address,
                  tokenObj.address,
                  buyAmount,
                  reason,
                  usdcToken,
                  tokenObj
                );
                
                if (tradeResult.success) {
                  usdcSpent += buyUSD;
                  coinsBought.push(`${sym} (${formatNum(buyAmount)})`);
                }
              }
            }
          }
        }
      }
      
      // AGGRESSIVE REBALANCING for 2X optimization
      if (cycleCount - lastRebalance >= REBALANCE_INTERVAL && usdcRatio > 0.15 && availableTokens.length > 0) {
        lastRebalance = cycleCount;
        console.log(`\n⚖️ ULTRA-AGGRESSIVE REBALANCING (Cycle ${cycleCount}):`);
        
        // Dynamic targets based on available tokens and 2X strategy
        const numAvailable = availableTokens.length;
        const baseAllocation = 0.65 / numAvailable; // 65% split among available tokens
        
        const targets = { USDC: 0.35 }; // Keep 35% in USDC for flexibility
        availableTokens.forEach(sym => {
          targets[sym] = baseAllocation;
        });
        
        // Execute rebalancing trades
        for (const sym of Object.keys(targets)) {
          if (sym === "USDC") continue;
          if (!availableTokens.includes(sym)) continue;
          
          const curAlloc = alloc[sym] || 0;
          const target = targets[sym];
          
          // Rebalance with tighter tolerance for more active management
          if (Math.abs(curAlloc - target) > 0.05) {
            if (curAlloc > target) {
              // Sell excess
              const t = tokens.find(x => x.symbol === sym);
              if (t && t.value > MIN_TRADE_USD) {
                const tokenObj = getTokenByAddress(t.token);
                if (tokenObj) {
                  const sellAmount = t.amount * 0.4; // Sell 40% for rebalancing
                  if (sellAmount >= MIN_TRADE_AMOUNTS[sym]) {
                    const usdcToken = getUsdcTokenForChain(tokenObj);
                    const canTradeResult = await canTrade(tokenObj, usdcToken, sellAmount);
                    if (canTradeResult) {
                      const tradeResult = await executeTrade(
                        t.token,
                        usdcToken.address,
                        sellAmount,
                        `Rebalance sell: ${(curAlloc * 100).toFixed(1)}% -> ${(target * 100).toFixed(1)}%`,
                        tokenObj,
                        usdcToken
                      );
                      
                      if (tradeResult.success) {
                        const price = await getTokenPrice(tokenObj);
                        if (price) {
                          usdcGained += sellAmount * price;
                          coinsSold.push(`${sym} (rebalance)`);
                        }
                      }
                    }
                  }
                }
              }
            } else {
              // Buy to target
              const tokenObj = Object.values(TOKENS).find(token => token.symbol === sym);
              if (tokenObj && usdcValue > MIN_TRADE_USD * 2) {
                const price = await getTokenPrice(tokenObj);
                if (price) {
                  const buyUSD = Math.min((target - curAlloc) * totalValue, usdcValue * 0.25);
                  if (buyUSD >= MIN_TRADE_USD) {
                    const buyAmount = buyUSD / price;
                    if (buyAmount >= MIN_TRADE_AMOUNTS[sym]) {
                      const usdcToken = getUsdcTokenForChain(tokenObj);
                      const canTradeResult = await canTrade(usdcToken, tokenObj, buyAmount);
                      if (canTradeResult) {
                        const tradeResult = await executeTrade(
                          usdcToken.address,
                          tokenObj.address,
                          buyAmount,
                          `Rebalance buy: ${(curAlloc * 100).toFixed(1)}% -> ${(target * 100).toFixed(1)}%`,
                          usdcToken,
                          tokenObj
                        );
                        
                        if (tradeResult.success) {
                          usdcSpent += buyUSD;
                          coinsBought.push(`${sym} (rebalance)`);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      
      // Performance tracking
      const profit = totalValue - lastTotalValue;
      cumulativeProfit += profit;
      lastTotalValue = totalValue;
      const currentMultiplier = totalValue / initialTotalValue;
      const progressTo2X = (currentMultiplier / 2.0) * 100;
      
      console.log(`\n🚀 ULTRA-AGGRESSIVE CYCLE ${cycleCount} | ${new Date().toLocaleString()}`);
      console.log(`💰 Portfolio: $${formatNum(totalValue)} | USDC: $${formatNum(usdcValue)} (${(usdcRatio * 100).toFixed(1)}%)`);
      
      const usdcHealth = usdcRatio >= 0.20 ? "🟢 HEALTHY" : usdcRatio >= 0.10 ? "🟡 LOW" : "🔴 CRITICAL";
      console.log(`💧 USDC Health: ${usdcHealth}`);
      console.log(`🎯 2X Progress: ${currentMultiplier.toFixed(2)}x (${progressTo2X.toFixed(1)}% to target)`);
      console.log(`🛡️ System Status: ${errorTracker.consecutiveErrors} consecutive errors | ${blacklistedCount}/${VOLATILE.length} tokens blacklisted`);
      
      console.log(`📊 Active Token Allocations:`);
      availableTokens.forEach(sym => {
        const allocation = alloc[sym] || 0;
        const tokenData = tokens.find(t => t.symbol === sym);
        const value = (allocation * totalValue) || 0;
        const amount = tokenData?.amount || 0;
        console.log(`   ${sym}: ${(allocation * 100).toFixed(1)}% ($${formatNum(value)}) [${amount > 0 ? formatNum(amount) : '0'} tokens]`);
      });
      
      if (blacklistedCount > 0) {
        console.log(`⏰ Temporarily Blacklisted:`);
        VOLATILE.filter(sym => {
          const isBlacklisted = temporaryBlacklist.has(sym) && Date.now() < temporaryBlacklist.get(sym);
          return isBlacklisted;
        }).forEach(sym => {
          const expiry = temporaryBlacklist.get(sym);
          const minutesLeft = Math.ceil((expiry - Date.now()) / 60000);
          console.log(`   ${sym}: ${minutesLeft} minutes remaining`);
        });
      }
      
      console.log(`🔄 Trading Activity:`);
      console.log(`   Bought: ${coinsBought.length ? coinsBought.join(', ') : 'None'}`);
      console.log(`   Sold: ${coinsSold.length ? coinsSold.join(', ') : 'None'}`);
      console.log(`   Capital Flow: -$${formatNum(usdcSpent)} spent | +$${formatNum(usdcGained)} gained`);
      
      console.log(`📈 Performance Metrics:`);
      console.log(`   Cycle Profit: $${formatNum(profit)} | Total Profit: $${formatNum(cumulativeProfit)}`);
      console.log(`   Total Return: ${((currentMultiplier - 1) * 100).toFixed(2)}%`);
      console.log(`   2X Target: ${progressTo2X >= 100 ? '✅ ACHIEVED!' : `${(100 - progressTo2X).toFixed(1)}% remaining`}`);
      
    } catch (error) {
      errorTracker.consecutiveErrors++;
      errorTracker.lastError = error.message;
      
      console.error(`❌ [CYCLE ERROR ${errorTracker.consecutiveErrors}] ${error.message}`);
      
      // Enhanced error recovery with shorter delays for 24hr marathon
      if (error.message.includes('timeout')) {
        console.log(`⏳ [RECOVERY] Network timeout - brief pause`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
      } else if (error.message.includes('rate limit')) {
        console.log(`🐌 [RECOVERY] Rate limit - short backoff`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL * 2));
      } else {
        console.log(`🔧 [RECOVERY] Generic error - continuing marathon`);
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL / 2));
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  
  // FINAL 24-HOUR MARATHON RESULTS
  console.log(`\n🏁 24-HOUR ULTRA-AGGRESSIVE MARATHON COMPLETED! 🏁`);
  
  try {
    const finalPortfolio = await getPortfolio();
    const finalValue = getTotalPortfolioValue(finalPortfolio.tokens);
    const totalProfit = finalValue - initialTotalValue;
    const totalReturn = ((finalValue / initialTotalValue - 1) * 100);
    const finalMultiplier = finalValue / initialTotalValue;
    
    console.log(`\n🎯 FINAL 2X TARGET RESULTS:`);
    console.log(`💰 Starting Portfolio: $${formatNum(initialTotalValue)}`);
    console.log(`💰 Final Portfolio: $${formatNum(finalValue)}`);
    console.log(`📈 Total Profit: $${formatNum(totalProfit)} (${totalReturn.toFixed(2)}%)`);
    console.log(`🎯 Final Multiplier: ${finalMultiplier.toFixed(2)}x`);
    
    const targetAchieved = finalMultiplier >= 2.0;
    console.log(`🏆 2X TARGET: ${targetAchieved ? '✅ ACHIEVED!' : '❌ MISSED'} (Target: 2.0x)`);
    
    if (targetAchieved) {
      console.log(`🎉 CONGRATULATIONS! Portfolio successfully doubled in 24 hours!`);
    } else {
      const shortfall = 2.0 - finalMultiplier;
      console.log(`📊 Shortfall: ${shortfall.toFixed(2)}x (${((shortfall / 2.0) * 100).toFixed(1)}% of target)`);
    }
    
    console.log(`\n🛡️ SYSTEM RESILIENCE REPORT:`);
    console.log(`⏱️ Total Cycles: ${cycleCount}`);
    console.log(`🔥 Token Age Errors: ${errorTracker.tokenAgeErrors.size} pairs affected`);
    console.log(`⏰ Peak Blacklisted Tokens: ${Math.max(...Array.from(temporaryBlacklist.values()).map(v => v))}`);
    console.log(`🚀 Maximum Uptime Achieved: System never stopped for 24 hours`);
    
    console.log(`\n📊 HOURLY PERFORMANCE BREAKDOWN:`);
    hourlyData.forEach(h => {
      const status = h.multiplier >= 2.0 ? '🎯' : h.multiplier >= 1.5 ? '📈' : h.multiplier >= 1.0 ? '📊' : '📉';
      console.log(`Hour ${h.hour.toString().padStart(2, '0')}: $${formatNum(h.value)} (${h.multiplier.toFixed(2)}x) ${status}`);
    });
    
  } catch (error) {
    console.error(`❌ [FINAL REPORT ERROR] ${error.message} - But marathon completed!`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 