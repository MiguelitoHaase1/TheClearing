import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Flame, Sun, RotateCcw, Sparkles, Star,
  ChevronRight, Check, BrainCircuit, Shield, FileHeart,
} from "lucide-react";
import type { UserProfile } from "@/pages/Index";

interface DashboardProps {
  profile: UserProfile;
  spurAnswers: Record<string, number>;
  setSpurAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ehrConnected: boolean;
  setEhrConnected: React.Dispatch<React.SetStateAction<boolean>>;
  onRestart: () => void;
}

const HEALTH_LABEL: Record<string, string> = {
  weight: "Weight management", energy: "Energy", sleep: "Sleep",
  strength: "Strength", mental: "Mental clarity", nutrition: "Nutrition",
};
const PASSION_LABEL: Record<string, string> = {
  cooking: "Cooking", outdoors: "Outdoors", reading: "Reading",
  music: "Music", art: "Art & creativity", sports: "Sports",
  tech: "Technology", travel: "Travel", meditation: "Meditation",
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
  "Strongly disagree", "Disagree", "Neither agree nor disagree", "Agree", "Strongly agree",
];

const SPUR_QUESTIONS = [
  { id: "p1.1", dimension: "Psychological", icon: "🧠", label: "It is essential that I follow my weight management plan." },
  { id: "r1.1", dimension: "Rational", icon: "💡", label: "My treatment helps me manage my weight effectively." },
  { id: "s1.1", dimension: "Social", icon: "👥", label: "My weight affects my social life." },
  { id: "u1.1", dimension: "Utility", icon: "⚙️", label: "I am able to follow my weight management plan." },
  { id: "p2.2", dimension: "Psychological", icon: "🧠", label: "Achieving a healthy weight is my highest priority." },
  { id: "r2.1", dimension: "Rational", icon: "💡", label: "I completely understand the health risks associated with my weight." },
  { id: "s2.1", dimension: "Social", icon: "👥", label: "My weight affects my relationships with those I care about." },
  { id: "u2.2", dimension: "Utility", icon: "⚙️", label: "I find it easy to stick to my plan when eating out or traveling." },
  { id: "r1.2", dimension: "Rational", icon: "💡", label: "My weight is likely to cause health problems if I don't follow my treatment plan." },
  { id: "p2.1", dimension: "Psychological", icon: "🧠", label: "If my doctor recommends a weight management approach, I follow it." },
  { id: "u2.4", dimension: "Utility", icon: "⚙️", label: "Sometimes I don't follow my weight management plan exactly." },
  { id: "r3.2", dimension: "Rational", icon: "💡", label: "My weight keeps me from doing things I want to do." },
];

const QUESTIONS_PER_SESSION = 3;

const EHR_SOURCES = [
  { id: "epic", name: "Epic MyChart", icon: "🏥" },
  { id: "cerner", name: "Cerner / Oracle Health", icon: "🔬" },
  { id: "apple", name: "Apple Health", icon: "🍎" },
  { id: "manual", name: "Enter manually", icon: "📝" },
];

