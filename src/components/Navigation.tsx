import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { WalletConnect } from './WalletConnect';
import { 
  Menu, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  History,
  Shield,
  HelpCircle,
  Brain
} from 'lucide-react';

interface NavigationProps {
  onPageChange: (page: string) => void;
  currentPage: string;
}

export const Navigation = ({ onPageChange, currentPage }: NavigationProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'history', label: 'Trade History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  const handleItemClick = (pageId: string) => {
    onPageChange(pageId);
    setIsOpen(false);
  };

  return (
    <nav className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
              TrendSight AI
            </h1>
            <Badge variant="outline" className="text-xs bg-accent/20 text-accent border-accent/30">
              v2.1.0
            </Badge>
          </div>
        </div>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center space-x-6">
        {menuItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              onClick={() => handleItemClick(item.id)}
              className={
                currentPage === item.id 
                  ? "bg-primary text-primary-foreground" 
                  : "hover:bg-secondary"
              }
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-4">
        <WalletConnect className="hidden sm:flex" />
        
        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          
          <SheetContent side="right" className="w-80">
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-2 mb-8">
                <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="font-bold text-lg bg-gradient-primary bg-clip-text text-transparent">
                    TrendSight AI
                  </h2>
                  <Badge variant="outline" className="text-xs bg-accent/20 text-accent border-accent/30">
                    v2.1.0
                  </Badge>
                </div>
              </div>

              {/* Mobile Wallet Connect */}
              <div className="mb-6 sm:hidden">
                <WalletConnect className="w-full" />
              </div>

              {/* Menu Items */}
              <div className="flex-1 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={currentPage === item.id ? "default" : "ghost"}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full justify-start ${
                        currentPage === item.id 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-secondary"
                      }`}
                    >
                      <Icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </Button>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-border">
                <div className="text-center text-sm text-muted-foreground">
                  <p>© 2024 TrendSight AI</p>
                  <p>Advanced Crypto Trading Agent</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};