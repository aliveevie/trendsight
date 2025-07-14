from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from trend_following_agent import TrendFollowingAgent
from recall_tool import get_portfolio, recall_trade_tool, get_balances, get_trading_history

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://trendsight-server.onrender.com", "https://trendsight.vercel.app", "https://api.sandbox.competitions.recall.network/api/trade/execute"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

agent = TrendFollowingAgent()

class TrendRequest(BaseModel):
    symbols: Optional[List[str]] = None

class TradeRequest(BaseModel):
    fromToken: str
    toToken: str
    amount: str
    reason: Optional[str] = None

# Supported tokens for trend analysis (no stablecoins, only supported tokens)
DEFAULT_TOKENS = [
    "eth", "weth", "wbtc", "arbitrum", "optimism"
]

@app.post("/run-trend-analysis")
def run_trend_analysis(request: TrendRequest):
    symbols = request.symbols or DEFAULT_TOKENS
    trends = agent.run_trend_analysis(symbols)
    return {"trends": trends}

@app.get("/dashboard-stats")
def dashboard_stats():
    portfolio = get_portfolio()
    return {"portfolio": portfolio}

@app.post("/trade")
def trade(request: TradeRequest):
    result = recall_trade_tool(request.fromToken, request.toToken, request.amount, request.reason or "AI trading action")
    return {"result": result}

@app.get("/balances")
def balances():
    return {"balances": get_balances()}

@app.get("/trading-history")
def trading_history():
    return {"history": get_trading_history()}

@app.get("/")
def root():
    return {"message": "Trend Following Agent API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("trend_following_server:app", host="0.0.0.0", port=8084, reload=True) 