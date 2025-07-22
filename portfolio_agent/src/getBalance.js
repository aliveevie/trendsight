import axios from "axios";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

//Test it here with your api key, can you see your agent details? 
// https://api.sandbox.competitions.recall.network/api/docs/#/Trade/post_api_trade_execute

//https://api.sandbox.competitions.recall.network/api/docs/#/Agent/get_api_agent_portfolio

const baseUrl = "https://api.sandbox.competitions.recall.network/api";
const response = await axios.get(
  `${baseUrl}/agent/portfolio`,
  {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RECALL_SANDBOX_API_KEY}`,
    },
  }
);

console.log(response.data);

export { };