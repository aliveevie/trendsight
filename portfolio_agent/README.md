# Automated Trading Agent for Recall Network

An intelligent automated spot trading agent designed for the Recall Network sandbox environment. The agent monitors token prices in real-time, identifies profit opportunities, and executes trades automatically to maximize USDC returns.

## 🚀 Features

- **Real-time Price Monitoring**: Continuously monitors token prices every minute
- **Profit Detection**: Automatically detects profit opportunities (≥0.5% gain)
- **Smart Trading**: Executes trades when profit thresholds are met
- **Reinvestment Strategy**: Reinvests USDC into volatile tokens during upward trends
- **Portfolio Tracking**: Comprehensive portfolio and profit/loss tracking
- **Database Storage**: SQLite database for persistent data storage
- **Comprehensive Logging**: Winston-based logging with separate trade and error logs
- **CLI Dashboard**: Interactive command-line interface for monitoring
- **Webhook Support**: Optional webhook notifications for external integrations

## 📋 Supported Tokens

- **USDC** (EVM & SVM chains) - Stable coin, 60% target allocation
- **USDbC** (EVM chain) - Stable coin, 20% target allocation  
- **SOL** (SVM chain) - High volatility, 10% target allocation
- **WETH** (EVM chain) - High volatility, 10% target allocation

## 🛠️ Installation

1. **Install Dependencies**:
   ```bash
   cd portfolio_agent
   npm install
   ```

2. **Environment Setup**:
   Create a `.env` file in the parent directory:
   ```env
   RECALL_SANDBOX_API_KEY=your_api_key_here
   LOG_LEVEL=info
   WEBHOOK_ENABLED=false
   WEBHOOK_URL=https://your-webhook-url.com
   ```

3. **Database Setup**:
   The agent will automatically create the SQLite database on first run.

## 🚀 Usage

### Start the Trading Agent
```bash
npm start
```

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Interactive Dashboard
```bash
npm run dashboard
```

### Run Tests
```bash
npm test
```

### CLI Commands
```bash
# Start the agent
node src/agent.js start

# Check status
node src/agent.js status

# Test mode (runs for 5 minutes)
node src/agent.js test
```

## 📊 Configuration

The agent is configured through `src/config.js`. Key settings:

### Trading Parameters
- `profitThreshold`: 0.005 (0.5% minimum profit to trigger trade)
- `reinvestmentAmount`: 100 (USDC amount to reinvest)
- `maxPositionSize`: 0.1 (Maximum 10% of portfolio in single token)
- `minTradeAmount`: 10 (Minimum USDC trade amount)

### Monitoring Intervals
- `priceCheckInterval`: 60000ms (1 minute price checks)
- `profitCalculationInterval`: 3600000ms (1 hour profit calculations)

### Price Oracle
- `type`: "mock" (Use "real" for production with actual price APIs)
- `updateInterval`: 30000ms (30 seconds price updates)

## 📈 Trading Strategy

### Profit Detection
1. **Price Monitoring**: Continuously monitors all token prices
2. **Comparison**: Compares current prices to initial snapshot prices
3. **Threshold Check**: Triggers trade when profit ≥ 0.5%
4. **Optimal Quantity**: Calculates optimal sell quantity based on profit percentage

### Reinvestment Strategy
1. **Trend Analysis**: Analyzes price trends using linear regression
2. **Volatile Token Focus**: Targets SOL and WETH for reinvestment
3. **Upward Trend Detection**: Invests when trend is upward and recent performance is positive
4. **Position Sizing**: Limits reinvestment to 10% of USDC holdings

### Risk Management
- Maximum 10% position size per token
- Minimum trade amount of $10 USDC
- Automatic profit-taking at 0.5% threshold
- Comprehensive logging and monitoring

## 📁 Project Structure

```
portfolio_agent/
├── src/
│   ├── agent.js          # Main agent orchestrator
│   ├── tradingEngine.js  # Core trading logic
│   ├── priceOracle.js    # Price data management
│   ├── recallApi.js      # Recall API client
│   ├── database.js       # Database operations
│   ├── logger.js         # Logging configuration
│   ├── config.js         # Configuration settings
│   ├── dashboard.js      # CLI dashboard
│   └── test.js           # Test suite
├── data/                 # SQLite database files
├── logs/                 # Log files
├── package.json
└── README.md
```

## 📊 Database Schema

### Tables
- `portfolio_snapshots`: Portfolio state snapshots
- `price_history`: Token price history
- `trades`: Executed trades
- `profit_tracking`: Profit/loss calculations
- `agent_state`: Agent state persistence

## 🔧 Development

### Adding New Tokens
1. Update `config.js` with token configuration
2. Add price volatility range
3. Update target allocations

### Integrating Real Price APIs
1. Modify `priceOracle.js` to use real APIs (CoinGecko, CoinMarketCap, etc.)
2. Set `config.priceOracle.type = "real"`
3. Add API keys to environment variables

### Custom Trading Strategies
1. Extend `tradingEngine.js` with new strategy methods
2. Add strategy configuration to `config.js`
3. Implement strategy logic in `checkProfitOpportunities()` or `checkReinvestmentOpportunities()`

## 📝 Logging

The agent uses Winston for comprehensive logging:

- **Main Log**: `logs/trading_agent.log`
- **Error Log**: `logs/error.log`
- **Trade Log**: `logs/trades.log`
- **Console Output**: Colored output in development mode

### Log Levels
- `debug`: Detailed debugging information
- `info`: General information and status updates
- `warn`: Warning messages
- `error`: Error messages and exceptions

## 🔗 API Integration

### Recall Network API
- Portfolio retrieval
- Trade execution
- Balance checking
- Trade history

### Webhook Notifications
- Trade execution events
- Profit calculation events
- Error notifications

## 🧪 Testing

Run the comprehensive test suite:
```bash
npm test
```

Tests cover:
- Database operations
- Price oracle functionality
- API client operations
- Trading engine logic
- Integration scenarios

## 📈 Monitoring

### Dashboard Features
- Real-time portfolio status
- Recent trade history
- Profit/loss tracking
- Agent configuration
- System logs

### Key Metrics
- Total portfolio value
- Daily profit/loss
- Trade success rate
- Position allocations
- Price trends

## 🔒 Security

- API keys stored in environment variables
- No hardcoded credentials
- Input validation for all trades
- Error handling and logging
- Database backup functionality

## 🚨 Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Check `RECALL_SANDBOX_API_KEY` in `.env`
   - Verify network connectivity
   - Check API endpoint availability

2. **Database Errors**
   - Ensure write permissions in `data/` directory
   - Check disk space availability
   - Verify SQLite installation

3. **Price Data Issues**
   - Check price oracle configuration
   - Verify token symbols match configuration
   - Review price volatility settings

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
```

## 📄 License

ISC License

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs in `logs/` directory
3. Run the test suite to verify functionality
4. Create an issue with detailed error information 