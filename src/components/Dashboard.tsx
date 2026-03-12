import { motion } from "framer-motion";
import { Heart, Leaf, Sun, RotateCcw, Flame, Star } from "lucide-react";
import type { UserProfile } from "@/pages/Index";

interface DashboardProps {
  profile: UserProfile;
  onRestart: () => void;
}

const HEALTH_LABEL: Record<string, string> = {
  weight: "Weight management",
  energy: "Energy",
  sleep: "Sleep",
  strength: "Strength",
  mental: "Mental clarity",
  nutrition: "Nutrition",
};

const PASSION_LABEL: Record<string, string> = {
  cooking: "Cooking",
  outdoors: "Outdoors",
  reading: "Reading",
  music: "Music",
  art: "Art & creativity",
  sports: "Sports",
  tech: "Technology",
  travel: "Travel",
  meditation: "Meditation",
};

const DAILY_TIPS: Record<string, string> = {
  weight: "Try a 10-minute walk after your next meal — it helps regulate blood sugar naturally.",
  energy: "Afternoon slump? Step outside for 5 minutes of sunlight instead of reaching for coffee.",
  sleep: "Dim your lights an hour before bed to signal your body it's time to wind down.",
  strength: "Even 3 sets of bodyweight squats during the day adds up over a week.",
  mental: "A 5-minute journaling session can clear mental fog better than scrolling.",
  nutrition: "Add one extra serving of vegetables to your biggest meal today.",
};

const Dashboard = ({ profile, onRestart }: DashboardProps) => {
  const greeting = new Date().getHours() < 12
    ? "Good morning"
    : new Date().getHours() < 17
    ? "Good afternoon"
    : "Good evening";

  const primaryGoal = profile.healthGoals[0] || "energy";
  const tip = DAILY_TIPS[primaryGoal] || DAILY_TIPS.energy;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="text-2xl font-serif font-bold text-foreground">
              {profile.name}
            </h1>
          </div>
          <button
            onClick={onRestart}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
            title="Start over"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 space-y-5">
        {/* Daily tip card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Today's nudge
            </span>
          </div>
          <p className="text-foreground text-base leading-relaxed font-serif">
            {tip}
          </p>
        </motion.div>

        {/* Health goals */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Your Health Focus
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.healthGoals.map((id) => (
              <span
                key={id}
                className="px-3 py-1.5 bg-primary/8 text-foreground text-sm rounded-full border border-primary/20 font-medium"
              >
                {HEALTH_LABEL[id] || id}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Passions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Your Passions
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.passions.map((id) => (
              <span
                key={id}
                className="px-3 py-1.5 bg-accent/30 text-foreground text-sm rounded-full border border-accent font-medium"
              >
                {PASSION_LABEL[id] || id}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Weekly preview placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-border p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              This Week
            </span>
          </div>
          <div className="space-y-3">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, i) => (
              <div
                key={day}
                className="flex items-center gap-3"
              >
                <span className="text-xs text-muted-foreground w-8 font-medium">
                  {day}
                </span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded-full transition-all"
                    style={{ width: `${Math.max(15, (5 - i) * 20)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Your personalized plan is taking shape — more features coming soon.
          </p>
        </motion.div>

        {/* Motto footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-4 pb-8"
        >
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Star className="w-3 h-3 text-primary" />
            <Star className="w-3 h-3 text-primary" />
            <Star className="w-3 h-3 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground italic font-serif">
            Your health and your passions dictate your app experience.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
