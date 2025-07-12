import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("RECALL_API_KEY")
RECALL_API_URL = "https://api.sandbox.competitions.recall.network/api/trade/execute"

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