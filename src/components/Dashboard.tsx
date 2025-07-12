import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from './AgentAvatar';
import { TrendAnalysis } from './TrendAnalysis';
import { Activity, DollarSign, TrendingUp, Users, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getDashboardStats } from '@/lib/api';

export const Dashboard = () => {
  const [agentStatus, setAgentStatus] = useState<'idle' | 'analyzing' | 'trading' | 'complete'>('idle');
  const [currentAction, setCurrentAction] = useState('Monitoring markets...');
  const [confidence, setConfidence] = useState(0);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Trading Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor your AI-powered crypto trading performance in real-time
        </p>
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

      {/* Recent Activity (remains hardcoded for now) */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* You can make this dynamic as well if your API provides activity data */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/30 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Sample Activity</p>
                  <p className="text-sm text-muted-foreground">$0.00</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">$0.00</p>
                <p className="text-sm text-muted-foreground">Just now</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};