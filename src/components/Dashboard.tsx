import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from './AgentAvatar';
import { TrendAnalysis } from './TrendAnalysis';
import { Activity, DollarSign, TrendingUp, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getDashboardStats } from '@/lib/api';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { executeTrade } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export const Dashboard = () => {
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'trading' | 'complete'>('idle');
  const [currentAction, setCurrentAction] = useState('Monitoring markets...');
  const [confidence, setConfidence] = useState(0);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [tradeInput, setTradeInput] = useState({ fromToken: '', toToken: '', amount: '100', reason: '' });
  const [tradeLoading, setTradeLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const data = await getDashboardStats();
        setPortfolio(data.portfolio);
      } catch (err) {
        setError('Failed to fetch dashboard stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Example: extract total value (adjust as per actual API response)
  const totalValue = portfolio?.totalValueUSD || portfolio?.total_value_usd || 0;

  // Fetch today's profit/earnings (example, adjust as per your API)
  const todayProfit = portfolio?.todayProfit || portfolio?.today_profit || 0;
  const todayEarnings = portfolio?.todayEarnings || portfolio?.today_earnings || 0;

  const stats = [
    {
      title: "Total Portfolio",
      value: totalValue ? `$${Number(totalValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--',
      change: portfolio?.change || '--',
      positive: (portfolio?.change || '').toString().startsWith('+'),
      icon: DollarSign
    },
    // You can add more stats here as your API provides them
  ];

  stats.push({
    title: "Today's Profit",
    value: todayProfit ? `$${Number(todayProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--',
    change: '',
    positive: todayProfit >= 0,
    icon: TrendingUp
  });
  stats.push({
    title: "Today's Earnings",
    value: todayEarnings ? `$${Number(todayEarnings).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '--',
    change: '',
    positive: todayEarnings >= 0,
    icon: Users
  });

  const recentActivity = [
    {
      type: 'trade',
      action: 'BUY ETH',
      amount: '$500.00',
      time: '2 mins ago',
      status: 'completed',
      price: '$2,456.78'
    },
    {
      type: 'analysis',
      action: 'Trend Analysis',
      amount: 'BTC, ETH',
      time: '5 mins ago',
      status: 'completed',
      price: 'Bullish signals detected'
    },
    {
      type: 'trade',
      action: 'SELL BTC',
      amount: '$750.00',
      time: '12 mins ago',
      status: 'completed',
      price: '$43,567.21'
    }
  ];

  const handleStatusChange = (status: 'idle' | 'analyzing' | 'trading' | 'complete') => {
    setAgentStatus(status);
  };

  const handleAnalysisUpdate = (action: string, confidenceLevel: number) => {
    setCurrentAction(action);
    setConfidence(confidenceLevel);
  };

  // Handle trade execution
  const handleTrade = async () => {
    setTradeLoading(true);
    try {
      const result = await executeTrade(tradeInput);
      setTradeHistory([{ ...tradeInput, result, time: new Date().toLocaleTimeString() }, ...tradeHistory]);
      toast({ title: 'Trade Executed', description: 'Your trade was successful!' });
      setTradeDialogOpen(false);
    } catch (err) {
      toast({ title: 'Trade Failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setTradeLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Trading Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor your AI-powered crypto trading performance in real-time
            </p>
          </div>
          <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
            <DialogTrigger asChild>
              <button className="bg-gradient-primary px-4 py-2 rounded text-white font-semibold shadow hover:opacity-90 transition-all">Trade</button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>AI Trading Assistant</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Token</label>
                  <input type="text" className="input input-bordered w-full" value={tradeInput.fromToken} onChange={e => setTradeInput({ ...tradeInput, fromToken: e.target.value })} placeholder="e.g. eth" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To Token</label>
                  <input type="text" className="input input-bordered w-full" value={tradeInput.toToken} onChange={e => setTradeInput({ ...tradeInput, toToken: e.target.value })} placeholder="e.g. wbtc" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input type="number" className="input input-bordered w-full" value={tradeInput.amount} onChange={e => setTradeInput({ ...tradeInput, amount: e.target.value })} min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                  <input type="text" className="input input-bordered w-full" value={tradeInput.reason} onChange={e => setTradeInput({ ...tradeInput, reason: e.target.value })} placeholder="e.g. AI signal, trend, etc." />
                </div>
              </div>
              <DialogFooter>
                <button className="bg-gradient-primary px-4 py-2 rounded text-white font-semibold shadow hover:opacity-90 transition-all" onClick={handleTrade} disabled={tradeLoading}>
                  {tradeLoading ? 'Trading...' : 'Execute Trade'}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-4 text-center text-muted-foreground">Loading portfolio...</div>
        ) : error ? (
          <div className="col-span-4 text-center text-red-500">{error}</div>
        ) : (
          stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card 
                key={stat.title} 
                className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-card animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{stat.title}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <Badge 
                      variant="outline"
                      className={stat.positive 
                        ? "bg-success/20 text-success border-success/30" 
                        : "bg-destructive/20 text-destructive border-destructive/30"
                      }
                    >
                      {stat.change}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Status */}
        <div className="lg:col-span-1">
          <AgentAvatar 
            isAnalyzing={agentStatus === 'analyzing'}
            status={agentStatus}
            confidence={confidence}
            currentAction={currentAction}
          />
        </div>

        {/* Trend Analysis */}
        <div className="lg:col-span-2">
          <TrendAnalysis 
            onStatusChange={setAgentStatus}
            onAnalysisUpdate={(action, conf) => {
              setCurrentAction(action);
              setConfidence(conf);
            }}
          />
        </div>
      </div>

      {/* Recent Activity (AI Trading Feed) */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>AI Trading Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tradeHistory.length === 0 ? (
              <div className="text-muted-foreground">No trades yet. Use the Trade button above to start trading!</div>
            ) : (
              tradeHistory.map((trade, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30 animate-fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{trade.fromToken} → {trade.toToken}</p>
                      <p className="text-sm text-muted-foreground">{trade.amount} | {trade.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{trade.result?.status || 'Success'}</p>
                    <p className="text-sm text-muted-foreground">{trade.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};