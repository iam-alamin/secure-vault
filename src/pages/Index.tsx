import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import TabNav from "@/components/TabNav";
import VaultTable from "@/components/VaultTable";
import EmailLookup from "@/components/EmailLookup";
import { clearToken } from "@/lib/api";
import { Lock } from "lucide-react";

interface IndexProps {
  onLogout?: () => void;
  triggerScan?: boolean;
}

const Index = ({ onLogout, triggerScan }: IndexProps) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [breachCount, setBreachCount] = useState(0);

  const handleBreachCountChange = useCallback((count: number) => {
    setBreachCount(count);
  }, []);

  const handleLockVault = () => {
    clearToken();
    if (onLogout) {
      onLogout();
    }
  };

  const renderCurrentTab = () => {
    switch (currentTab) {
      case 0:
        return <VaultTable onBreachCountChange={handleBreachCountChange} triggerScan={triggerScan} />;
      case 1:
        return <EmailLookup />;
      default:
        return <VaultTable onBreachCountChange={handleBreachCountChange} triggerScan={triggerScan} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TabNav currentTab={currentTab} onTabChange={setCurrentTab} breachCount={breachCount} />
      <main className="flex-1 transition-all duration-300">
        {renderCurrentTab()}
      </main>
      
      <footer className="border-t border-terminal-border bg-terminal-bg mt-auto">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground gap-2">
            <div className="flex items-center space-x-4">
              <span className="text-primary pulse-glow">◉</span>
              <span>AlamiNVault v2.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Encrypted · Private · AES-256-GCM</span>
              <span className="text-success animate-glow-pulse">●</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLockVault}
                className="ml-4 text-muted-foreground hover:text-primary"
                title="Lock Vault"
              >
                <Lock className="w-4 h-4 mr-1" />
                Lock
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
