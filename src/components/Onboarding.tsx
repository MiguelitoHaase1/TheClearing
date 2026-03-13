import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import type { UserProfile } from "@/pages/Index";

interface OnboardingProps {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  onComplete: () => void;
}

const HEALTH_GOALS = [
  { id: "weight", label: "Weight management", emoji: "⚖️" },
  { id: "energy", label: "More energy", emoji: "⚡" },
  { id: "sleep", label: "Better sleep", emoji: "😴" },
  { id: "strength", label: "Build strength", emoji: "💪" },
  { id: "mental", label: "Mental clarity", emoji: "🧠" },
  { id: "nutrition", label: "Better nutrition", emoji: "🥗" },
];

const PASSIONS = [
  { id: "cooking", label: "Cooking", emoji: "👨‍🍳" },
  { id: "outdoors", label: "Outdoors", emoji: "🏔️" },
  { id: "reading", label: "Reading", emoji: "📚" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "art", label: "Art & creativity", emoji: "🎨" },
  { id: "sports", label: "Sports", emoji: "🏃" },
  { id: "tech", label: "Technology", emoji: "💻" },
  { id: "travel", label: "Travel", emoji: "✈️" },
  { id: "meditation", label: "Meditation", emoji: "🧘" },
];

const Onboarding = ({ profile, setProfile, onComplete }: OnboardingProps) => {
  const [step, setStep] = useState(0);

  const toggleItem = (
    field: "healthGoals" | "passions",
    id: string
  ) => {
    setProfile((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));
  };

  const canAdvance =
    step === 0
      ? profile.name.trim().length > 0
      : step === 1
      ? profile.healthGoals.length > 0
      : profile.passions.length > 0;

  const steps = [
    // Step 0: Name
    <motion.div
      key="name"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
        What should we call you?
      </h2>
      <p className="text-muted-foreground mb-8 text-sm">
        We'll personalize your experience around your name.
      </p>
      <input
        type="text"
        value={profile.name}
        onChange={(e) =>
          setProfile((prev) => ({ ...prev, name: e.target.value }))
        }
        placeholder="Your first name"
        className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-base"
        autoFocus
      />
    </motion.div>,

    // Step 1: Health goals
    <motion.div
      key="health"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
        What health goals matter to you?
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Select all that resonate. These shape your journey.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {HEALTH_GOALS.map((goal) => {
          const selected = profile.healthGoals.includes(goal.id);
          return (
            <button
              key={goal.id}
              onClick={() => toggleItem("healthGoals", goal.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                selected
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              }`}
            >
              <span className="text-lg">{goal.emoji}</span>
              {goal.label}
              {selected && <Check className="w-4 h-4 text-primary ml-auto" />}
            </button>
          );
        })}
      </div>
    </motion.div>,

    // Step 2: Passions
    <motion.div
      key="passions"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
        What are you passionate about?
      </h2>
      <p className="text-muted-foreground mb-2 text-sm">
        These become <span className="text-sage font-medium">Your Light</span> — the experiences that fill the space the noise left behind.
      </p>
      <p className="text-xs text-muted-foreground mb-6 italic">
        Select what calls to you. We'll build around it.
      </p>
      <div className="flex flex-wrap gap-3">
        {PASSIONS.map((passion) => {
          const selected = profile.passions.includes(passion.id);
          return (
            <button
              key={passion.id}
              onClick={() => toggleItem("passions", passion.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition-all ${
                selected
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-card border-border text-foreground hover:border-primary/40"
              }`}
            >
              <span>{passion.emoji}</span>
              {passion.label}
            </button>
          );
        })}
      </div>
    </motion.div>,
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress */}
      <div className="px-6 pt-6">
        <div className="max-w-md mx-auto flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Step {step + 1} of 3
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-6 pt-10 pb-32">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-sm border-t border-border">
        <div className="max-w-md mx-auto flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-3 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-secondary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (step < 2) setStep(step + 1);
              else onComplete();
            }}
            disabled={!canAdvance}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
          >
            {step === 2 ? "Enter The Clearing" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
