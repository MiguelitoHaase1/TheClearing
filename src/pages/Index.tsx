import { useState } from "react";
import Welcome from "@/components/Welcome";
import Onboarding from "@/components/Onboarding";
import Dashboard from "@/components/Dashboard";

export type AppScreen = "welcome" | "onboarding" | "dashboard";

export interface UserProfile {
  name: string;
  healthGoals: string[];
  passions: string[];
}

const Index = () => {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    healthGoals: [],
    passions: [],
  });

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
      {screen === "dashboard" && (
        <Dashboard
          profile={profile}
          onRestart={() => {
            setScreen("welcome");
            setProfile({ name: "", healthGoals: [], passions: [] });
          }}
        />
      )}
    </div>
  );
};

export default Index;
