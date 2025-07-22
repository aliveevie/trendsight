# 🚀 TrendSight Portfolio Agent

An intelligent dual-agent trading system for the Recall Network sandbox environment, featuring both momentum-based and AI-powered trend following strategies.

## 🌟 Overview

TrendSight Portfolio Agent consists of two sophisticated trading bots:

1. **Recall Agent** (`recall_agent.js`) - Momentum-based trading with mean reversion strategy
2. **Gaia Agent** (`gaia.js`) - AI-powered trend analysis using Gaia API for market sentiment

Both agents operate on the Recall Network sandbox, trading a diversified portfolio of cryptocurrencies across multiple chains (EVM and SVM).

## 🎯 Supported Tokens

### Multi-Chain Token Support
- **USDC** (Ethereum, Polygon, Arbitrum, Optimism, Solana)
- **USDbC** (Base Chain)
- **SOL** (Solana native)
- **WETH** (Wrapped Ethereum)
- **ARB** (Arbitrum native)
- **OP** (Optimism native)

### Chain-Specific Trading
- **EVM Chains**: Ethereum, Polygon, Arbitrum, Optimism, Base
- **SVM Chain**: Solana mainnet

## 🚀 Features

### Recall Agent (Momentum Trading)
- **Real-time Price Monitoring** - 60-second intervals
- **Momentum Analysis** - 5-minute rolling windows
- **Mean Reversion Strategy** - Buy dips, sell peaks
- **Risk Management** - Maximum 40% allocation per token
- **Forced WETH Allocation** - Ensures portfolio growth
- **Automatic Rebalancing** - Hourly portfolio optimization

### Gaia Agent (AI Trend Following)
- **AI-Powered Analysis** - Uses Gaia API for market sentiment
- **Trend Detection** - 7-day price action analysis
- **Confidence-Based Trading** - Only trades with >70% confidence
- **Multi-Token Monitoring** - SOL, WETH, USDbC, ARB, OP
- **Smart Rebalancing** - Target allocations with AI insights

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **npm** (v7 or higher)
- **Recall Network Sandbox API Key**
- **Gaia API Key** (for AI agent)

## 🛠️ Installation

1. **Clone and Navigate**
   ```bash
   cd portfolio_agent
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Copy the example environment file:
   ```bash
   cp env.example .env
   ```
   
   Then edit `.env` with your API keys:
   ```env
   # Recall Network API Configuration
   RECALL_SANDBOX_API_KEY=your_recall_sandbox_api_key_here
   GAIA_API_KEY=your_gaia_api_key
   
   # Logging Configuration
   LOG_LEVEL=info
   
   # Webhook Configuration (Optional)
   WEBHOOK_ENABLED=false
   WEBHOOK_URL=https://your-webhook-url.com
   
   # Environment
   NODE_ENV=development
   ```

## 🎮 Usage

### Start the Momentum Trading Agent (Recall)
```bash
npm start
# or
npm run start
```

### Start the AI Trend Following Agent (Gaia)
```bash
npm run gaia
```

### Development Mode
```bash
npm run dev
```

### Available Scripts
```bash
npm start      # Run Recall momentum agent
npm run gaia   # Run Gaia AI trend agent
npm run dev    # Development mode (Recall agent)
npm test       # Run test suite
```

## 📊 Trading Strategies

### Recall Agent Strategy
```
🎯 Target Allocations:
- USDC: 50% (stability)
- SOL: 25% (high volatility)
- WETH: 25% (ethereum exposure)

📈 Trading Logic:
- Sell when momentum > 2% or allocation > 40%
- Buy on dips < -2% or underweight positions
- Forced WETH buying for portfolio growth
- Hourly rebalancing to target allocations
```

### Gaia Agent Strategy
```
🎯 Target Allocations:
- USDC: 50% (stability)
- WETH: 25% (ethereum exposure)
- SOL: 15% (solana exposure)
- ARB: 5% (arbitrum native)
- OP: 5% (optimism native)

