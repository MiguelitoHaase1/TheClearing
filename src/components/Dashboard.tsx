import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Flame, Sun, RotateCcw, Sparkles, Star, ChevronRight, Check, BrainCircuit } from "lucide-react";
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

const LIKERT_OPTIONS = [
  "Strongly disagree",
  "Disagree",
  "Neither agree nor disagree",
  "Agree",
  "Strongly agree",
];

const SPUR_DEEP_QUESTIONS = [
  {
    id: "p1.1",
    dimension: "Psychological",
    icon: "🧠",
    label: "It is essential that I follow my weight management plan.",
  },
  {
    id: "r1.1",
    dimension: "Rational",
    icon: "💡",
    label: "My treatment helps me manage my weight effectively.",
  },
  {
    id: "s1.1",
    dimension: "Social",
    icon: "👥",
    label: "My weight affects my social life.",
  },
  {
    id: "u1.1",
    dimension: "Utility",
    icon: "⚙️",
    label: "I am able to follow my weight management plan.",
  },
  {
    id: "p2.2",
    dimension: "Psychological",
    icon: "🧠",
    label: "Achieving a healthy weight is my highest priority.",
  },
  {
    id: "r2.1",
    dimension: "Rational",
    icon: "💡",
    label: "I completely understand the health risks associated with my weight.",
  },
  {
    id: "s2.1",
    dimension: "Social",
    icon: "👥",
    label: "My weight affects my relationships with those I care about.",
  },
  {
    id: "u2.2",
    dimension: "Utility",
    icon: "⚙️",
    label: "I find it easy to stick to my plan when eating out or traveling.",
  },
];

const Dashboard = ({ profile, onRestart }: DashboardProps) => {
  const [spurAnswers, setSpurAnswers] = useState<Record<string, number>>({});
  const [currentSpurQ, setCurrentSpurQ] = useState(0);
  const [showSpur, setShowSpur] = useState(false);
  const [spurComplete, setSpurComplete] = useState(false);

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const primaryGoal = profile.healthGoals[0] || "energy";
  const tip = DAILY_TIPS[primaryGoal] || DAILY_TIPS.energy;

  const answeredCount = Object.keys(spurAnswers).length;
  const totalQuestions = SPUR_DEEP_QUESTIONS.length;

  const handleSpurAnswer = (questionId: string, answerIdx: number) => {
    const newAnswers = { ...spurAnswers, [questionId]: answerIdx };
    setSpurAnswers(newAnswers);

    if (currentSpurQ < totalQuestions - 1) {
      setTimeout(() => setCurrentSpurQ(currentSpurQ + 1), 300);
    } else {
      setTimeout(() => {
        setSpurComplete(true);
        setShowSpur(false);
      }, 500);
    }
  };

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
                className="px-3 py-1.5 bg-primary/10 text-foreground text-sm rounded-full border border-primary/20 font-medium"
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

        {/* AI-powered experience teaser */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-primary/20 p-5"
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Coming soon — AI-powered
            </span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-2">
            Your experience will build itself
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We're applying AI to the data you share — your health goals, passions, and self-assessments — to generate a fully personalized app experience just for you. The more you share, the more powerful your tools become.
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Personalized coaching</span> — an AI coach matched to your motivation style
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Custom content</span> — articles, exercises, and plans woven around your passions
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Smart insights</span> — AI-generated health nudges that evolve as you do
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic">
            Share more about yourself below to unlock richer features sooner.
          </p>
        </motion.div>

        {/* Deepen your profile — SPUR questions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Deepen Your Profile
              </span>
            </div>
            {answeredCount > 0 && !spurComplete && (
              <span className="text-xs text-muted-foreground">
                {answeredCount}/{totalQuestions}
              </span>
            )}
          </div>

          {spurComplete ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-4"
            >
              <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-foreground" />
              </div>
              <h4 className="font-serif font-bold text-foreground mb-1">
                Profile enriched
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your SPUR assessment is complete. AI will use these insights to match you with a coaching style and personalize your entire experience.
              </p>
            </motion.div>
          ) : !showSpur ? (
            <>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Answer a few quick questions about your motivations and challenges. This helps our AI understand how to coach you best — are you driven by community, data, autonomy, or support?
              </p>
              {answeredCount > 0 && (
                <div className="mb-3">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{
                        width: `${(answeredCount / totalQuestions) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowSpur(true)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {answeredCount > 0 ? "Continue Assessment" : "Start Quick Assessment"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSpurQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>
                      {SPUR_DEEP_QUESTIONS[currentSpurQ].icon}{" "}
                      {SPUR_DEEP_QUESTIONS[currentSpurQ].dimension}
                    </span>
                    <span>
                      {currentSpurQ + 1} of {totalQuestions}
                    </span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${((currentSpurQ + 1) / totalQuestions) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Question */}
                <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
                  {SPUR_DEEP_QUESTIONS[currentSpurQ].label}
                </p>

                {/* Likert options */}
                <div className="space-y-2">
                  {LIKERT_OPTIONS.map((opt, idx) => {
                    const isSelected =
                      spurAnswers[SPUR_DEEP_QUESTIONS[currentSpurQ].id] === idx;
                    return (
                      <button
                        key={idx}
                        onClick={() =>
                          handleSpurAnswer(
                            SPUR_DEEP_QUESTIONS[currentSpurQ].id,
                            idx
                          )
                        }
                        className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground font-medium"
                            : "bg-background border-border text-foreground hover:border-primary/40"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowSpur(false)}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Save and continue later
                </button>
              </motion.div>
            </AnimatePresence>
          )}
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
