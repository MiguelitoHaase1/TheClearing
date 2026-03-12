import { Home, Wand2 } from "lucide-react";
import type { DashboardTab } from "@/pages/Index";

interface TabBarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const TabBar = ({ activeTab, onTabChange }: TabBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50">
      <div className="max-w-lg mx-auto flex">
        <button
          onClick={() => onTabChange("home")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            activeTab === "home" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[11px] font-medium">Home</span>
        </button>
        <button
          onClick={() => onTabChange("experiences")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
            activeTab === "experiences" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Wand2 className="w-5 h-5" />
          <span className="text-[11px] font-medium">Experiences</span>
        </button>
      </div>
    </div>
  );
};

export default TabBar;
