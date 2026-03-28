import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Shield, Eye, EyeOff, KeyRound } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { setupMaster, login } from "@/lib/api";

interface MasterLoginProps {
  isFirstRun: boolean;
  onAuthenticated: (token: string, password: string) => void;
}

const MasterLogin = ({ isFirstRun, onAuthenticated }: MasterLoginProps) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getStrengthScore = (pwd: string): number => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
    return Math.min(score, 6);
  };

  const strengthScore = getStrengthScore(password);
  const strengthLabels = ["", "Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = ["bg-muted", "bg-error", "bg-error", "bg-warning", "bg-warning", "bg-success", "bg-primary"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFirstRun && password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      let token: string;
      
      if (isFirstRun) {
        const res = await setupMaster(password);
        token = res.token;
      } else {
        const res = await login(password);
        token = res.token;
      }
      
      onAuthenticated(token, password);
      toast({ title: isFirstRun ? "Vault created successfully" : "Vault unlocked" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials';
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 slide-up">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <KeyRound className="w-16 h-16 text-primary animate-float" />
              <div className="absolute -inset-4 bg-primary/10 rounded-full blur-xl animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-glow mb-2">AlamiNVault</h1>
          <p className="text-muted-foreground text-sm">
            {isFirstRun
              ? "Create your master password to initialize the vault"
              : "Enter your master password to unlock"}
          </p>
        </div>

        <Card className="terminal-glow game-notification">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {isFirstRun ? "Initialize Vault" : "Unlock Vault"}
            </CardTitle>
            <CardDescription>
              {isFirstRun
                ? "Choose a strong master password. This is the only password you need to remember."
                : "Your vault is encrypted — enter the master password to decrypt."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="master-password" className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Master Password
                </Label>
                <div className="relative">
                  <Input
                    id="master-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter master password..."
                    className="terminal-glow bg-input border-terminal-border pr-10"
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>

              {isFirstRun && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm master password..."
                      className="terminal-glow bg-input border-terminal-border"
                    />
                  </div>

                  {password && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Strength</span>
                        <span className={strengthScore >= 4 ? "text-success" : strengthScore >= 2 ? "text-warning" : "text-error"}>
                          {strengthLabels[strengthScore]}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${strengthColors[strengthScore]} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${(strengthScore / 6) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button
                type="submit"
                className="w-full terminal-glow transition-all duration-300 hover:scale-105"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-pulse">Decrypting...</span>
                ) : isFirstRun ? (
                  "Create Vault"
                ) : (
                  "Unlock Vault"
                )}
              </Button>
            </form>

            <div className="mt-6 bg-secondary/50 border border-terminal-border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">
                <span className="text-warning font-semibold">Security Notice:</span> Your master password
                is never stored — only a cryptographic hash. All saved passwords are encrypted with AES-256-GCM
                derived from your master password. If you forget it, your data cannot be recovered.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterLogin;
