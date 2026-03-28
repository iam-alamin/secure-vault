import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Vault, Search } from "lucide-react";

interface TabNavProps {
  currentTab: number;
  onTabChange: (index: number) => void;
  breachCount?: number;
}

const TabNav = ({ currentTab, onTabChange, breachCount = 0 }: TabNavProps) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const tabs = [
    { 
      name: "Credential Vault", 
      shortName: "Vault",
      description: "Manage encrypted credentials",
      story: "Your encrypted digital armory — every secret guarded by AES-256",
      icon: Vault,
    },
    { 
      name: "Email Breach Lookup", 
      shortName: "Lookup",
      description: "Check if your email was compromised",
      story: "Find out if your digital identity has been exposed",
      icon: Search,
    }
  ];

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance && currentTab < tabs.length - 1) onTabChange(currentTab + 1);
    if (distance < -minSwipeDistance && currentTab > 0) onTabChange(currentTab - 1);
  };

  return (
    <nav className="border-b border-terminal-border bg-terminal-bg overflow-hidden">
      <div className="container mx-auto">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-center space-x-1 p-4">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            return (
              <Button
                key={index}
                variant={currentTab === index ? "default" : "ghost"}
                onClick={() => onTabChange(index)}
                className={`
                  transition-glow font-mono text-sm group relative
                  ${currentTab === index 
                    ? "bg-primary text-primary-foreground terminal-glow animate-glow-pulse" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }
                `}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-lg">{tab.name}</span>
                    {index === 0 && breachCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 min-w-[1.25rem] h-5 animate-pulse">
                        {breachCount}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs opacity-70">{tab.description}</span>
                </div>
              </Button>
            );
          })}
        </div>

        {/* Mobile Card Stack */}
        <div 
          className="md:hidden relative h-32 p-4 card-stack"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {tabs.map((tab, index) => {
            const offset = index - currentTab;
            const isActive = index === currentTab;
            const Icon = tab.icon;

            return (
              <div
                key={index}
                className={`
                  absolute inset-x-4 top-4 bottom-4 
                  bg-card border border-terminal-border rounded-lg
                  transition-all duration-500 ease-out
                  ${isActive ? 'z-30 terminal-glow' : 'z-10'}
                `}
                style={{
                  transform: `translateX(${offset * 100}%) scale(${isActive ? 1 : 0.9})`,
                  opacity: isActive ? 1 : 0.3,
                }}
                onClick={() => onTabChange(index)}
              >
                <div className="p-4 h-full flex flex-col justify-center items-center text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-primary">{tab.name}</h3>
                    {index === 0 && breachCount > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 animate-pulse">
                        {breachCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{tab.description}</p>
                  <p className="text-xs text-accent italic">{tab.story}</p>
                </div>
              </div>
            );
          })}
          
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {tabs.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentTab ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TabNav;
