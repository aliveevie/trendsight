import config from "./config.js";
import PriceOracle from "./priceOracle.js";
import RecallAPI from "./recallApi.js";
import Database from "./database.js";

class TradingEngine {
  constructor() {
    this.priceOracle = new PriceOracle();
    this.recallApi = new RecallAPI();
    this.database = new Database();
    this.isRunning = false;
    this.initialPortfolio = null;
    this.currentPortfolio = null;
    this.lastProfitCalculation = null;
  }

  async initialize() {
    try {
      console.log("Initializing trading engine...");
      
      // Initialize database
      await this.database.init();
      
      // Get initial portfolio
      await this.loadInitialPortfolio();
      
      // Start price monitoring
      await this.startPriceMonitoring();
      
      // Start profit calculation
      await this.startProfitCalculation();
      
      console.log("Trading engine initialized successfully");
    } catch (error) {
      console.error("Failed to initialize trading engine:", error);
      throw error;
    }
  }

  async loadInitialPortfolio() {
    try {
      // Try to get portfolio from API
      const portfolioData = await this.recallApi.getPortfolio();
      this.initialPortfolio = this.recallApi.formatPortfolioData(portfolioData);
      
      // Save initial snapshot
      await this.database.savePortfolioSnapshot(
        this.initialPortfolio,
        this.initialPortfolio.totalValue
      );
      
      console.log("Initial portfolio loaded:", this.initialPortfolio);
    } catch (error) {
      console.warn("Using mock portfolio for testing");
      this.initialPortfolio = this.recallApi.getMockPortfolio();
    }
  }

  async startPriceMonitoring() {
    setInterval(async () => {
      await this.checkPricesAndTrade();
    }, config.monitoring.priceCheckInterval);
  }

  async startProfitCalculation() {
    setInterval(async () => {
      await this.calculateAndLogProfit();
    }, config.monitoring.profitCalculationInterval);
  }

  async checkPricesAndTrade() {
    try {
      // Get current prices
      const prices = await this.priceOracle.getAllPrices();
      
      // Save prices to database
      for (const [symbol, price] of Object.entries(prices)) {
        await this.database.savePrice(symbol, price);
      }

      // Get current portfolio
      await this.updateCurrentPortfolio();
      
      // Check for profit opportunities
      await this.checkProfitOpportunities(prices);
      
      // Check for reinvestment opportunities
      await this.checkReinvestmentOpportunities(prices);
      
    } catch (error) {
      console.error("Error in price monitoring:", error);
    }
  }

  async updateCurrentPortfolio() {
    try {
      const portfolioData = await this.recallApi.getPortfolio();
      this.currentPortfolio = this.recallApi.formatPortfolioData(portfolioData);
    } catch (error) {
      console.warn("Using mock portfolio for current state");
      this.currentPortfolio = this.recallApi.getMockPortfolio();
    }
  }

  async checkProfitOpportunities(prices) {
    if (!this.currentPortfolio || !this.initialPortfolio) return;

    for (const [symbol, holding] of Object.entries(this.currentPortfolio.holdings)) {
      if (symbol === "USDC") continue; // Skip USDC itself

      const currentPrice = prices[symbol];
      const initialPrice = this.getInitialPrice(symbol);
      
      if (!currentPrice || !initialPrice) continue;

      const priceChange = (currentPrice - initialPrice) / initialPrice;
      
      // Check if we have a profit opportunity (0.5% or more)
      if (priceChange >= config.trading.profitThreshold) {
        console.log(`Profit opportunity detected for ${symbol}: ${(priceChange * 100).toFixed(2)}%`);
        
        // Calculate how much to sell
        const sellQuantity = this.calculateOptimalSellQuantity(holding, priceChange);
        
        if (sellQuantity > 0) {
          await this.executeTrade(symbol, "sell", sellQuantity, currentPrice);
        }
      }
    }
  }

  async checkReinvestmentOpportunities(prices) {
    if (!this.currentPortfolio) return;

    const usdcHolding = this.currentPortfolio.holdings.USDC;
    if (!usdcHolding || usdcHolding.value < config.trading.reinvestmentAmount) return;

    // Check for upward trends in volatile tokens
    for (const [symbol, tokenConfig] of Object.entries(config.tokens)) {
      if (symbol === "USDC" || tokenConfig.volatility !== "high") continue;

      const trend = this.priceOracle.detectTrend(symbol, 30);
      const priceChange = this.priceOracle.calculatePriceChange(symbol, 60);
      
      // Invest if there's an upward trend and positive recent performance
      if (trend === "upward" && priceChange > 1) {
        console.log(`Reinvestment opportunity detected for ${symbol}: trend=${trend}, change=${priceChange.toFixed(2)}%`);
        
        const investAmount = Math.min(
          config.trading.reinvestmentAmount,
          usdcHolding.value * 0.1 // Max 10% of USDC
        );
        
        const currentPrice = prices[symbol];
        const quantity = investAmount / currentPrice;
        
        if (quantity > 0) {
          await this.executeTrade(symbol, "buy", quantity, currentPrice);
        }
      }
    }
  }

