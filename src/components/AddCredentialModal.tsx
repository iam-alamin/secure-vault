import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield, RefreshCw, Copy, X } from "lucide-react";

interface CredentialData {
  id?: number;
  site_name: string;
  site_url: string;
  username: string;
  password?: string; // Optional for editing
}

interface AddCredentialModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CredentialData) => void;
  editData?: CredentialData | null;
}

interface GeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeSimilar: boolean;
}

const AddCredentialModal = ({
  open,
  onOpenChange,
  onSubmit,
  editData,
}: AddCredentialModalProps) => {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [generatorOptions, setGeneratorOptions] = useState<GeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
  });
  const { toast } = useToast();

  // Reset state when modal opens/closes or editData changes
  useEffect(() => {
    if (open) {
      if (editData) {
        setSiteName(editData.site_name);
        setSiteUrl(editData.site_url);
        setUsername(editData.username);
        setPassword(editData.password || "");
      } else {
        setSiteName("");
        setSiteUrl("");
        setUsername("");
        setPassword("");
      }
      setGeneratedPassword("");
      setShowGenerator(false);
    }
  }, [open, editData]);

  const generatePassword = () => {
    let charset = "";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const similar = "il1Lo0O";

    if (generatorOptions.includeLowercase) charset += lowercase;
    if (generatorOptions.includeUppercase) charset += uppercase;
    if (generatorOptions.includeNumbers) charset += numbers;
    if (generatorOptions.includeSymbols) charset += symbols;

    if (generatorOptions.excludeSimilar) {
      charset = charset.split("").filter((char) => !similar.includes(char)).join("");
    }

    if (charset === "") {
      toast({
        title: "Invalid Options",
        description: "Please select at least one character type",
        variant: "destructive",
      });
      return;
    }

    let result = "";
    for (let i = 0; i < generatorOptions.length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    setGeneratedPassword(result);
    setPassword(result);
    setShowGenerator(false);
    toast({ title: "Password generated and applied!" });
  };

  const copyGeneratedPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({ title: "Copied!", description: "Password copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

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

  const currentPassword = password || generatedPassword;
  const strengthScore = getStrengthScore(currentPassword);
  const strengthLabels = ["", "Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  const strengthColors = ["bg-muted", "bg-red-500", "bg-red-500", "bg-yellow-500", "bg-yellow-500", "bg-green-500", "bg-blue-500"];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPassword = password || generatedPassword;
    if (!siteName.trim() || !username.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    // For editing: if no new password entered, we need to handle differently
    // But for now, require password
    if (!finalPassword.trim() && !editData?.password) {
      toast({ title: "Please enter a password", variant: "destructive" });
      return;
    }
    onSubmit({
      id: editData?.id,
      site_name: siteName.trim(),
      site_url: siteUrl.trim(),
      username: username.trim(),
      password: finalPassword || editData?.password || "",
    });
    setGeneratedPassword("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="bg-card border-terminal-border terminal-glow sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => {
          if (showGenerator) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {editData ? "Edit Credential" : "Add Credential"}
          </DialogTitle>
          <DialogDescription>
            {editData
              ? "Update this credential entry in your vault"
              : "Add a new credential to your encrypted vault"}
          </DialogDescription>
        </DialogHeader>

        {/* Generator Panel - Inline */}
        {showGenerator ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-primary">Password Generator</h3>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowGenerator(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div>
              <Label className="text-sm font-medium">
                Length: {generatorOptions.length}
              </Label>
              <Slider
                value={[generatorOptions.length]}
                onValueChange={(value) => setGeneratorOptions({ ...generatorOptions, length: value[0] })}
                max={64}
                min={8}
                step={1}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="uppercase"
                  checked={generatorOptions.includeUppercase}
                  onCheckedChange={(checked) =>
                    setGeneratorOptions({ ...generatorOptions, includeUppercase: checked as boolean })
                  }
                />
                <Label htmlFor="uppercase" className="text-sm">Uppercase</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lowercase"
                  checked={generatorOptions.includeLowercase}
                  onCheckedChange={(checked) =>
                    setGeneratorOptions({ ...generatorOptions, includeLowercase: checked as boolean })
                  }
                />
                <Label htmlFor="lowercase" className="text-sm">Lowercase</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="numbers"
                  checked={generatorOptions.includeNumbers}
                  onCheckedChange={(checked) =>
                    setGeneratorOptions({ ...generatorOptions, includeNumbers: checked as boolean })
                  }
                />
                <Label htmlFor="numbers" className="text-sm">Numbers</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="symbols"
                  checked={generatorOptions.includeSymbols}
                  onCheckedChange={(checked) =>
                    setGeneratorOptions({ ...generatorOptions, includeSymbols: checked as boolean })
                  }
                />
                <Label htmlFor="symbols" className="text-sm">Symbols</Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="exclude-similar"
                checked={generatorOptions.excludeSimilar}
                onCheckedChange={(checked) =>
                  setGeneratorOptions({ ...generatorOptions, excludeSimilar: checked as boolean })
                }
              />
              <Label htmlFor="exclude-similar" className="text-sm">
                Exclude similar (i, l, 1, L, o, 0, O)
              </Label>
            </div>

            <Button onClick={generatePassword} className="w-full terminal-glow">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Password
            </Button>
          </div>
        ) : (
          /* Normal Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Site Name *</Label>
              <Input
                id="site-name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. GitHub"
                className="bg-input border-terminal-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="site-url">Site URL</Label>
              <Input
                id="site-url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                placeholder="e.g. https://github.com"
                className="bg-input border-terminal-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username / Email *</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. user@example.com"
                className="bg-input border-terminal-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter or generate a password"
                    className="bg-input border-terminal-border pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGenerator(true)}
                  className="terminal-glow shrink-0"
                  title="Generate password"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {currentPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Strength</span>
                    <span>{strengthLabels[strengthScore]}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`${strengthColors[strengthScore]} h-1.5 rounded-full transition-all duration-500`}
                      style={{ width: `${(strengthScore / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="terminal-glow">
                {editData ? "Update" : "Save to Vault"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddCredentialModal;
