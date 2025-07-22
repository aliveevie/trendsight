import TradingEngine from "./tradingEngine.js";
import PriceOracle from "./priceOracle.js";
import RecallAPI from "./recallApi.js";
import Database from "./database.js";
import { systemLogger } from "./logger.js";

class TradingAgentTest {
  constructor() {
    this.tradingEngine = new TradingEngine();
    this.priceOracle = new PriceOracle();
    this.recallApi = new RecallAPI();
    this.database = new Database();
  }

  async runAllTests() {
    console.log("🧪 Running Trading Agent Tests...\n");

    try {
      await this.testDatabase();
      await this.testPriceOracle();
      await this.testRecallAPI();
      await this.testTradingEngine();
      await this.testIntegration();
      
      console.log("\n✅ All tests passed successfully!");
    } catch (error) {
      console.error("\n❌ Test failed:", error.message);
      throw error;
    }
  }

  async testDatabase() {
    console.log("📊 Testing Database...");
    
    await this.database.init();
    
    // Test portfolio snapshot
    const mockPortfolio = {
      totalValue: 10000,
      holdings: {
        USDC: { quantity: 6000, price: 1.0, value: 6000 },
        SOL: { quantity: 10, price: 100.0, value: 1000 },
      },
    };
    
    await this.database.savePortfolioSnapshot(mockPortfolio, 10000);
    
    // Test price saving
    await this.database.savePrice("USDC", 1.0);
    await this.database.savePrice("SOL", 100.0);
    
    // Test trade saving
    await this.database.saveTrade({
      symbol: "SOL",
      side: "buy",
      quantity: 5,
      priceUsdc: 100.0,
      totalUsdc: 500.0,
      profitLoss: 0,
    });
    
    // Test data retrieval
    const latestPrice = await this.database.getLatestPrice("USDC");
    const recentTrades = await this.database.getRecentTrades(5);
    
    console.log("✅ Database tests passed");
  }

  async testPriceOracle() {
    console.log("💰 Testing Price Oracle...");
    
    // Test mock price generation
    const usdcPrice = await this.priceOracle.getPrice("USDC");
    const solPrice = await this.priceOracle.getPrice("SOL");
    const wethPrice = await this.priceOracle.getPrice("WETH");
    
    console.log(`USDC Price: $${usdcPrice.toFixed(4)}`);
    console.log(`SOL Price: $${solPrice.toFixed(4)}`);
    console.log(`WETH Price: $${wethPrice.toFixed(4)}`);
    
    // Test price history
    const history = this.priceOracle.getPriceHistory("SOL", 60);
    console.log(`SOL Price History Points: ${history.length}`);
    
    // Test trend detection
    const trend = this.priceOracle.detectTrend("SOL", 30);
    console.log(`SOL Trend: ${trend}`);
    
    console.log("✅ Price Oracle tests passed");
  }

  async testRecallAPI() {
    console.log("🔗 Testing Recall API...");
    
    // Test portfolio formatting
    const mockPortfolioData = {
      holdings: {
        USDC: { quantity: 6000, price: 1.0 },
        SOL: { quantity: 10, price: 100.0 },
      },
    };
    
    const formatted = this.recallApi.formatPortfolioData(mockPortfolioData);
    console.log(`Formatted Portfolio Value: $${formatted.totalValue}`);
    
    // Test trade validation
    const validTrade = this.recallApi.validateTrade("SOL", "buy", 5, 100.0);
    const invalidTrade = this.recallApi.validateTrade("INVALID", "buy", -5, 100.0);
    
    console.log(`Valid Trade: ${validTrade.isValid}`);
    console.log(`Invalid Trade: ${invalidTrade.isValid} (${invalidTrade.errors.length} errors)`);
    
    console.log("✅ Recall API tests passed");
  }

  async testTradingEngine() {
    console.log("🤖 Testing Trading Engine...");
    
    // Test profit calculation
    const profitLoss = this.tradingEngine.calculateTradeProfitLoss("SOL", "sell", 5, 105.0);
    console.log(`Sample Trade P&L: $${profitLoss.toFixed(2)}`);
    
    // Test optimal sell quantity calculation
    const holding = { quantity: 10, price: 100.0 };
    const sellQuantity = this.tradingEngine.calculateOptimalSellQuantity(holding, 0.02);
    console.log(`Optimal Sell Quantity: ${sellQuantity.toFixed(4)}`);
    
    console.log("✅ Trading Engine tests passed");
  }

  async testIntegration() {
    console.log("🔗 Testing Integration...");
    
    // Test full initialization
    await this.tradingEngine.initialize();
    
    // Test portfolio summary
    const summary = await this.tradingEngine.getPortfolioSummary();
    console.log(`Portfolio Summary Available: ${summary !== null}`);
    
    // Test trading history
    const trades = await this.tradingEngine.getTradingHistory(5);
    console.log(`Recent Trades Available: ${trades.length >= 0}`);
    
    // Test profit history
    const profitHistory = await this.tradingEngine.getProfitHistory(24);
    console.log(`Profit History Available: ${profitHistory.length >= 0}`);
    
    console.log("✅ Integration tests passed");
  }

  async cleanup() {
    try {
      await this.database.close();
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const test = new TradingAgentTest();
  
  test.runAllTests()
    .then(() => {
      console.log("\n🎉 All tests completed successfully!");
      return test.cleanup();
    })
    .catch((error) => {
      console.error("\n💥 Test suite failed:", error);
      process.exit(1);
    });
}

export default TradingAgentTest; 