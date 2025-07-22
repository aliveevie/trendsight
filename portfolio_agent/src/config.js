import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  // API Configuration
  api: {
    baseUrl: "https://api.sandbox.competitions.recall.network/api",
    apiKey: process.env.RECALL_SANDBOX_API_KEY,
    timeout: 30000,
  },

  // Trading Configuration
  trading: {
    profitThreshold: 0.005, // 0.5% minimum profit to trigger trade
    reinvestmentAmount: 100, // USDC amount to reinvest in volatile tokens
    maxPositionSize: 0.1, // Maximum 10% of portfolio in single token
    minTradeAmount: 10, // Minimum USDC trade amount
  },

  // Monitoring Configuration
  monitoring: {
    priceCheckInterval: 60000, // 1 minute
    profitCalculationInterval: 3600000, // 1 hour
    priceHistoryRetention: 24 * 60, // 24 hours of minute data
  },

  // Database Configuration
  database: {
    path: "./data/trading_agent.db",
    backupInterval: 3600000, // 1 hour
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    file: "./logs/trading_agent.log",
    maxSize: "10m",
    maxFiles: 5,
  },

  // Supported Tokens
  tokens: {
    USDC: {
      symbol: "USDC",
      chains: ["EVM", "SVM"],
      volatility: "low",
      targetAllocation: 0.6, // 60% target allocation
    },
    USDbC: {
      symbol: "USDbC",
      chains: ["EVM"],
      volatility: "low",
      targetAllocation: 0.2, // 20% target allocation
    },
    SOL: {
      symbol: "SOL",
      chains: ["SVM"],
      volatility: "high",
      targetAllocation: 0.1, // 10% target allocation
    },
    WETH: {
      symbol: "WETH",
      chains: ["EVM"],
      volatility: "high",
      targetAllocation: 0.1, // 10% target allocation
    },
  },

  // Price Oracle Configuration (mock for now)
  priceOracle: {
    type: "mock", // "mock" or "real"
    updateInterval: 30000, // 30 seconds
    volatilityRange: {
      USDC: { min: 0.999, max: 1.001 },
      USDbC: { min: 0.999, max: 1.001 },
      SOL: { min: 0.95, max: 1.05 },
      WETH: { min: 0.97, max: 1.03 },
    },
  },

  // Webhook Configuration
  webhook: {
    enabled: process.env.WEBHOOK_ENABLED === "true",
    url: process.env.WEBHOOK_URL,
    events: ["trade_executed", "profit_calculated", "error"],
  },
};

export default config; 