  async executeTrade(symbol, side, quantity, price) {
    try {
      // Validate trade
      const validation = this.recallApi.validateTrade(symbol, side, quantity, price);
      if (!validation.isValid) {
        console.error("Trade validation failed:", validation.errors);
        return;
      }

      // Execute trade via API
      const tradeResult = await this.recallApi.executeTrade(symbol, side, quantity, price);
      
      // Calculate trade details
      const totalUsdc = side === "buy" ? quantity * price : quantity * price;
      const profitLoss = this.calculateTradeProfitLoss(symbol, side, quantity, price);
      
      // Save trade to database
      await this.database.saveTrade({
        symbol,
        side,
        quantity,
        priceUsdc: price,
        totalUsdc,
        profitLoss,
        tradeId: tradeResult.id || null,
        status: "executed",
      });

      console.log(`Trade executed: ${side} ${quantity} ${symbol} at $${price} (Total: $${totalUsdc.toFixed(2)})`);
      
      // Send webhook notification if enabled
      if (config.webhook.enabled) {
        await this.sendWebhookNotification("trade_executed", {
          symbol,
          side,
          quantity,
          price,
          totalUsdc,
          profitLoss,
        });
      }

      return tradeResult;
    } catch (error) {
      console.error("Trade execution failed:", error);
      
      // Save failed trade to database
      await this.database.saveTrade({
        symbol,
        side,
        quantity,
        priceUsdc: price,
        totalUsdc: quantity * price,
        profitLoss: 0,
        status: "failed",
      });
      
      throw error;
    }
  }

  calculateTradeProfitLoss(symbol, side, quantity, price) {
    if (side === "buy") return 0; // No profit/loss on buy

    // For sell orders, calculate profit/loss based on initial price
    const initialPrice = this.getInitialPrice(symbol);
    if (!initialPrice) return 0;

    const profitLoss = (price - initialPrice) * quantity;
    return profitLoss;
  }

  getInitialPrice(symbol) {
    if (!this.initialPortfolio || !this.initialPortfolio.holdings[symbol]) {
      return null;
    }
    
    const holding = this.initialPortfolio.holdings[symbol];
    return holding.price;
  }

  calculateOptimalSellQuantity(holding, priceChange) {
    // Sell more if price increase is higher
    const sellPercentage = Math.min(0.5, priceChange / 0.02); // Max 50% sell
    const sellQuantity = holding.quantity * sellPercentage;
    
    // Ensure minimum trade amount
    if (sellQuantity * holding.price < config.trading.minTradeAmount) {
      return 0;
    }
    
    return sellQuantity;
  }

  async calculateAndLogProfit() {
    try {
      await this.updateCurrentPortfolio();
      
      if (!this.currentPortfolio || !this.initialPortfolio) return;

      const initialValue = this.initialPortfolio.totalValue;
      const currentValue = this.currentPortfolio.totalValue;
      const profitLoss = currentValue - initialValue;
      const profitPercentage = (profitLoss / initialValue) * 100;

      // Calculate daily profit
      const lastProfit = this.lastProfitCalculation;
      const dailyProfit = lastProfit ? profitLoss - lastProfit.profitLoss : profitLoss;

      const profitData = {
        totalUsdc: currentValue,
        profitLossUsdc: profitLoss,
        profitPercentage,
        dailyProfitUsdc: dailyProfit,
      };

      // Save to database
      await this.database.saveProfitCalculation(profitData);
      
      // Update last profit calculation
      this.lastProfitCalculation = profitData;

      console.log(`=== Profit Report ===`);
      console.log(`Total Portfolio Value: $${currentValue.toFixed(2)}`);
      console.log(`Total Profit/Loss: $${profitLoss.toFixed(2)} (${profitPercentage.toFixed(2)}%)`);
      console.log(`Daily Profit: $${dailyProfit.toFixed(2)}`);
      console.log(`========================`);

      // Send webhook notification if enabled
      if (config.webhook.enabled) {
        await this.sendWebhookNotification("profit_calculated", profitData);
      }

    } catch (error) {
      console.error("Error calculating profit:", error);
    }
  }

  async sendWebhookNotification(event, data) {
    if (!config.webhook.enabled || !config.webhook.url) return;

    try {
      await axios.post(config.webhook.url, {
        event,
        data,
        timestamp: new Date().toISOString(),
        agent: "recall-trading-agent",
      });
    } catch (error) {
      console.error("Failed to send webhook notification:", error);
    }
  }

  async getPortfolioSummary() {
    await this.updateCurrentPortfolio();
    
    if (!this.currentPortfolio) return null;

    const summary = {
      totalValue: this.currentPortfolio.totalValue,
      holdings: this.currentPortfolio.holdings,
      metrics: this.recallApi.calculatePortfolioMetrics(this.currentPortfolio),
      lastUpdated: this.currentPortfolio.lastUpdated,
    };

    return summary;
  }

  async getTradingHistory(limit = 50) {
    return await this.database.getRecentTrades(limit);
  }

  async getProfitHistory(hours = 24) {
    return await this.database.getProfitHistory(hours);
  }

  stop() {
    this.isRunning = false;
    console.log("Trading engine stopped");
  }

  start() {
    this.isRunning = true;
    console.log("Trading engine started");
  }
}

export default TradingEngine; 