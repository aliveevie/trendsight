from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import List, Optional
from trend_following_agent import TrendFollowingAgent

app = FastAPI()
agent = TrendFollowingAgent()

class TrendRequest(BaseModel):
    symbols: Optional[List[str]] = None

@app.post("/run-trend-analysis")
def run_trend_analysis(request: TrendRequest):
    symbols = request.symbols or ["ethereum", "bitcoin"]
    # Capture output
    import io, sys
    old_stdout = sys.stdout
    sys.stdout = mystdout = io.StringIO()
    agent.run_trend_analysis(symbols)
    sys.stdout = old_stdout
    output = mystdout.getvalue()
    return {"output": output}

@app.get("/")
def root():
    return {"message": "Trend Following Agent API is running."} 