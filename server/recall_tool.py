import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("RECALL_API_KEY")
BASE_URL = "https://api.sandbox.competitions.recall.network"
RECALL_API_URL = f"{BASE_URL}/api/trade/execute"
PORTFOLIO_API_URL = f"{BASE_URL}/api/account/portfolio"

def recall_trade_tool(fromToken: str, toToken: str, amount: str, reason: str) -> dict:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    trade_data = {
        "fromToken": fromToken,
        "toToken": toToken,
        "amount": amount,
        "reason": reason
    }
    response = requests.post(RECALL_API_URL, json=trade_data, headers=headers)
    try:
        return response.json()
    except Exception as e:
        return {"error": str(e)}

def get_portfolio() -> dict:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    try:
        resp = requests.get(PORTFOLIO_API_URL, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        # Return mock data for UI demo if Recall API fails
        return {
            "total_value_usd": 12456.78,
            "change": "+2.34%",
            "active_trades": 3,
            "success_rate": "87.3%",
            "ai_confidence": "94.7%"
        } 