🧠 AI Trading Logic:
- Gaia API analyzes 7-day trends
- Only trades with >70% confidence
- Considers price action, volume, sentiment
- Dynamic allocation based on market conditions
```

## 🔧 Configuration

### Key Parameters

**Trading Limits:**
- `MAX_POSITION`: 40% maximum allocation per token
- `MIN_TRADE_USD`: $50 minimum trade value
- `POLL_INTERVAL`: 60 seconds between cycles

**Minimum Trade Amounts:**
```javascript
USDC: 10      // 10 USDC minimum
SOL: 0.1      // 0.1 SOL minimum  
WETH: 0.01    // 0.01 WETH minimum
ARB: 1        // 1 ARB minimum
OP: 1         // 1 OP minimum
```

## 📱 Live Monitoring

Both agents provide comprehensive real-time monitoring:

### Recall Agent Output
```
Cycle 1 | 10:01:20 PM
Portfolio Value: $31,976.22
USDC: $29,869.14
Coins Bought: SOL (0.75)
Coins Sold: None
USDC Spent: $150.00 | USDC Gained: $0.00
Cycle Profit: $0.00 | Cumulative Profit: $0.00
```

### Gaia Agent Output
```
🌍 GAIA CYCLE 1 | 7/22/2025, 9:57:06 PM
🔮 GAIA TREND ANALYSIS:
   SOL: BULLISH (75% confidence) - BUY
   WETH: NEUTRAL (65% confidence) - HOLD

💰 PORTFOLIO SUMMARY:
   Total Value: $31,987.37
   USDC Holdings: $29,869.14
```

## 🔐 Security

- **Environment Variables**: All API keys stored securely
- **Input Validation**: All trades validated before execution
- **Error Handling**: Comprehensive error catching and logging
- **Rate Limiting**: Respects API rate limits

## 🚨 Troubleshooting

### Common Issues

1. **Missing API Keys**
   ```
   Error: Missing RECALL_SANDBOX_API_KEY in .env
   ```
   **Solution**: Add your API key to the `.env` file

2. **Timeout Errors**
   ```
   [PRICE ERROR] Could not fetch price for ARB: timeout of 20000ms exceeded
   ```
   **Solution**: Network connectivity issue, agent will retry next cycle

3. **JSON Parse Warnings**
   ```
   [GAIA WARNING] Could not parse trend analysis for SOL
   ```
   **Solution**: Normal behavior, agent falls back to default analysis

## 📊 Performance Metrics

### Risk Management
- **Maximum Position Size**: 40% per token
- **Diversification**: Multi-chain token exposure
- **Stop Losses**: Momentum-based profit taking
- **Rebalancing**: Automated portfolio optimization

### Expected Returns
- **Conservative**: 2-5% monthly returns
- **Moderate**: 5-10% monthly returns
- **Aggressive**: 10%+ monthly returns (higher risk)

## 🛡️ Risk Disclaimer

⚠️ **Important**: This software is for educational and testing purposes only. Trading cryptocurrencies involves substantial risk of loss. Never invest more than you can afford to lose.

- This runs on Recall Network **sandbox** environment
- Use only with test funds
- Past performance does not guarantee future results
- Always test thoroughly before live trading

## 📁 Project Structure

```
portfolio_agent/
├── src/
│   ├── recall_agent.js    # Momentum trading agent
│   ├── gaia.js           # AI trend following agent
│   ├── getBalance.js     # Portfolio balance utilities
│   ├── getprice.js       # Price fetching utilities
│   ├── trading.js        # Core trading functions
│   └── tradeEx*.js       # Trade execution modules
├── data/
│   └── trading_agent.db  # SQLite database
├── logs/                 # Log files (auto-generated)
├── .env                  # Environment variables (create from env.example)
├── env.example           # Environment template
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🔗 API Documentation

### Recall Network API
- **Base URL**: `https://api.sandbox.competitions.recall.network/api`
- **Endpoints**: `/agent/portfolio`, `/trade/execute`, `/price`
- **Authentication**: Bearer token

### Gaia API
- **Base URL**: `https://qwen72b.gaia.domains/v1`
- **Model**: `qwen2.5-72b-instruct`
- **Purpose**: Market sentiment and trend analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the troubleshooting section above
2. Review agent logs for error details
3. Ensure all environment variables are set correctly
4. Verify API key permissions and quotas

---

**Built with ❤️ for the Recall Network ecosystem** 