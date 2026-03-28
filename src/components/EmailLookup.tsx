import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { recordEmailBreaches } from "@/lib/api";
import { Search, Shield, ShieldAlert, ShieldCheck, AlertTriangle, ExternalLink, Info } from "lucide-react";

interface BreachInfo {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  DataClasses: string[];
}

const EmailLookup = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [breaches, setBreaches] = useState<BreachInfo[]>([]);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  // Since we don't have an API key, we guide users to manually check
  const handleManualCheck = () => {
    if (!email.trim()) {
      toast({ title: "Please enter an email address", variant: "destructive" });
      return;
    }
    // Open HIBP in a new tab
    const encodedEmail = encodeURIComponent(email);
    window.open(`https://haveibeenpwned.com/account/${encodedEmail}`, "_blank");
  };

  const handleRecordBreaches = async () => {
    if (!email.trim() || breaches.length === 0) {
      toast({ title: "No breaches to record", variant: "destructive" });
      return;
    }

    try {
      const breachNames = breaches.map(b => b.Name);
      await recordEmailBreaches(email, breachNames);
      toast({ 
        title: "Breaches recorded", 
        description: `Recorded ${breaches.length} breaches for ${email}` 
      });
      setBreaches([]);
      setEmail("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to record breaches";
      toast({ 
        title: errorMessage, 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl">
      {/* Story Section */}
      <div className="text-center mb-8 slide-up">
        <div className="flex justify-center mb-4">
          <Search className="w-12 h-12 text-primary animate-float" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-glow mb-4">Email Breach Lookup</h1>
        <div className="bg-card border border-terminal-border rounded-lg p-6 mb-6 terminal-glow">
          <h2 className="text-lg font-semibold text-accent mb-3">Check If Your Email Has Been Compromised</h2>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Data breaches expose millions of accounts every year. Check if your email address 
            has appeared in known data breaches and learn what information was compromised.
            This knowledge helps you take immediate action to secure your accounts.
          </p>
        </div>
      </div>

      <Card className="terminal-glow mb-6 game-notification">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search for Your Email
          </CardTitle>
          <CardDescription>
            Enter your email address to check for breaches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-input border-terminal-border"
              />
            </div>

            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-accent mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Click "Check on Have I Been Pwned" to open their website</li>
                    <li>Complete the verification on their site</li>
                    <li>Copy any breaches shown and record them here</li>
                    <li>We'll track them in your vault</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleManualCheck}
              className="w-full terminal-glow transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Check on Have I Been Pwned
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Recording Section */}
      <Card className="terminal-glow slide-up">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Record Breaches Manually
          </CardTitle>
          <CardDescription>
            After checking on HIBP, record the breaches here to track them
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="record-email">Email Address</Label>
              <Input
                id="record-email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 bg-input border-terminal-border"
              />
            </div>

            <div>
              <Label>Breaches (one per line)</Label>
              <textarea
                className="mt-2 w-full h-32 p-3 bg-input border border-terminal-border rounded-lg font-mono text-sm"
                placeholder={`Enter breach names, one per line:\nAdobe\nLinkedIn\nDropbox\nAdobe (2013)`}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(line => line.trim());
                  setBreaches(lines.map(name => ({
                    Name: name.trim(),
                    Title: name.trim(),
                    Domain: '',
                    BreachDate: '',
                    DataClasses: []
                  })));
                  setSearched(true);
                }}
              />
            </div>

            {breaches.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    Found {breaches.length} breach(es)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {breaches.map((breach, index) => (
                    <Badge key={index} variant="destructive" className="animate-pulse">
                      {breach.Name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button 
              onClick={handleRecordBreaches}
              disabled={breaches.length === 0}
              className="w-full terminal-glow"
              variant={breaches.length > 0 ? "default" : "outline"}
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Record Breaches to Vault
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Card className="terminal-glow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              <span className="font-semibold">Why Check?</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Compromised emails lead to account takeouts, identity theft, and financial fraud. 
              Early detection is crucial.
            </p>
          </CardContent>
        </Card>

        <Card className="terminal-glow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-6 h-6 text-success" />
              <span className="font-semibold">What To Do</span>
            </div>
            <p className="text-sm text-muted-foreground">
              If breached: change passwords immediately, enable 2FA, and use unique passwords 
              for each account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailLookup;
