import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Sparkles, ChevronRight, Play, Check, X,
  Heart, Flame, Brain, Moon, Dumbbell, Utensils,
  BookOpen, Mountain, Music, Palette, Timer, Droplets,
  TrendingUp, MessageCircle, Target, Smile,
} from "lucide-react";
import type { UserProfile } from "@/pages/Index";

interface ExperiencesProps {
  profile: UserProfile;
  spurAnswers: Record<string, number>;
  ehrConnected: boolean;
}

// Map goals/passions to experience recommendations
interface Experience {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  tags: string[];
  matchReason: string;
  component: React.FC<{ onClose: () => void }>;
}

// --- Mini experience components ---

const BreathingExercise: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [phase, setPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [cycles, setCycles] = useState(0);

  const startBreathing = () => {
    setPhase("inhale");
    setCycles(0);
    const cycle = (count: number) => {
      if (count >= 3) { setPhase("idle"); setCycles(3); return; }
      setPhase("inhale");
      setTimeout(() => { setPhase("hold");
        setTimeout(() => { setPhase("exhale");
          setTimeout(() => cycle(count + 1), 4000);
        }, 4000);
      }, 4000);
    };
    cycle(0);
  };

  return (
    <div className="text-center py-4">
      <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-[4000ms] ${
        phase === "inhale" ? "scale-125 bg-primary/20" :
        phase === "hold" ? "scale-125 bg-primary/30" :
        phase === "exhale" ? "scale-100 bg-primary/10" : "scale-100 bg-secondary"
      }`}>
        <Droplets className="w-8 h-8 text-primary" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">
        {phase === "idle" && cycles === 0 && "Ready to breathe"}
        {phase === "inhale" && "Breathe in…"}
        {phase === "hold" && "Hold…"}
        {phase === "exhale" && "Breathe out…"}
        {phase === "idle" && cycles > 0 && "Well done 🧘"}
      </p>
      <p className="text-xs text-muted-foreground mb-4">4-4-4 box breathing</p>
      {phase === "idle" && (
        <button onClick={cycles > 0 ? onClose : startBreathing}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          {cycles > 0 ? "Done" : "Start"}
        </button>
      )}
    </div>
  );
};

const GratitudeJournal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [entries, setEntries] = useState<string[]>([ "", "", "" ]);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-3">
          <Check className="w-6 h-6 text-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Gratitude saved ✨</p>
        <p className="text-xs text-muted-foreground mb-3">Reflecting daily builds resilience over time.</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Name 3 things you're grateful for today:</p>
      {entries.map((entry, i) => (
        <input key={i} type="text" value={entry} placeholder={`${i + 1}.`}
          onChange={(e) => { const n = [ ...entries ]; n[i] = e.target.value; setEntries(n); }}
          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
      ))}
      <button onClick={() => setSubmitted(true)} disabled={entries.every((e) => !e.trim())}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-40">
        Save
      </button>
    </div>
  );
};

const MoodTracker: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const moods = [
    { emoji: "😔", label: "Low" },
    { emoji: "😐", label: "Okay" },
    { emoji: "🙂", label: "Good" },
    { emoji: "😊", label: "Great" },
    { emoji: "🤩", label: "Amazing" },
  ];

  if (selected !== null) {
    return (
      <div className="text-center py-4">
        <p className="text-3xl mb-2">{moods[selected].emoji}</p>
        <p className="text-sm font-medium text-foreground mb-1">Feeling {moods[selected].label.toLowerCase()} — noted!</p>
        <p className="text-xs text-muted-foreground mb-3">Tracking mood patterns helps AI personalize your nudges.</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Done</button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">How are you feeling right now?</p>
      <div className="flex justify-between gap-2">
        {moods.map((mood, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className="flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border border-border hover:border-primary/40 transition-all">
            <span className="text-2xl">{mood.emoji}</span>
            <span className="text-[10px] text-muted-foreground">{mood.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const QuickWorkout: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [current, setCurrent] = useState(0);
  const [timer, setTimer] = useState<number | null>(null);
  const exercises = [
    { name: "Bodyweight Squats", reps: "10 reps", icon: "🦵" },
    { name: "Push-ups", reps: "8 reps", icon: "💪" },
    { name: "Plank Hold", reps: "20 seconds", icon: "🧘" },
    { name: "Jumping Jacks", reps: "15 reps", icon: "⭐" },
  ];

  if (current >= exercises.length) {
    return (
      <div className="text-center py-4">
        <p className="text-3xl mb-2">🎉</p>
        <p className="text-sm font-medium text-foreground mb-1">Workout complete!</p>
        <p className="text-xs text-muted-foreground mb-3">4 exercises done. Every bit counts.</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Done</button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground mb-2">Exercise {current + 1} of {exercises.length}</p>
      <p className="text-3xl mb-2">{exercises[current].icon}</p>
      <p className="text-base font-medium text-foreground">{exercises[current].name}</p>
      <p className="text-sm text-muted-foreground mb-4">{exercises[current].reps}</p>
      <button onClick={() => setCurrent(current + 1)}
        className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
        {current < exercises.length - 1 ? "Next →" : "Finish"}
      </button>
    </div>
  );
};

const MealLogger: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [meal, setMeal] = useState("");
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <div className="text-center py-4">
        <p className="text-3xl mb-2">🥗</p>
        <p className="text-sm font-medium text-foreground mb-1">Meal logged!</p>
        <p className="text-xs text-muted-foreground mb-3">AI will learn your eating patterns over time.</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">What did you eat? Keep it simple.</p>
      <textarea value={meal} onChange={(e) => setMeal(e.target.value)} rows={3} placeholder="e.g. Grilled chicken, rice, salad"
        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none" />
      <button onClick={() => setSaved(true)} disabled={!meal.trim()}
        className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-40">
        Log meal
      </button>
    </div>
  );
};

const SleepCheckin: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState<string | null>(null);

  if (quality) {
    return (
      <div className="text-center py-4">
        <p className="text-3xl mb-2">😴</p>
        <p className="text-sm font-medium text-foreground mb-1">{hours}h — {quality} quality</p>
        <p className="text-xs text-muted-foreground mb-3">Sleep patterns will feed into your energy recommendations.</p>
        <button onClick={onClose} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Hours slept last night</p>
        <div className="flex items-center gap-3">
          <input type="range" min={3} max={12} step={0.5} value={hours}
            onChange={(e) => setHours(parseFloat(e.target.value))}
            className="flex-1 accent-primary" />
          <span className="text-sm font-semibold text-foreground w-10 text-right">{hours}h</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">How was it?</p>
        <div className="flex gap-2">
          {[ "Poor", "Fair", "Good", "Great" ].map((q) => (
            <button key={q} onClick={() => setQuality(q)}
              className="flex-1 py-2 rounded-lg border border-border text-xs font-medium text-foreground hover:border-primary/40 transition-all">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Experience definitions ---
const ALL_EXPERIENCES: Experience[] = [
  {
    id: "breathing", title: "Breathing Exercise", description: "A quick 4-4-4 box breathing session to reset your nervous system.",
    icon: <Droplets className="w-5 h-5" />, color: "bg-blue-50 text-blue-600 border-blue-200",
    tags: [ "mental", "sleep", "meditation" ], matchReason: "Based on your focus on mental clarity",
    component: BreathingExercise,
  },
  {
    id: "gratitude", title: "Gratitude Journal", description: "Write down 3 things you're grateful for. Science-backed mood booster.",
    icon: <BookOpen className="w-5 h-5" />, color: "bg-amber-50 text-amber-600 border-amber-200",
    tags: [ "mental", "reading", "meditation" ], matchReason: "Matches your interest in mindfulness",
    component: GratitudeJournal,
  },
  {
    id: "mood", title: "Mood Check-in", description: "Quick daily mood tracking. AI uses patterns to optimize your nudges.",
    icon: <Smile className="w-5 h-5" />, color: "bg-rose-50 text-rose-600 border-rose-200",
    tags: [ "mental", "energy" ], matchReason: "Helps personalize your experience",
    component: MoodTracker,
  },
  {
    id: "workout", title: "Quick Workout", description: "4 bodyweight exercises, no equipment needed. Under 5 minutes.",
    icon: <Dumbbell className="w-5 h-5" />, color: "bg-green-50 text-green-600 border-green-200",
    tags: [ "strength", "sports", "energy", "outdoors" ], matchReason: "Aligned with your strength goals",
    component: QuickWorkout,
  },
  {
    id: "meal", title: "Meal Logger", description: "Log what you ate in plain language. AI learns your nutrition patterns.",
    icon: <Utensils className="w-5 h-5" />, color: "bg-orange-50 text-orange-600 border-orange-200",
    tags: [ "nutrition", "weight", "cooking" ], matchReason: "Supports your nutrition focus",
    component: MealLogger,
  },
  {
    id: "sleep", title: "Sleep Check-in", description: "Track hours and quality. Feeds into energy and recovery recommendations.",
    icon: <Moon className="w-5 h-5" />, color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    tags: [ "sleep", "energy" ], matchReason: "Based on your sleep goals",
    component: SleepCheckin,
  },
];

const Experiences = ({ profile, spurAnswers, ehrConnected }: ExperiencesProps) => {
  const [activeExperience, setActiveExperience] = useState<string | null>(null);
  const [builtExperiences, setBuiltExperiences] = useState<Set<string>>(new Set());

  // Score and sort experiences by relevance
  const scoredExperiences = ALL_EXPERIENCES.map((exp) => {
    let score = 0;
    profile.healthGoals.forEach((g) => { if (exp.tags.includes(g)) score += 3; });
    profile.passions.forEach((p) => { if (exp.tags.includes(p)) score += 2; });
    return { ...exp, score };
  }).sort((a, b) => b.score - a.score);

  const recommended = scoredExperiences.filter((e) => e.score > 0);
  const other = scoredExperiences.filter((e) => e.score === 0);

  const handleBuild = (id: string) => {
    setBuiltExperiences((prev) => new Set([ ...prev, id ]));
    setActiveExperience(id);
  };

  const renderExperienceCard = (exp: Experience & { score: number }) => {
    const isBuilt = builtExperiences.has(exp.id);
    const isActive = activeExperience === exp.id;
    const ExpComponent = exp.component;

    return (
      <motion.div
        key={exp.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${exp.color}`}>
              {exp.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{exp.title}</h3>
                {isBuilt && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Added</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{exp.description}</p>
              {exp.score > 0 && (
                <p className="text-[10px] text-primary font-medium mt-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {exp.matchReason}
                </p>
              )}
            </div>
          </div>

          {/* Action button */}
          {!isActive && (
            <button
              onClick={() => isBuilt ? setActiveExperience(exp.id) : handleBuild(exp.id)}
              className={`mt-3 w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                isBuilt
                  ? "bg-secondary text-foreground hover:bg-secondary/80"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {isBuilt ? (
                <><Play className="w-3 h-3" /> Try again</>
              ) : (
                <><Wand2 className="w-3 h-3" /> Build this</>
              )}
            </button>
          )}
        </div>

        {/* Expanded experience */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="border-t border-border"
            >
              <div className="p-4 relative">
                <button
                  onClick={() => setActiveExperience(null)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-secondary text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <ExpComponent onClose={() => setActiveExperience(null)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-2">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-serif font-bold text-foreground">Personal Experiences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Built for you, from your data. Click to try.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 space-y-5 mt-4">
        {/* Your data summary */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-4" style={{ boxShadow: "var(--shadow-card)" }}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Your profile shapes these</p>
          <div className="flex flex-wrap gap-1.5">
            {profile.healthGoals.map((id) => (
              <span key={id} className="px-2 py-1 bg-primary/10 text-foreground text-[11px] rounded-full border border-primary/20 font-medium flex items-center gap-1">
                <Heart className="w-2.5 h-2.5 text-primary" />
                {id}
              </span>
            ))}
            {profile.passions.map((id) => (
              <span key={id} className="px-2 py-1 bg-accent/20 text-foreground text-[11px] rounded-full border border-accent/40 font-medium flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 text-primary" />
                {id}
              </span>
            ))}
            {Object.keys(spurAnswers).length > 0 && (
              <span className="px-2 py-1 bg-secondary text-foreground text-[11px] rounded-full border border-border font-medium flex items-center gap-1">
                <Brain className="w-2.5 h-2.5 text-primary" />
                SPUR profile
              </span>
            )}
            {ehrConnected && (
              <span className="px-2 py-1 bg-secondary text-foreground text-[11px] rounded-full border border-border font-medium flex items-center gap-1">
                <Target className="w-2.5 h-2.5 text-primary" />
                Health records
              </span>
            )}
          </div>
        </motion.div>

        {/* Recommended experiences */}
        {recommended.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Recommended for you</h2>
            </div>
            <div className="space-y-3">
              {recommended.map(renderExperienceCard)}
            </div>
          </div>
        )}

        {/* Other experiences */}
        {other.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">More to explore</h2>
            <div className="space-y-3">
              {other.map(renderExperienceCard)}
            </div>
          </div>
        )}

        {/* Footer nudge */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-center py-6">
          <p className="text-xs text-muted-foreground italic font-serif">
            Share more data on the Home tab to unlock new experiences.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Experiences;
