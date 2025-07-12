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