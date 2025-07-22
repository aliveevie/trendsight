import TradingEngine from "./tradingEngine.js";
import { systemLogger, tradeLogger, profitLogger } from "./logger.js";
import config from "./config.js";

class TradingAgent {
  constructor() {
    this.tradingEngine = new TradingEngine();
    this.isRunning = false;
    this.startTime = null;
  }

  async start() {
    try {
      systemLogger.info("Starting automated trading agent...");
      
      // Initialize trading engine
      await this.tradingEngine.initialize();
      
      // Start the engine
      this.tradingEngine.start();
      this.isRunning = true;
      this.startTime = new Date();
      
      systemLogger.info("Trading agent started successfully", {
        startTime: this.startTime.toISOString(),
        config: {
          profitThreshold: config.trading.profitThreshold,
          reinvestmentAmount: config.trading.reinvestmentAmount,
          priceCheckInterval: config.monitoring.priceCheckInterval,
        },
      });

      // Keep the process alive
      this.keepAlive();
      
    } catch (error) {
      systemLogger.error("Failed to start trading agent", error);
      throw error;
    }
  }

  async stop() {
    try {
      systemLogger.info("Stopping trading agent...");
      
      this.isRunning = false;
      this.tradingEngine.stop();
      
      const runtime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
      systemLogger.info("Trading agent stopped", {
        runtime: `${Math.floor(runtime / 1000)} seconds`,
      });
      
    } catch (error) {
      systemLogger.error("Error stopping trading agent", error);
    }
  }

  keepAlive() {
    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("\nReceived SIGINT, shutting down gracefully...");
      await this.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\nReceived SIGTERM, shutting down gracefully...");
      await this.stop();
      process.exit(0);
    });

    // Log status every hour
    setInterval(() => {
      if (this.isRunning) {
        const runtime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
        systemLogger.info("Agent status", {
          running: this.isRunning,
          runtime: `${Math.floor(runtime / 1000)} seconds`,
        });
      }
    }, 3600000); // Every hour
  }

  async getStatus() {
    const portfolio = await this.tradingEngine.getPortfolioSummary();
    const recentTrades = await this.tradingEngine.getTradingHistory(10);
    const profitHistory = await this.tradingEngine.getProfitHistory(24);
    
    return {
      isRunning: this.isRunning,
      startTime: this.startTime?.toISOString(),
      runtime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      portfolio,
      recentTrades,
      profitHistory: profitHistory.slice(-5), // Last 5 profit calculations
    };
  }
}

// CLI interface
async function main() {
  const agent = new TradingAgent();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case "start":
        await agent.start();
        break;
        
      case "status":
        const status = await agent.getStatus();
        console.log(JSON.stringify(status, null, 2));
        break;
        
      case "test":
        console.log("Running in test mode...");
        await agent.start();
        // Stop after 5 minutes in test mode
        setTimeout(async () => {
          await agent.stop();
          process.exit(0);
        }, 5 * 60 * 1000);
        break;
        
      default:
        console.log(`
Automated Trading Agent for Recall Network

Usage:
  node src/agent.js start     - Start the trading agent
  node src/agent.js status    - Show current status
  node src/agent.js test      - Run in test mode (5 minutes)

Environment Variables:
  RECALL_SANDBOX_API_KEY      - Your Recall sandbox API key
  LOG_LEVEL                   - Logging level (debug, info, warn, error)
  WEBHOOK_ENABLED            - Enable webhook notifications (true/false)
  WEBHOOK_URL                - Webhook URL for notifications
        `);
        break;
    }
  } catch (error) {
    systemLogger.error("Application error", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TradingAgent; 