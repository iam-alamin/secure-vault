import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import MasterLogin from "./components/MasterLogin";
import { checkAuthStatus, initializeApp, setMasterPassword } from "@/lib/api";

const queryClient = new QueryClient();

const App = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [checking, setChecking] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [triggerScan, setTriggerScan] = useState(false);

  useEffect(() => {
    // Initialize IndexedDB first
    initializeApp()
      .then(() => {
        // Then check if vault is configured
        return checkAuthStatus();
      })
      .then((res) => {
        setIsFirstRun(!res.isConfigured);
      })
      .catch((err) => {
        console.error('Initialization error:', err);
        setInitError(err.message);
      })
      .finally(() => setChecking(false));
  }, []);

  const handleAuthenticated = (newToken: string, password: string) => {
    setToken(newToken);
    setMasterPassword(password);
    // Trigger scan after successful authentication
    setTriggerScan(true);
  };

  const handleLogout = () => {
    setToken(null);
    setMasterPassword('');
    setTriggerScan(false);
  };

  const handleScanTriggered = () => {
    // Reset trigger flag after scan completes
    setTriggerScan(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary animate-pulse font-mono text-lg">Initializing AlamiNVault...</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive font-mono text-lg">Error: {initError}</div>
      </div>
    );
  }

  if (!token) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MasterLogin isFirstRun={isFirstRun} onAuthenticated={handleAuthenticated} />
      </TooltipProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index onLogout={handleLogout} triggerScan={triggerScan} onScanTriggered={handleScanTriggered} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
