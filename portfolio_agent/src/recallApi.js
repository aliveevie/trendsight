import axios from "axios";
import config from "./config.js";

class RecallAPI {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.apiKey = config.api.apiKey;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.api.timeout,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error("Recall API Error:", {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        throw error;
      }
    );
  }

  async getPortfolio() {
    try {
      const response = await this.client.get("/agent/portfolio");
      return response.data;
    } catch (error) {
      console.error("Failed to get portfolio:", error.message);
      throw error;
    }
  }

  async executeTrade(symbol, side, quantity, price = null) {
    try {
      const tradeData = {
        symbol,
        side, // 'buy' or 'sell'
        quantity: parseFloat(quantity),
        ...(price && { price: parseFloat(price) }),
      };

      const response = await this.client.post("/trade/execute", tradeData);
      return response.data;
    } catch (error) {
      console.error("Failed to execute trade:", error.message);
      throw error;
    }
  }

  async getTradeHistory(limit = 100) {
    try {
      const response = await this.client.get(`/trade/history?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error("Failed to get trade history:", error.message);
      throw error;
    }
  }

  async getAgentInfo() {
    try {
      const response = await this.client.get("/agent/info");
      return response.data;
    } catch (error) {
      console.error("Failed to get agent info:", error.message);
      throw error;
    }
  }

  async getBalance() {
    try {
      const response = await this.client.get("/agent/balance");
      return response.data;
    } catch (error) {
      console.error("Failed to get balance:", error.message);
      throw error;
    }
  }

  // Helper method to format portfolio data
  formatPortfolioData(portfolioData) {
    if (!portfolioData || !portfolioData.holdings) {
      return {
        totalValue: 0,
        holdings: {},
        lastUpdated: new Date().toISOString(),
      };
    }

    const formattedHoldings = {};
    let totalValue = 0;

    for (const [symbol, holding] of Object.entries(portfolioData.holdings)) {
      const value = holding.quantity * (holding.price || 0);
      totalValue += value;

      formattedHoldings[symbol] = {
        symbol,
        quantity: holding.quantity,
        price: holding.price || 0,
        value,
        chain: holding.chain || "unknown",
      };
    }

    return {
      totalValue,
      holdings: formattedHoldings,
      lastUpdated: portfolioData.lastUpdated || new Date().toISOString(),
    };
  }

  // Helper method to calculate portfolio metrics
  calculatePortfolioMetrics(portfolioData) {
    const formatted = this.formatPortfolioData(portfolioData);
    const metrics = {
      totalValue: formatted.totalValue,
      tokenCount: Object.keys(formatted.holdings).length,
      largestPosition: null,
      smallestPosition: null,
      averagePosition: 0,
    };

    if (Object.keys(formatted.holdings).length > 0) {
      const positions = Object.values(formatted.holdings).map(h => h.value);
      metrics.largestPosition = Math.max(...positions);
      metrics.smallestPosition = Math.min(...positions);
      metrics.averagePosition = positions.reduce((sum, val) => sum + val, 0) / positions.length;
    }

    return metrics;
  }

  // Mock portfolio data for testing when API is not available
  getMockPortfolio() {
    return {
      totalValue: 10000,
      holdings: {
        USDC: {
          symbol: "USDC",
          quantity: 6000,
          price: 1.0,
          value: 6000,
          chain: "EVM",
        },
        USDbC: {
          symbol: "USDbC",
          quantity: 2000,
          price: 1.0,
          value: 2000,
          chain: "EVM",
        },
        SOL: {
          symbol: "SOL",
          quantity: 10,
          price: 100.0,
          value: 1000,
          chain: "SVM",
        },
        WETH: {
          symbol: "WETH",
          quantity: 0.5,
          price: 2000.0,
          value: 1000,
          chain: "EVM",
        },
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  // Validate trade parameters
  validateTrade(symbol, side, quantity, price = null) {
    const errors = [];

    if (!symbol || !config.tokens[symbol]) {
      errors.push(`Invalid symbol: ${symbol}`);
    }

    if (!side || !["buy", "sell"].includes(side)) {
      errors.push(`Invalid side: ${side}. Must be 'buy' or 'sell'`);
    }

    if (!quantity || quantity <= 0) {
      errors.push(`Invalid quantity: ${quantity}. Must be positive`);
    }

    if (price !== null && price <= 0) {
      errors.push(`Invalid price: ${price}. Must be positive`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default RecallAPI; 