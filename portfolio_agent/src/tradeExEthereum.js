import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

console.log("⏳  Submitting Ethereum trade to Recall sandbox …");

// Using Ethereum tokens (matching the working Python configuration)
fetch("https://api.sandbox.competitions.recall.network/api/trade/execute", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RECALL_SANDBOX_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "fromToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      "toToken": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      "amount": "100",
      "reason": "Quick-start verification trade"
    })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    if (data.success) {
      console.log("✅  Trade executed:", data);
      console.log(`📊  Trade Details:`);
      console.log(`   From: ${data.transaction.fromAmount} ${data.transaction.fromTokenSymbol}`);
      console.log(`   To: ${data.transaction.toAmount} ${data.transaction.toTokenSymbol}`);
      console.log(`   Price: $${data.transaction.price}`);
      console.log(`   Trade Value: $${data.transaction.tradeAmountUsd}`);
      console.log(`   Transaction ID: ${data.transaction.id}`);
      console.log(`   Timestamp: ${data.transaction.timestamp}`);
    } else {
      console.log("❌  Error:", data.error);
    }
  })
  .catch(error => {
    console.log("❌  Error:", error.message);
  }); 