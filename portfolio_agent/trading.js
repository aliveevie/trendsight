import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const baseUrl = "https://api.sandbox.competitions.recall.network/api";

// Function to execute a trade
export async function executeTrade(symbol, side, quantity, price = null) {
  try {
    const tradeData = {
      symbol,
      side, // 'buy' or 'sell'
      quantity: parseFloat(quantity),
      ...(price && { price: parseFloat(price) })
    };

    const response = await axios.post(
      `${baseUrl}/trade/execute`,
      tradeData,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RECALL_SANDBOX_API_KEY}`,
        },
      }
    );

    console.log("Trade executed:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error executing trade:", error.response?.data || error.message);
    throw error;
  }
}

// Function to get current portfolio
export async function getPortfolio() {
  try {
    const response = await axios.get(
      `${baseUrl}/agent/portfolio`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RECALL_SANDBOX_API_KEY}`,
        },
      }
    );

    console.log("Portfolio data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error getting portfolio:", error.response?.data || error.message);
    throw error;
  }
}

// Test the functions
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Testing trading functions...");
  
  // Test portfolio retrieval
  try {
    await getPortfolio();
  } catch (error) {
    console.error("Portfolio test failed:", error.message);
  }
}