const Dashboard = ({ profile, spurAnswers, setSpurAnswers, ehrConnected, setEhrConnected, onRestart }: DashboardProps) => {
  const [showSpur, setShowSpur] = useState(false);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [showEhr, setShowEhr] = useState(false);
  const [ehrSource, setEhrSource] = useState<string | null>(null);

  const greeting = new Date().getHours() < 12 ? "Good morning"
    : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  const primaryGoal = profile.healthGoals[0] || "energy";
  const tip = DAILY_TIPS[primaryGoal] || DAILY_TIPS.energy;

  const answeredCount = Object.keys(spurAnswers || {}).length;
  const totalQuestions = SPUR_QUESTIONS.length;
  const allSpurComplete = answeredCount >= totalQuestions;

  // Find the next unanswered question
  const nextUnansweredIdx = SPUR_QUESTIONS.findIndex((q) => spurAnswers[q.id] === undefined);
  const currentQ = nextUnansweredIdx >= 0 ? nextUnansweredIdx : 0;

  const handleSpurAnswer = (questionId: string, answerIdx: number) => {
    const newAnswers = { ...spurAnswers, [questionId]: answerIdx };
    setSpurAnswers(newAnswers);
    const newSessionCount = sessionAnswered + 1;
    setSessionAnswered(newSessionCount);

    const newTotal = Object.keys(newAnswers).length;

    if (newTotal >= totalQuestions) {
      // All done!
      setTimeout(() => {
        setShowSpur(false);
        setSessionDone(false);
      }, 400);
    } else if (newSessionCount >= QUESTIONS_PER_SESSION) {
      // Session limit reached
      setTimeout(() => {
        setShowSpur(false);
        setSessionDone(true);
      }, 400);
    }
  };

  const startNewSession = () => {
    setSessionAnswered(0);
    setSessionDone(false);
    setShowSpur(true);
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-6">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{greeting},</p>
            <h1 className="text-2xl font-serif font-bold text-foreground">{profile.name}</h1>
          </div>
          <button onClick={onRestart} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground" title="Start over">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 space-y-5">
        {/* Daily tip */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Today's nudge</span>
          </div>
          <p className="text-foreground text-base leading-relaxed font-serif">{tip}</p>
        </motion.div>

        {/* Health goals */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Your Health Focus</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.healthGoals.map((id) => (
              <span key={id} className="px-3 py-1.5 bg-primary/10 text-foreground text-sm rounded-full border border-primary/20 font-medium">
                {HEALTH_LABEL[id] || id}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Passions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Your Passions</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile.passions.map((id) => (
              <span key={id} className="px-3 py-1.5 bg-accent/30 text-foreground text-sm rounded-full border border-accent font-medium">
                {PASSION_LABEL[id] || id}
              </span>
            ))}
          </div>
        </motion.div>

        {/* AI teaser */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-card rounded-2xl border border-primary/20 p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Coming soon — AI-powered</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-2">Your experience will build itself</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            We're applying AI to everything you share — goals, passions, self-assessments, and health records — to generate a fully personalized experience. The more you share, the more powerful your tools become.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { title: "Personalized coaching", desc: "an AI coach matched to your motivation style" },
              { title: "Custom content", desc: "articles, exercises, and plans woven around your passions" },
              { title: "Smart insights", desc: "AI-generated health nudges that evolve as you do" },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.title}</span> — {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Progress indicator */}
          <div className="bg-secondary/60 rounded-xl p-3 mt-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-foreground">Your data completeness</span>
              <span className="text-muted-foreground">
                {allSpurComplete && ehrConnected ? "100%" : allSpurComplete ? "70%" : `${Math.round((answeredCount / totalQuestions) * 50 + 20)}%`}
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: allSpurComplete && ehrConnected ? "100%" : allSpurComplete ? "70%" : `${Math.round((answeredCount / totalQuestions) * 50 + 20)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2 italic">
              {!allSpurComplete
                ? `Answer ${totalQuestions - answeredCount} more question${totalQuestions - answeredCount !== 1 ? "s" : ""} to unlock health data import.`
                : !ehrConnected
                ? "Assessment complete! Connect your health records to unlock full AI personalization."
                : "All set — your AI experience is being built around your unique profile."}
            </p>
          </div>
        </motion.div>

        {/* SPUR Assessment — 3 questions per session */}
        {!allSpurComplete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Deepen Your Profile</span>
              </div>
              <span className="text-xs text-muted-foreground">{answeredCount}/{totalQuestions}</span>
            </div>

            {sessionDone && !showSpur ? (
              /* Session complete — nudge to come back */
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-3">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-foreground" />
                </div>
                <h4 className="font-serif font-bold text-foreground mb-1 text-sm">Nice work!</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  You answered {QUESTIONS_PER_SESSION} questions this round. Only {totalQuestions - answeredCount} left to unlock health data import and full AI personalization.
                </p>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
                </div>
                <button onClick={startNewSession}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  Answer {Math.min(QUESTIONS_PER_SESSION, totalQuestions - answeredCount)} more now
                  <ChevronRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-muted-foreground mt-2">Or come back later — your progress is saved.</p>
              </motion.div>
            ) : !showSpur ? (
              /* Initial / return state */
              <>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {answeredCount === 0
                    ? "Answer 3 quick questions about your motivations. This helps our AI understand how to coach you — are you driven by community, data, autonomy, or support?"
                    : `You've answered ${answeredCount} so far. ${totalQuestions - answeredCount} more to go to unlock health data import.`}
                </p>
                {answeredCount > 0 && (
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
                  </div>
                )}
                <button onClick={startNewSession}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  {answeredCount > 0 ? `Answer ${Math.min(QUESTIONS_PER_SESSION, totalQuestions - answeredCount)} more` : "Start Quick Assessment"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              /* Active question */
              <AnimatePresence mode="wait">
                <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{SPUR_QUESTIONS[currentQ].icon} {SPUR_QUESTIONS[currentQ].dimension}</span>
                      <span>{sessionAnswered + 1} of {QUESTIONS_PER_SESSION} this round</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${((sessionAnswered + 1) / QUESTIONS_PER_SESSION) * 100}%` }} />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
                    {SPUR_QUESTIONS[currentQ].label}
                  </p>
                  <div className="space-y-2">
                    {LIKERT_OPTIONS.map((opt, idx) => (
                      <button key={idx}
                        onClick={() => handleSpurAnswer(SPUR_QUESTIONS[currentQ].id, idx)}
                        className="w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-all bg-background border-border text-foreground hover:border-primary/40">
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => { setShowSpur(false); setSessionDone(sessionAnswered > 0); }}
                    className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Save and continue later
                  </button>
                </motion.div>
              </AnimatePresence>
            )}
          </motion.div>
        )}

        {/* Health Data Import — only after all SPUR questions */}
        {allSpurComplete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-primary/20 p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-2 mb-3">
              <FileHeart className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                {ehrConnected ? "Records connected" : "Unlocked — Health Data"}
              </span>
            </div>

            {ehrConnected ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-7 h-7 text-foreground" />
                </div>
                <h4 className="font-serif font-bold text-foreground mb-1">Health records connected</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your baseline profile now includes medical history, medications, and lab data. AI personalization is fully activated.
                </p>
              </motion.div>
            ) : !showEhr ? (
              <>
                <h3 className="text-lg font-serif font-bold text-foreground mb-2">
                  Connect your health records
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Your assessment is complete — great work! Now connect your health records so AI can build your most personalized experience yet. We'll import medical history, medications, and lab results.
                </p>
                <div className="flex items-start gap-2 mb-4">
                  <Shield className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Your data is encrypted and never shared. You control what we see.
                  </p>
                </div>
                <button onClick={() => setShowEhr(true)}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  Choose a source
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : !ehrSource ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h3 className="text-base font-serif font-bold text-foreground mb-1">Choose a source</h3>
                <p className="text-xs text-muted-foreground mb-4">Select where to import your health records from.</p>
                <div className="space-y-2">
                  {EHR_SOURCES.map((source) => (
                    <button key={source.id} onClick={() => {
                      setEhrSource(source.id);
                      // Simulate connection
                      setTimeout(() => setEhrConnected(true), 1500);
                    }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:border-primary/40 transition-all text-left">
                      <span className="text-xl">{source.icon}</span>
                      <span className="text-sm font-medium text-foreground">{source.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowEhr(false)}
                  className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Not now
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <FileHeart className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground">Connecting and importing…</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a moment.</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Motto footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center pt-4 pb-8">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <Star className="w-3 h-3 text-primary" /><Star className="w-3 h-3 text-primary" /><Star className="w-3 h-3 text-primary" />
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
