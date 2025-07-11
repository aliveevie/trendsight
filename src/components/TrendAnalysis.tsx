import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Bitcoin, 
  Coins,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface TrendData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  action: string;
  reason: string;
  icon: any;
}

interface TrendAnalysisProps {
  onStatusChange: (status: 'idle' | 'analyzing' | 'trading' | 'complete') => void;
  onAnalysisUpdate: (action: string, confidence: number) => void;
}

export const TrendAnalysis = ({ onStatusChange, onAnalysisUpdate }: TrendAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trends, setTrends] = useState<TrendData[]>([
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 2456.78,
      change: 0.0234,
      trend: 'bullish',
      confidence: 78.5,
      action: 'BUY Signal',
      reason: 'Strong upward momentum with volume confirmation',
      icon: Coins
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 43567.21,
      change: -0.0156,
      trend: 'bearish',
      confidence: 65.2,
      action: 'HOLD',
      reason: 'Consolidating near support levels',
      icon: Bitcoin
    }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    onStatusChange('analyzing');
    onAnalysisUpdate('Fetching market data...', 0);

    // Simulate analysis steps
    const steps = [
      { action: 'Analyzing ETH trends...', delay: 1000, confidence: 25 },
      { action: 'Checking BTC momentum...', delay: 1500, confidence: 50 },
      { action: 'Calculating indicators...', delay: 1200, confidence: 75 },
      { action: 'Generating signals...', delay: 800, confidence: 90 },
      { action: 'Analysis complete!', delay: 500, confidence: 100 }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, step.delay));
      onAnalysisUpdate(step.action, step.confidence);
    }

    // Update trend data with new analysis
    setTrends(prev => prev.map(trend => ({
      ...trend,
      price: trend.price * (1 + (Math.random() - 0.5) * 0.02),
      change: (Math.random() - 0.5) * 0.06,
      confidence: Math.random() * 40 + 60,
      trend: Math.random() > 0.5 ? 'bullish' : Math.random() > 0.3 ? 'bearish' : 'neutral'
    })));

    setIsAnalyzing(false);
    onStatusChange('complete');
    
    setTimeout(() => {
      onStatusChange('idle');
      onAnalysisUpdate('Monitoring markets...', 0);
    }, 2000);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'bullish': return 'bg-success/20 text-success border-success/30';
      case 'bearish': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted/20 text-muted-foreground border-muted/30';
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('BUY')) return 'bg-success/20 text-success border-success/30';
    if (action.includes('SELL')) return 'bg-destructive/20 text-destructive border-destructive/30';
    return 'bg-warning/20 text-warning border-warning/30';
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span>Trend Analysis</span>
          </CardTitle>
          <Button 
            onClick={runAnalysis}
            disabled={isAnalyzing}
            size="sm"
            className="bg-gradient-primary hover:opacity-90"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Analyze
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {trends.map((trend, index) => {
          const Icon = trend.icon;
          return (
            <div 
              key={trend.symbol} 
              className="p-4 rounded-lg border border-border bg-secondary/30 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{trend.symbol}</h4>
                    <p className="text-sm text-muted-foreground">{trend.name}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-mono font-semibold">
                    ${trend.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center space-x-1">
                    {trend.change >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    )}
                    <span className={`text-sm ${trend.change >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {(trend.change * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(trend.trend)}
                    <Badge variant="outline" className={getTrendColor(trend.trend)}>
                      {trend.trend.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <Badge variant="outline" className={getActionColor(trend.action)}>
                    {trend.action}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Confidence</span>
                    <span className="font-medium">{trend.confidence.toFixed(1)}%</span>
                  </div>
                  <Progress value={trend.confidence} className="h-2" />
                </div>

                <p className="text-sm text-muted-foreground italic">
                  {trend.reason}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};