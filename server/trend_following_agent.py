import os
import json
import requests
import time
from datetime import datetime, timedelta
from openai import OpenAI
from dotenv import load_dotenv
from recall_tool import recall_trade_tool

load_dotenv()

class TrendFollowingAgent:
    def __init__(self, gaia_api_key: str = None):
        self.gaia_api_key = gaia_api_key or "gaia-NzVjMDA0YmMtYjhkMi00NmRjLTg0ZTYtZTAzNGU0NjkwYzI5-9Qpnx3GHuvvNx-Uo"
        self.client = OpenAI(base_url="https://qwen72b.gaia.domains/v1", api_key=self.gaia_api_key)
        # Supported tokens for trend analysis
        self.tokens = [
            "eth", "weth", "wbtc", "arbitrum", "optimism",
        ]
        # Mapping from token to CoinGecko ID
        self.coingecko_ids = {
            "eth": "ethereum",
            "weth": "weth",
            "wbtc": "wrapped-bitcoin",
            "arbitrum": "arbitrum",
            "optimism": "optimism",
        }
        self.position_size = "100"
        self.trend_threshold = 0.02

    def get_market_data(self, symbol: str, days: int = 7) -> dict:
        coingecko_id = self.coingecko_ids.get(symbol)
        if not coingecko_id:
            return None
        try:
            url = f"https://api.coingecko.com/api/v3/coins/{coingecko_id}/market_chart"
            params = {"vs_currency": "usd", "days": days}
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return None

    def analyze_trend(self, symbol: str) -> dict:
        if symbol not in self.coingecko_ids:
            return {
                "symbol": symbol.upper(),
                "name": symbol.capitalize(),
                "price": 0,
                "change": 0,
                "trend": "neutral",
                "confidence": 0,
                "action": "HOLD",
                "reason": "No native token or price data available for this network."
            }
        market_data = self.get_market_data(symbol)
        if not market_data:
            return {
                "symbol": symbol.upper(),
                "name": symbol.capitalize(),
                "price": 0,
                "change": 0,
                "trend": "neutral",
                "confidence": 0,
                "action": "HOLD",
                "reason": "No data available"
            }
        prices = [price[1] for price in market_data['prices']]
        current_price = prices[-1]
        week_ago_price = prices[0]
        price_change = (current_price - week_ago_price) / week_ago_price
        short_ma = sum(prices[-3:]) / 3
        long_ma = sum(prices[-7:]) / 7
        if price_change > self.trend_threshold and short_ma > long_ma:
            trend = "bullish"
            confidence = min(abs(price_change) * 100, 95)
            action = "BUY Signal"
        elif price_change < -self.trend_threshold and short_ma < long_ma:
            trend = "bearish"
            confidence = min(abs(price_change) * 100, 95)
            action = "SELL Signal"
        else:
            trend = "neutral"
            confidence = 50
            action = "HOLD"
        reason = f"Price change: {price_change:.2%}, MA: {short_ma:.2f} vs {long_ma:.2f}"
        return {
            "symbol": symbol.upper(),
            "name": symbol.capitalize(),
            "price": current_price,
            "change": price_change,
            "trend": trend,
            "confidence": confidence,
            "action": action,
            "reason": reason
        }

    def run_trend_analysis(self, symbols: list = None):
        if symbols is None:
            symbols = self.tokens
        results = []
        for symbol in symbols:
            trend_result = self.analyze_trend(symbol)
            results.append(trend_result)
            time.sleep(1)  # Rate limiting
        return results

def main():
    # Initialize the trend following agent
    agent = TrendFollowingAgent()
    
    # Run trend analysis on major cryptocurrencies
    symbols = ["ethereum", "bitcoin"]
    results = agent.run_trend_analysis(symbols)
    print(json.dumps(results, indent=4))

if __name__ == "__main__":
    main() 