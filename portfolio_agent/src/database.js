import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";
import config from "./config.js";

class Database {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  async init() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(config.database.path);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = await open({
        filename: config.database.path,
        driver: sqlite3.Database,
      });

      await this.createTables();
      this.initialized = true;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  async createTables() {
    // Portfolio snapshots
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS portfolio_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_value_usdc REAL,
        snapshot_data TEXT
      )
    `);

    // Price history
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        symbol TEXT NOT NULL,
        price_usdc REAL NOT NULL,
        chain TEXT
      )
    `);

    // Trades
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS trades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        symbol TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        price_usdc REAL NOT NULL,
        total_usdc REAL NOT NULL,
        profit_loss REAL DEFAULT 0,
        trade_id TEXT,
        status TEXT DEFAULT 'executed'
      )
    `);

    // Profit tracking
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS profit_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_usdc REAL NOT NULL,
        profit_loss_usdc REAL NOT NULL,
        profit_percentage REAL NOT NULL,
        daily_profit_usdc REAL DEFAULT 0
      )
    `);

    // Agent state
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_price_history_symbol_timestamp 
      ON price_history(symbol, timestamp)
    `);

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_trades_timestamp 
      ON trades(timestamp)
    `);

    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_profit_tracking_timestamp 
      ON profit_tracking(timestamp)
    `);
  }

  async savePortfolioSnapshot(snapshotData, totalValueUsdc) {
    const stmt = await this.db.prepare(`
      INSERT INTO portfolio_snapshots (total_value_usdc, snapshot_data)
      VALUES (?, ?)
    `);
    await stmt.run(totalValueUsdc, JSON.stringify(snapshotData));
    await stmt.finalize();
  }

  async savePrice(symbol, priceUsdc, chain = null) {
    const stmt = await this.db.prepare(`
      INSERT INTO price_history (symbol, price_usdc, chain)
      VALUES (?, ?, ?)
    `);
    await stmt.run(symbol, priceUsdc, chain);
    await stmt.finalize();
  }

  async saveTrade(tradeData) {
    const stmt = await this.db.prepare(`
      INSERT INTO trades (symbol, side, quantity, price_usdc, total_usdc, profit_loss, trade_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await stmt.run(
      tradeData.symbol,
      tradeData.side,
      tradeData.quantity,
      tradeData.priceUsdc,
      tradeData.totalUsdc,
      tradeData.profitLoss || 0,
      tradeData.tradeId || null,
      tradeData.status || 'executed'
    );
    await stmt.finalize();
  }

  async saveProfitCalculation(profitData) {
    const stmt = await this.db.prepare(`
      INSERT INTO profit_tracking (total_usdc, profit_loss_usdc, profit_percentage, daily_profit_usdc)
      VALUES (?, ?, ?, ?)
    `);
    await stmt.run(
      profitData.totalUsdc,
      profitData.profitLossUsdc,
      profitData.profitPercentage,
      profitData.dailyProfitUsdc || 0
    );
    await stmt.finalize();
  }

  async getLatestPrice(symbol) {
    const result = await this.db.get(`
      SELECT price_usdc, timestamp
      FROM price_history
      WHERE symbol = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `, symbol);
    return result;
  }

  async getPriceHistory(symbol, hours = 24) {
    const result = await this.db.all(`
      SELECT price_usdc, timestamp
      FROM price_history
      WHERE symbol = ? AND timestamp >= datetime('now', '-${hours} hours')
      ORDER BY timestamp ASC
    `, symbol);
    return result;
  }

  async getRecentTrades(limit = 50) {
    const result = await this.db.all(`
      SELECT * FROM trades
      ORDER BY timestamp DESC
      LIMIT ?
    `, limit);
    return result;
  }

  async getProfitHistory(hours = 24) {
    const result = await this.db.all(`
      SELECT * FROM profit_tracking
      WHERE timestamp >= datetime('now', '-${hours} hours')
      ORDER BY timestamp ASC
    `);
    return result;
  }

  async getLatestPortfolioSnapshot() {
    const result = await this.db.get(`
      SELECT * FROM portfolio_snapshots
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    return result;
  }

  async setAgentState(key, value) {
    const stmt = await this.db.prepare(`
      INSERT OR REPLACE INTO agent_state (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    await stmt.run(key, JSON.stringify(value));
    await stmt.finalize();
  }

  async getAgentState(key) {
    const result = await this.db.get(`
      SELECT value FROM agent_state WHERE key = ?
    `, key);
    return result ? JSON.parse(result.value) : null;
  }

  async cleanupOldData() {
    // Clean up old price history (keep last 7 days)
    await this.db.run(`
      DELETE FROM price_history
      WHERE timestamp < datetime('now', '-7 days')
    `);

    // Clean up old profit tracking (keep last 30 days)
    await this.db.run(`
      DELETE FROM profit_tracking
      WHERE timestamp < datetime('now', '-30 days')
    `);

    // Clean up old portfolio snapshots (keep last 7 days)
    await this.db.run(`
      DELETE FROM portfolio_snapshots
      WHERE timestamp < datetime('now', '-7 days')
    `);
  }

  async close() {
    if (this.db) {
      await this.db.close();
    }
  }
}

export default Database; 