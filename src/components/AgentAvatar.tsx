import { useState, useEffect } from 'react';
import agentAvatar from '@/assets/ai-agent-avatar.png';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface AgentAvatarProps {
  isAnalyzing: boolean;
  status: 'idle' | 'analyzing' | 'trading' | 'complete';
  confidence?: number;
  currentAction?: string;
}

export const AgentAvatar = ({ 
  isAnalyzing, 
  status, 
  confidence = 0, 
  currentAction = 'Monitoring markets...' 
}: AgentAvatarProps) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (isAnalyzing) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? '' : prev + '.');
      }, 500);
      return () => clearInterval(interval);
    } else {
      setDots('');
    }
  }, [isAnalyzing]);

  const getStatusColor = () => {
    switch (status) {
      case 'analyzing': return 'bg-primary';
      case 'trading': return 'bg-warning';
      case 'complete': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'analyzing': return 'Analyzing';
      case 'trading': return 'Trading';
      case 'complete': return 'Complete';
      default: return 'Idle';
    }
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-card">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          {/* Avatar */}
          <div className="relative">
            <div className={`
              w-24 h-24 rounded-full overflow-hidden border-2 border-primary/30 
              ${isAnalyzing ? 'animate-analyzing' : 'animate-float'}
              ${status === 'analyzing' ? 'shadow-glow' : ''}
            `}>
              <img 
                src={agentAvatar} 
                alt="TrendSight AI Agent" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Status indicator */}
            <div className={`
              absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-card
              ${getStatusColor()} ${isAnalyzing ? 'animate-pulse-glow' : ''}
            `} />
          </div>

          {/* Agent Info */}
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-lg bg-gradient-primary bg-clip-text text-transparent">
              TrendSight Agent
            </h3>
            
            <Badge 
              variant="outline" 
              className={`
                ${status === 'analyzing' ? 'bg-primary/20 text-primary border-primary/30' : ''}
                ${status === 'trading' ? 'bg-warning/20 text-warning border-warning/30' : ''}
                ${status === 'complete' ? 'bg-success/20 text-success border-success/30' : ''}
                ${status === 'idle' ? 'bg-muted/20 text-muted-foreground border-muted/30' : ''}
              `}
            >
              {getStatusText()}
            </Badge>
          </div>

          {/* Current Action */}
          <div className="text-center space-y-2 min-h-[40px]">
            <p className="text-sm text-muted-foreground">
              {currentAction}{isAnalyzing ? dots : ''}
            </p>
            
            {confidence > 0 && (
              <div className="flex items-center justify-center space-x-2">
                <span className="text-xs text-muted-foreground">Confidence:</span>
                <Badge 
                  variant="outline" 
                  className={`
                    ${confidence >= 70 ? 'bg-success/20 text-success border-success/30' : ''}
                    ${confidence >= 50 && confidence < 70 ? 'bg-warning/20 text-warning border-warning/30' : ''}
                    ${confidence < 50 ? 'bg-destructive/20 text-destructive border-destructive/30' : ''}
                  `}
                >
                  {confidence.toFixed(1)}%
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};