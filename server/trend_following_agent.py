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
        
        # Token addresses
        self.tokens = {
            "USDC": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
            "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
            "WBTC": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
        }
        
        # Trading parameters
        self.position_size = "100"  # USDC amount per trade
        self.trend_threshold = 0.02  # 2% price change threshold
        
    def get_market_data(self, symbol: str, days: int = 7) -> dict:
        """Get historical price data for trend analysis"""
        try:
            # Using CoinGecko API for price data
            url = f"https://api.coingecko.com/api/v3/coins/{symbol}/market_chart"
            params = {
                "vs_currency": "usd",
                "days": days
            }
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching market data: {e}")
            return None
    
    def analyze_trend(self, symbol: str) -> dict:
        """Analyze market trend using price data"""
        market_data = self.get_market_data(symbol)
        if not market_data:
            return {"trend": "neutral", "confidence": 0, "reason": "No data available"}
        
        prices = [price[1] for price in market_data['prices']]
        
        # Calculate trend indicators
        current_price = prices[-1]
        week_ago_price = prices[0]
        price_change = (current_price - week_ago_price) / week_ago_price
        
        # Calculate moving averages
        short_ma = sum(prices[-3:]) / 3  # 3-day MA
        long_ma = sum(prices[-7:]) / 7   # 7-day MA
        
        # Determine trend
        if price_change > self.trend_threshold and short_ma > long_ma:
            trend = "bullish"
            confidence = min(abs(price_change) * 100, 95)
        elif price_change < -self.trend_threshold and short_ma < long_ma:
            trend = "bearish"
            confidence = min(abs(price_change) * 100, 95)
        else:
            trend = "neutral"
            confidence = 50
        
        return {
            "trend": trend,
            "confidence": confidence,
            "price_change": price_change,
            "current_price": current_price,
            "reason": f"Price change: {price_change:.2%}, MA comparison: {short_ma:.2f} vs {long_ma:.2f}"
        }
    
    def execute_trend_trade(self, symbol: str, trend_analysis: dict) -> dict:
        """Execute trade based on trend analysis using Gaia AI"""
        
        # Map symbol to token address
        symbol_to_token = {
            "ethereum": "WETH",
            "bitcoin": "WBTC",
            "wrapped-bitcoin": "WBTC"
        }
        
        target_token = symbol_to_token.get(symbol, "WETH")
        
        # Create trading instruction based on trend
        if trend_analysis["trend"] == "bullish" and trend_analysis["confidence"] > 70:
            instruction = f"Based on bullish trend analysis (confidence: {trend_analysis['confidence']:.1f}%), execute a trade to buy {target_token} with {self.position_size} USDC. Trend reason: {trend_analysis['reason']}"
            from_token = self.tokens["USDC"]
            to_token = self.tokens[target_token]
        elif trend_analysis["trend"] == "bearish" and trend_analysis["confidence"] > 70:
            instruction = f"Based on bearish trend analysis (confidence: {trend_analysis['confidence']:.1f}%), execute a trade to sell {target_token} for USDC. Trend reason: {trend_analysis['reason']}"
            from_token = self.tokens[target_token]
            to_token = self.tokens["USDC"]
        else:
            return {"action": "hold", "reason": f"Trend is {trend_analysis['trend']} with low confidence ({trend_analysis['confidence']:.1f}%)"}
        
        # Execute trade using Gaia AI
        messages = [{
            "role": "user",
            "content": instruction
        }]
        
        tools = [{
            "type": "function",
            "function": {
                "name": "recall_trade_tool",
                "description": "Executes a token trade using the Recall API on Ethereum Mainnet",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "fromToken": {"type": "string", "description": "ERC-20 token address to trade from"},
                        "toToken": {"type": "string", "description": "ERC-20 token address to trade to"},
                        "amount": {"type": "string", "description": "Amount of the fromToken to trade"},
                        "reason": {"type": "string", "description": "Reason for making the trade"}
                    },
                    "required": ["fromToken", "toToken", "amount", "reason"]
                }
            }
        }]
        
        try:
            response = self.client.chat.completions.create(
                model="Qwen3-235B-A22B-Q4_K_M",
                messages=messages,
                tools=tools,
                tool_choice="auto"
            )
            
            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls
            
            if tool_calls:
                available_functions = {"recall_trade_tool": recall_trade_tool}
                messages.append(response_message)
                
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    function_to_call = available_functions[function_name]
                    function_args = json.loads(tool_call.function.arguments)
                    
                    function_response = function_to_call(
                        fromToken=function_args["fromToken"],
                        toToken=function_args["toToken"],
                        amount=function_args["amount"],
                        reason=function_args["reason"]
                    )
                    
                    messages.append({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": function_name,
                        "content": json.dumps(function_response)
                    })
                
                # Get final response
                second_response = self.client.chat.completions.create(
                    model="gpt-4",
                    messages=messages
                )
                
                return {
                    "action": "trade_executed",
                    "trend": trend_analysis["trend"],
                    "confidence": trend_analysis["confidence"],
                    "result": second_response.choices[0].message.content,
                    "trade_details": function_response
                }
            else:
                return {"action": "no_trade", "reason": "AI decided not to execute trade"}
                
        except Exception as e:
            return {"action": "error", "error": str(e)}
    
    def run_trend_analysis(self, symbols: list = None):
        """Run trend analysis and execute trades for given symbols"""
        if symbols is None:
            symbols = ["ethereum", "bitcoin"]
        
        print(f"🔄 Starting trend analysis at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        for symbol in symbols:
            print(f"\n📊 Analyzing {symbol.upper()}...")
            
            # Analyze trend
            trend_analysis = self.analyze_trend(symbol)
            print(f"   Trend: {trend_analysis['trend'].upper()}")
            print(f"   Confidence: {trend_analysis['confidence']:.1f}%")
            print(f"   Reason: {trend_analysis['reason']}")
            
            # Execute trade if conditions are met
            if trend_analysis["confidence"] > 70:
                print(f"   🚀 Executing trade based on {trend_analysis['trend']} trend...")
                result = self.execute_trend_trade(symbol, trend_analysis)
                print(f"   Result: {result}")
            else:
                print(f"   ⏸️  Holding position (low confidence)")
            
            time.sleep(2)  # Rate limiting
        
        print(f"\n✅ Trend analysis completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    # Initialize the trend following agent
    agent = TrendFollowingAgent()
    
    # Run trend analysis on major cryptocurrencies
    symbols = ["ethereum", "bitcoin"]
    agent.run_trend_analysis(symbols)

if __name__ == "__main__":
    main() 