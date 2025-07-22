import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

console.log("⏳  Submitting trade to Recall sandbox …");

// Using Solana tokens as per documentation
fetch("https://api.sandbox.competitions.recall.network/api/trade/execute", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RECALL_SANDBOX_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "fromToken": "So11111111111111111111111111111111111111112", // SOL
      "toToken": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
      "amount": "1.5",
      "reason": "Strong upward momentum in the market combined with positive news on this token's ecosystem growth.",
      "slippageTolerance": "0.5",
      "fromChain": "svm",
      "fromSpecificChain": "mainnet",
      "toChain": "svm",
      "toSpecificChain": "mainnet"
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