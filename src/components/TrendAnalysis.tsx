import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Bitcoin, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { runTrendAnalysis, executeTrade, getBalances, getTradingHistory } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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
  const { toast } = useToast();
  const [tradeLoading, setTradeLoading] = useState<string | null>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState<string | null>(null);
  const [tradeForm, setTradeForm] = useState<{ fromToken: string, toToken: string, side: 'buy' | 'sell' | '', amount: string, reason: string }>({ fromToken: '', toToken: '', side: '', amount: '', reason: '' });
  const [balances, setBalances] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);

  // Fetch balances and trading history on mount
  useEffect(() => {
    getBalances().then(data => setBalances(data.balances || {}));
    getTradingHistory().then(data => setHistory(data.history || []));
  }, []);

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

  const openTradeDialog = (fromToken: string) => {
    setTradeForm({ fromToken, toToken: '', side: '', amount: '', reason: '' });
    setTradeDialogOpen(fromToken);
  };

  const handleTradeDialogChange = (field: string, value: string) => {
    setTradeForm(prev => ({ ...prev, [field]: value }));
    // Auto-set toToken based on side
    if (field === 'side') {
      setTradeForm(prev => ({
        ...prev,
        toToken: value === 'buy' ? fromTokenForBuy(prev.fromToken) : fromTokenForSell(prev.fromToken)
      }));
    }
  };

  const fromTokenForBuy = (fromToken: string) => fromToken === 'weth' ? 'wbtc' : 'weth';
  const fromTokenForSell = (fromToken: string) => fromToken === 'weth' ? 'wbtc' : 'weth';

  const handleTradeDialogSubmit = async () => {
    setTradeLoading(tradeForm.fromToken);
    try {
      const result = await executeTrade({
        fromToken: tradeForm.side === 'buy' ? tradeForm.toToken : tradeForm.fromToken,
        toToken: tradeForm.side === 'buy' ? tradeForm.fromToken : tradeForm.toToken,
        amount: tradeForm.amount,
        reason: tradeForm.reason || 'AI chat trade'
      });
      toast({ title: 'Trade Executed', description: `Traded ${tradeForm.amount} ${tradeForm.fromToken.toUpperCase()} (${tradeForm.side})` });
      setTradeDialogOpen(null);
    } catch (err) {
      toast({ title: 'Trade Failed', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setTradeLoading(null);
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
              <div className="text-right flex flex-col items-end gap-2">
                <p className="font-mono font-semibold">
                  ${trend.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <Dialog open={tradeDialogOpen === trend.symbol.toLowerCase()} onOpenChange={open => setTradeDialogOpen(open ? trend.symbol.toLowerCase() : null)}>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-primary text-white px-3 py-1 rounded shadow"
                    >
                      Trade
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>AI Trading Assistant</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-2 bg-muted/30 rounded text-sm">
                        <strong>Your Balances:</strong>
                        <ul className="mt-1 grid grid-cols-2 gap-2">
                          {Object.entries(balances).map(([token, bal]) => (
                            <li key={token} className="flex justify-between"><span>{token.toUpperCase()}</span><span>{bal}</span></li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Side</label>
                        <select className="input input-bordered w-full" value={tradeForm.side} onChange={e => handleTradeDialogChange('side', e.target.value)}>
                          <option value="">Select</option>
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Amount</label>
                        <input type="number" className="input input-bordered w-full" value={tradeForm.amount} onChange={e => handleTradeDialogChange('amount', e.target.value)} min="0" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                        <input type="text" className="input input-bordered w-full" value={tradeForm.reason} onChange={e => handleTradeDialogChange('reason', e.target.value)} placeholder="e.g. AI signal, trend, etc." />
                      </div>
                      <div className="p-2 bg-muted/30 rounded text-sm">
                        <strong>Summary:</strong> {tradeForm.side ? tradeForm.side.toUpperCase() : ''} {tradeForm.amount} {trend.symbol.toUpperCase()} {tradeForm.side === 'buy' ? '→' : '←'} {tradeForm.side === 'buy' ? fromTokenForBuy(trend.symbol.toLowerCase()).toUpperCase() : fromTokenForSell(trend.symbol.toLowerCase()).toUpperCase()}
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        className="bg-gradient-primary text-white px-4 py-2 rounded shadow"
                        onClick={handleTradeDialogSubmit}
                        disabled={tradeLoading === trend.symbol.toLowerCase() || !tradeForm.side || !tradeForm.amount}
                      >
                        {tradeLoading === trend.symbol.toLowerCase() ? 'Trading...' : 'Confirm Trade'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
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
      {/* Trading History Section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Trading History</h3>
        {history.length === 0 ? (
          <div className="text-muted-foreground">No trades yet.</div>
        ) : (
          <ul className="space-y-2">
            {history.map((trade, idx) => (
              <li key={idx} className="p-2 rounded bg-secondary/30 border border-border flex justify-between items-center">
                <span>{trade.side ? trade.side.toUpperCase() : ''} {trade.amount} {trade.fromToken?.toUpperCase()} → {trade.toToken?.toUpperCase()}</span>
                <span className="text-xs text-muted-foreground">{trade.timestamp || trade.time || ''}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};