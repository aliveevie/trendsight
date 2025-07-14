const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8084';

export async function runTrendAnalysis(symbols?: string[]) {
  const res = await fetch(`${BASE_URL}/run-trend-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error('Failed to fetch trend analysis');
  const data = await res.json();
  return data.trends;
}

export async function getDashboardStats() {
  const res = await fetch(`${BASE_URL}/dashboard-stats`);
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function executeTrade({ fromToken, toToken, amount, reason }: { fromToken: string, toToken: string, amount: string, reason: string }) {
  // Call the local backend /trade endpoint to avoid CORS issues
  const res = await fetch(`${BASE_URL}/trade`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fromToken, toToken, amount, reason })
  });
  if (!res.ok) throw new Error('Failed to execute trade');
  return res.json();
} 