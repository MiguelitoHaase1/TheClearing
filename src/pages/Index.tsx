import { useState } from "react";
import Welcome from "@/components/Welcome";
import Onboarding from "@/components/Onboarding";
import Dashboard from "@/components/Dashboard";
import Experiences from "@/components/Experiences";
import TabBar from "@/components/TabBar";

export type AppScreen = "welcome" | "onboarding" | "dashboard";
export type DashboardTab = "home" | "experiences";

export interface UserProfile {
  name: string;
  healthGoals: string[];
  passions: string[];
}

const Index = () => {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    healthGoals: [],
    passions: [],
  });
  const [spurAnswers, setSpurAnswers] = useState<Record<string, number>>({});
  const [ehrConnected, setEhrConnected] = useState(false);

  if (screen !== "dashboard") {
    return (
      <div className="min-h-screen bg-background font-sans">
        {screen === "welcome" && (
          <Welcome onStart={() => setScreen("onboarding")} />
        )}
        {screen === "onboarding" && (
          <Onboarding
            profile={profile}
            setProfile={setProfile}
            onComplete={() => setScreen("dashboard")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {activeTab === "home" ? (
        <Dashboard
          profile={profile}
          spurAnswers={spurAnswers}
          setSpurAnswers={setSpurAnswers}
          ehrConnected={ehrConnected}
          setEhrConnected={setEhrConnected}
          onRestart={() => {
            setScreen("welcome");
            setProfile({ name: "", healthGoals: [], passions: [] });
            setSpurAnswers({});
            setEhrConnected(false);
            setActiveTab("home");
          }}
        />
      ) : (
        <Experiences
          profile={profile}
          spurAnswers={spurAnswers}
          ehrConnected={ehrConnected}
        />
      )}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
