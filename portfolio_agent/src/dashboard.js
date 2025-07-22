import inquirer from "inquirer";
import chalk from "chalk";
import TradingAgent from "./agent.js";
import { systemLogger } from "./logger.js";

class Dashboard {
  constructor() {
    this.agent = new TradingAgent();
    this.isRunning = false;
  }

  async start() {
    console.log(chalk.blue.bold("🤖 Recall Trading Agent Dashboard"));
    console.log(chalk.gray("Automated spot trading with profit optimization\n"));

    await this.showMainMenu();
  }

  async showMainMenu() {
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "What would you like to do?",
          choices: [
            { name: "🚀 Start Trading Agent", value: "start" },
            { name: "⏹️  Stop Trading Agent", value: "stop" },
            { name: "📊 View Portfolio Status", value: "portfolio" },
            { name: "📈 View Recent Trades", value: "trades" },
            { name: "💰 View Profit History", value: "profit" },
            { name: "⚙️  Agent Configuration", value: "config" },
            { name: "📋 View Logs", value: "logs" },
            { name: "❌ Exit", value: "exit" },
          ],
        },
      ]);

      switch (action) {
        case "start":
          await this.startAgent();
          break;
        case "stop":
          await this.stopAgent();
          break;
        case "portfolio":
          await this.showPortfolio();
          break;
        case "trades":
          await this.showTrades();
          break;
        case "profit":
          await this.showProfit();
          break;
        case "config":
          await this.showConfig();
          break;
        case "logs":
          await this.showLogs();
          break;
        case "exit":
          await this.exit();
          return;
      }

      console.log("\n");
    }
  }

  async startAgent() {
    if (this.isRunning) {
      console.log(chalk.yellow("⚠️  Agent is already running"));
      return;
    }

    try {
      console.log(chalk.blue("🚀 Starting trading agent..."));
      await this.agent.start();
      this.isRunning = true;
      console.log(chalk.green("✅ Trading agent started successfully"));
    } catch (error) {
      console.log(chalk.red("❌ Failed to start trading agent:", error.message));
    }
  }

  async stopAgent() {
    if (!this.isRunning) {
      console.log(chalk.yellow("⚠️  Agent is not running"));
      return;
    }

    try {
      console.log(chalk.blue("⏹️  Stopping trading agent..."));
      await this.agent.stop();
      this.isRunning = false;
      console.log(chalk.green("✅ Trading agent stopped successfully"));
    } catch (error) {
      console.log(chalk.red("❌ Failed to stop trading agent:", error.message));
    }
  }

  async showPortfolio() {
    try {
      const status = await this.agent.getStatus();
      const portfolio = status.portfolio;

      if (!portfolio) {
        console.log(chalk.yellow("⚠️  No portfolio data available"));
        return;
      }

      console.log(chalk.blue.bold("\n📊 Portfolio Status"));
      console.log(chalk.gray("=" * 50));

      console.log(chalk.white(`Total Value: ${chalk.green(`$${portfolio.totalValue.toFixed(2)}`)}`));
      console.log(chalk.white(`Token Count: ${chalk.cyan(portfolio.metrics.tokenCount)}`));
      console.log(chalk.white(`Last Updated: ${chalk.gray(portfolio.lastUpdated)}`));

      console.log(chalk.blue.bold("\nHoldings:"));
      for (const [symbol, holding] of Object.entries(portfolio.holdings)) {
        const percentage = (holding.value / portfolio.totalValue * 100).toFixed(1);
        console.log(
          chalk.white(`${symbol.padEnd(8)}: ${chalk.cyan(holding.quantity.toFixed(4))} ` +
            `($${holding.value.toFixed(2)} - ${percentage}%)`)
        );
      }

    } catch (error) {
      console.log(chalk.red("❌ Failed to get portfolio:", error.message));
    }
  }

  async showTrades() {
    try {
      const status = await this.agent.getStatus();
      const trades = status.recentTrades;

      if (!trades || trades.length === 0) {
        console.log(chalk.yellow("⚠️  No recent trades found"));
        return;
      }

      console.log(chalk.blue.bold("\n📈 Recent Trades"));
      console.log(chalk.gray("=" * 50));

      trades.forEach((trade, index) => {
        const sideColor = trade.side === "buy" ? chalk.green : chalk.red;
        const sideIcon = trade.side === "buy" ? "📈" : "📉";
        
        console.log(
          chalk.white(`${index + 1}. ${sideIcon} ${sideColor(trade.side.toUpperCase())} ` +
            `${chalk.cyan(trade.quantity.toFixed(4))} ${chalk.yellow(trade.symbol)} ` +
            `@ $${trade.price_usdc.toFixed(2)}`)
        );
        console.log(
          chalk.gray(`   Total: $${trade.total_usdc.toFixed(2)} | ` +
            `P&L: $${trade.profit_loss.toFixed(2)} | ` +
            `Time: ${new Date(trade.timestamp).toLocaleString()}`)
        );
        console.log("");
      });

    } catch (error) {
      console.log(chalk.red("❌ Failed to get trades:", error.message));
    }
  }

  async showProfit() {
    try {
      const status = await this.agent.getStatus();
      const profitHistory = status.profitHistory;

      if (!profitHistory || profitHistory.length === 0) {
        console.log(chalk.yellow("⚠️  No profit history available"));
        return;
      }

      console.log(chalk.blue.bold("\n💰 Profit History"));
      console.log(chalk.gray("=" * 50));

      profitHistory.forEach((profit, index) => {
        const profitColor = profit.profit_loss_usdc >= 0 ? chalk.green : chalk.red;
        const profitIcon = profit.profit_loss_usdc >= 0 ? "📈" : "📉";
        
        console.log(
          chalk.white(`${profitIcon} ${profitColor(`$${profit.profit_loss_usdc.toFixed(2)}`)} ` +
            `(${profitColor(`${profit.profit_percentage.toFixed(2)}%`)})`)
        );
        console.log(
          chalk.gray(`   Total Value: $${profit.total_usdc.toFixed(2)} | ` +
            `Daily: $${profit.daily_profit_usdc.toFixed(2)} | ` +
            `Time: ${new Date(profit.timestamp).toLocaleString()}`)
        );
        console.log("");
      });

    } catch (error) {
      console.log(chalk.red("❌ Failed to get profit history:", error.message));
    }
  }

  async showConfig() {
    console.log(chalk.blue.bold("\n⚙️  Agent Configuration"));
    console.log(chalk.gray("=" * 50));

    console.log(chalk.white(`Profit Threshold: ${chalk.cyan((config.trading.profitThreshold * 100).toFixed(1) + "%")}`));
    console.log(chalk.white(`Reinvestment Amount: ${chalk.cyan(`$${config.trading.reinvestmentAmount}`)}`));
    console.log(chalk.white(`Max Position Size: ${chalk.cyan((config.trading.maxPositionSize * 100).toFixed(1) + "%")}`));
    console.log(chalk.white(`Min Trade Amount: ${chalk.cyan(`$${config.trading.minTradeAmount}`)}`));
    console.log(chalk.white(`Price Check Interval: ${chalk.cyan(`${config.monitoring.priceCheckInterval / 1000}s`)}`));
    console.log(chalk.white(`Profit Calculation Interval: ${chalk.cyan(`${config.monitoring.profitCalculationInterval / 1000 / 60}min`)}`));
    console.log(chalk.white(`Price Oracle Type: ${chalk.cyan(config.priceOracle.type)}`));
    console.log(chalk.white(`Webhook Enabled: ${chalk.cyan(config.webhook.enabled ? "Yes" : "No")}`));
  }

  async showLogs() {
    console.log(chalk.blue.bold("\n📋 Recent Logs"));
    console.log(chalk.gray("=" * 50));
    console.log(chalk.yellow("Log viewing feature not implemented yet."));
    console.log(chalk.gray("Check the logs directory for log files."));
  }

  async exit() {
    if (this.isRunning) {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Trading agent is running. Stop it before exiting?",
          default: true,
        },
      ]);

      if (confirm) {
        await this.stopAgent();
      }
    }

    console.log(chalk.blue("👋 Goodbye!"));
    process.exit(0);
  }
}

// Run dashboard if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new Dashboard();
  dashboard.start();
}

export default Dashboard; 