import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Bitcoin, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { runTrendAnalysis } from '@/lib/api';

interface TrendData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  action: string;
  reason: string;
}

interface TrendAnalysisProps {
  onStatusChange: (status: 'idle' | 'analyzing' | 'trading' | 'complete') => void;
  onAnalysisUpdate: (action: string, confidence: number) => void;
}

export const TrendAnalysis = ({ onStatusChange, onAnalysisUpdate }: TrendAnalysisProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    onStatusChange('analyzing');
    onAnalysisUpdate('Running analysis...', 0);
    try {
      const result = await runTrendAnalysis();
      setTrends(result);
      onStatusChange('complete');
      onAnalysisUpdate('Analysis complete!', 100);
    } catch (err) {
      setError('Failed to fetch trend analysis');
      onStatusChange('idle');
    } finally {
      setIsAnalyzing(false);
    }
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
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            size="sm"
            className="bg-gradient-primary hover:opacity-90"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Analyze'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-red-500">{error}</div>}
        {isAnalyzing && <div className="text-muted-foreground">Running analysis...</div>}
        {trends.length === 0 && !isAnalyzing && !error && (
          <div className="text-muted-foreground">No trend data yet. Click Analyze to start.</div>
        )}
        {trends.map((trend, index) => (
          <div 
            key={trend.symbol} 
            className="p-4 rounded-lg border border-border bg-secondary/30 animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  {/* Optionally use a crypto icon here */}
                  {trend.symbol === 'BTC' ? <Bitcoin className="h-4 w-4 text-primary-foreground" /> : <Coins className="h-4 w-4 text-primary-foreground" />}
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
        ))}
      </CardContent>
    </Card>
  );
};