from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from trend_following_agent import TrendFollowingAgent

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://trendsight-server.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"]
)

agent = TrendFollowingAgent()

class TrendRequest(BaseModel):
    symbols: Optional[List[str]] = None

@app.post("/run-trend-analysis")
def run_trend_analysis(request: TrendRequest):
    symbols = request.symbols or ["ethereum", "bitcoin"]
    trends = agent.run_trend_analysis(symbols)
    return {"trends": trends}

@app.get("/")
def root():
    return {"message": "Trend Following Agent API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("trend_following_server:app", host="0.0.0.0", port=8084, reload=True) 