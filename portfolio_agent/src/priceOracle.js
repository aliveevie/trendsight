import axios from "axios";
import config from "./config.js";

class PriceOracle {
  constructor() {
    this.prices = new Map();
    this.lastUpdate = new Map();
    this.mockPrices = {
      USDC: 1.0,
      USDbC: 1.0,
      SOL: 100.0,
      WETH: 2000.0,
    };
    this.priceHistory = new Map();
  }

  async getPrice(symbol, chain = null) {
    try {
      if (config.priceOracle.type === "mock") {
        return await this.getMockPrice(symbol);
      } else {
        return await this.getRealPrice(symbol, chain);
      }
    } catch (error) {
      console.error(`Error getting price for ${symbol}:`, error);
      // Fallback to mock price
      return this.mockPrices[symbol] || 1.0;
    }
  }

  async getMockPrice(symbol) {
    const basePrice = this.mockPrices[symbol] || 1.0;
    const volatility = config.priceOracle.volatilityRange[symbol];
    
    if (!volatility) {
      return basePrice;
    }

    // Simulate price volatility
    const randomFactor = Math.random() * (volatility.max - volatility.min) + volatility.min;
    const newPrice = basePrice * randomFactor;
    
    // Update mock price with some persistence
    this.mockPrices[symbol] = newPrice;
    
    // Store in price history
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    
    this.priceHistory.get(symbol).push({
      price: newPrice,
      timestamp: Date.now(),
    });

    // Keep only last 100 price points
    if (this.priceHistory.get(symbol).length > 100) {
      this.priceHistory.get(symbol).shift();
    }

    return newPrice;
  }

  async getRealPrice(symbol, chain = null) {
    // This would integrate with real price APIs like CoinGecko, CoinMarketCap, etc.
    // For now, we'll use a mock implementation that simulates real API calls
    
    const cacheKey = `${symbol}_${chain || 'default'}`;
    const now = Date.now();
    const lastUpdate = this.lastUpdate.get(cacheKey) || 0;
    
    // Cache prices for 30 seconds
    if (now - lastUpdate < 30000 && this.prices.has(cacheKey)) {
      return this.prices.get(cacheKey);
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // For demonstration, we'll use mock prices with more realistic volatility
    const basePrice = this.mockPrices[symbol] || 1.0;
    const volatility = config.priceOracle.volatilityRange[symbol];
    
    let newPrice = basePrice;
    if (volatility) {
      const randomFactor = Math.random() * (volatility.max - volatility.min) + volatility.min;
      newPrice = basePrice * randomFactor;
    }

    // Update cache
    this.prices.set(cacheKey, newPrice);
    this.lastUpdate.set(cacheKey, now);

    return newPrice;
  }

  async getAllPrices() {
    const prices = {};
    for (const symbol of Object.keys(config.tokens)) {
      prices[symbol] = await this.getPrice(symbol);
    }
    return prices;
  }

  getPriceHistory(symbol, minutes = 60) {
    const history = this.priceHistory.get(symbol) || [];
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return history.filter(entry => entry.timestamp >= cutoff);
  }

  calculatePriceChange(symbol, minutes = 60) {
    const history = this.getPriceHistory(symbol, minutes);
    if (history.length < 2) return 0;

    const oldest = history[0].price;
    const newest = history[history.length - 1].price;
    return ((newest - oldest) / oldest) * 100;
  }

  detectTrend(symbol, minutes = 30) {
    const history = this.getPriceHistory(symbol, minutes);
    if (history.length < 10) return 'neutral';

    const recent = history.slice(-10);
    const prices = recent.map(entry => entry.price);
    
    // Simple trend detection using linear regression
    const n = prices.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = prices.reduce((sum, price) => sum + price, 0);
    const sumXY = prices.reduce((sum, price, i) => sum + (i * price), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    if (slope > 0.001) return 'upward';
    if (slope < -0.001) return 'downward';
    return 'neutral';
  }

  async updatePrices() {
    const prices = await this.getAllPrices();
    this.prices = new Map(Object.entries(prices));
    return prices;
  }
}

export default PriceOracle; 