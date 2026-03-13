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
  { id: "energy", label: "More energy", emoji: "⚡" },
  { id: "confidence", label: "Feel confident in my body", emoji: "✨" },
  { id: "mobility", label: "Move freely again", emoji: "🏃" },
  { id: "sleep", label: "Better sleep", emoji: "😴" },
  { id: "mental", label: "Mental clarity", emoji: "🧠" },
  { id: "presence", label: "Be present with people I love", emoji: "💛" },
  { id: "longevity", label: "Live longer, live better", emoji: "🌿" },
  { id: "nutrition", label: "A healthier relationship with food", emoji: "🍽️" },
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

const GENDER_OPTIONS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "nonbinary", label: "Non-binary" },
  { id: "prefer-not", label: "Prefer not to say" },
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

  const TOTAL_STEPS = 4;

  const canAdvance =
    step === 0
      ? profile.name.trim().length > 0
      : step === 1
      ? profile.gender !== "" && profile.age !== null && profile.age > 0
      : step === 2
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
        We'll personalize your clearing around your name.
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

    // Step 1: Biometrics (gender, age, weight, goal)
    <motion.div
      key="biometrics"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-serif font-bold text-foreground mb-2">
        A little about you
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        This helps us ground <span className="text-primary font-medium">your roots</span>. All optional except gender and age.
      </p>

      <div className="space-y-5">
        {/* Gender */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Gender</label>
          <div className="grid grid-cols-2 gap-2">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g.id}
                onClick={() => setProfile((prev) => ({ ...prev, gender: g.id }))}
                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  profile.gender === g.id
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-card border-border text-foreground hover:border-primary/40"
                }`}
              >
                {g.label}
                {profile.gender === g.id && <Check className="w-3.5 h-3.5 text-primary inline ml-1.5" />}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Age</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={13}
              max={90}
              value={profile.age ?? 30}
              onChange={(e) => setProfile((prev) => ({ ...prev, age: parseInt(e.target.value) }))}
              className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary"
            />
            <span className="text-lg font-serif font-bold text-foreground w-10 text-right">{profile.age ?? 30}</span>
          </div>
        </div>

        {/* Weight */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Current weight</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={80}
                max={400}
                value={profile.currentWeight ?? 170}
                onChange={(e) => setProfile((prev) => ({ ...prev, currentWeight: parseInt(e.target.value) }))}
                className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary"
              />
              <span className="text-sm font-bold text-foreground w-14 text-right">{profile.currentWeight ?? 170}<span className="text-xs text-muted-foreground ml-0.5">lbs</span></span>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 block">Goal weight</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={80}
                max={400}
                value={profile.goalWeight ?? 150}
                onChange={(e) => setProfile((prev) => ({ ...prev, goalWeight: parseInt(e.target.value) }))}
                className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary"
              />
              <span className="text-sm font-bold text-foreground w-14 text-right">{profile.goalWeight ?? 150}<span className="text-xs text-muted-foreground ml-0.5">lbs</span></span>
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground italic">Weight fields are optional. You can always add this later.</p>
      </div>
    </motion.div>,

    // Step 2: Health goals
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

    // Step 3: Passions
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
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Step {step + 1} of {TOTAL_STEPS}
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
              if (step < TOTAL_STEPS - 1) setStep(step + 1);
              else onComplete();
            }}
            disabled={!canAdvance}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
          >
            {step === TOTAL_STEPS - 1 ? "Enter The Clearing" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
