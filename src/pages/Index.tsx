import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { Dashboard } from '@/components/Dashboard';

const Index = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'analytics':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Analytics
            </h1>
            <p className="text-muted-foreground">Advanced trading analytics coming soon...</p>
          </div>
        );
      case 'history':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Trade History
            </h1>
            <p className="text-muted-foreground">Your trading history will appear here...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Settings
            </h1>
            <p className="text-muted-foreground">Configure your trading preferences...</p>
          </div>
        );
      case 'security':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Security
            </h1>
            <p className="text-muted-foreground">Manage your security settings...</p>
          </div>
        );
      case 'help':
        return (
          <div className="p-6">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
              Help & Support
            </h1>
            <p className="text-muted-foreground">Get help with TrendSight AI...</p>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="max-w-7xl mx-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default Index;
