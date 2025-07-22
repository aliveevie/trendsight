# Portfolio Manager for Recall Competition

A self-rebalancing portfolio manager that runs on Recall Network, maintains target allocations, and optionally uses OpenAI to tune weights over time.

## Features

- 📊 **Automatic Rebalancing**: Maintains target portfolio weights with 2% drift threshold
- 🤖 **AI-Powered Adjustments**: Optional GPT-4o integration for dynamic weight tuning
- ⏰ **Scheduled Execution**: Runs daily at 9:00 AM local time
- 💰 **Multi-Token Support**: USDC, WETH, WBTC with mainnet addresses
- 🔄 **Real-time Pricing**: Live prices from CoinGecko API
- 🛡️ **Error Handling**: Robust error handling and logging

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   Create a `.env` file in the portfolio_agent directory:
   ```
   RECALL_SANDBOX_API_KEY=57f3236691e652e4_5dd73dc0ea97b21e
   OPENAI_API_KEY=sk_live_xxx  # optional
   ```

3. **Fund Your Sandbox Wallet**:
   - Use the Recall dashboard faucet to get test funds
   - The sandbox forks Ethereum mainnet, so mainnet token addresses work

## Configuration

### Portfolio Weights
Edit `portfolio_config.json` to set your target allocations:
```json
{
  "USDC": 0.25,
  "WETH": 0.50,
  "WBTC": 0.25
}
```

### Settings
- **DRIFT_THRESHOLD**: 2% (rebalance when allocation drifts beyond this)
- **REB_TIME**: "09:00" (daily rebalancing time)
- **Tokens**: USDC, WETH, WBTC with mainnet addresses

## Usage

### Run the Manager
```bash
python agent.py
```

### Expected Output
```
🚀 Starting portfolio manager… (Ctrl-C to quit)
⏰ Scheduled rebalancing at 09:00 daily
🎯 Drift threshold: 2.0%
🔄 Starting portfolio rebalance...
📊 Target allocation: {'USDC': 0.25, 'WETH': 0.5, 'WBTC': 0.25}
💰 Current prices: {'USDC': 1.0, 'WETH': 2500.0, 'WBTC': 45000.0}
💼 Current holdings: {'USDC': 1000.0, 'WETH': 0.5, 'WBTC': 0.01}
📈 Executing 2 trades...
Executed {'symbol': 'WETH', 'side': 'sell', 'amount': 0.0543} → success
Executed {'symbol': 'WBTC', 'side': 'buy', 'amount': 0.0021} → success
🎯 Rebalance complete.
```

## Architecture

### Core Components
1. **Configuration Management**: Loads targets from JSON, handles environment variables
2. **Market Data**: Fetches prices from CoinGecko, balances from Recall
3. **Trading Logic**: Computes optimal trades to reach target weights
4. **AI Integration**: Optional GPT-4o for dynamic weight adjustments
5. **Scheduler**: Daily execution with error handling

### Trading Strategy
- Calculates current vs target portfolio values
- Identifies overweight/underweight positions
- Executes sells first to fund buys
- Uses USDC as the base trading pair

## Deployment

### Local Development
```bash
python agent.py
```

### Production Deployment
- **Systemd Service**: Create a systemd service for 24/7 operation
- **Docker**: Containerize for easy deployment
- **Cloud Functions**: Deploy as serverless function
- **GitHub Actions**: Run on schedule with GitHub Actions

## Monitoring

The agent provides detailed logging:
- Portfolio status and drift calculations
- Trade execution results
- Error messages and recovery attempts
- AI adjustment suggestions

## Security

- API keys stored in environment variables
- No hardcoded credentials
- Error handling prevents sensitive data exposure
- Sandbox environment for safe testing

## Troubleshooting

### Common Issues
1. **No balances found**: Fund your sandbox wallet first
2. **API errors**: Check your Recall API key and network connectivity
3. **Price fetch failures**: CoinGecko API may be rate-limited
4. **AI errors**: OpenAI key may be invalid or quota exceeded

### Debug Mode
Add debug logging by modifying the print statements in the code.

## License

This project is for educational and competition purposes. Use at your own risk. 