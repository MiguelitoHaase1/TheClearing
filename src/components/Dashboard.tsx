import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Flame, Sun, RotateCcw, Sparkles, Star,
  ChevronRight, Check, BrainCircuit, Shield, FileHeart,
  User, Eye,
} from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { UserProfile } from "@/pages/Index";

interface DashboardProps {
  profile: UserProfile;
  spurAnswers: Record<string, number>;
  setSpurAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ehrConnected: boolean;
  setEhrConnected: React.Dispatch<React.SetStateAction<boolean>>;
  onRestart: () => void;
  onGoToLight: () => void;
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

// Persona generation
const PERSONA_ARCHETYPES: { name: string; adjective: string; description: string; dominant: string }[] = [
  { name: "The Mindful Navigator", adjective: "Intentional", dominant: "Psychological", description: "You lead with purpose. Every choice is deliberate, every plan meaningful. You don't drift — you steer." },
  { name: "The Evidence Seeker", adjective: "Analytical", dominant: "Rational", description: "You want proof, not promises. Data drives your decisions and you trust what you can measure." },
  { name: "The Community Catalyst", adjective: "Connected", dominant: "Social", description: "Your wellbeing is tied to the people around you. Relationships fuel your motivation." },
  { name: "The Practical Builder", adjective: "Resourceful", dominant: "Utility", description: "You optimize for what works. Convenience and capability matter more than perfection." },
];

const BLENDED_PERSONAS: { combo: string; name: string; adjective: string; description: string }[] = [
  { combo: "Psychological+Rational", name: "The Strategic Visionary", adjective: "Focused & Sharp", description: "Purpose meets precision. You set meaningful goals and back them with evidence." },
  { combo: "Psychological+Social", name: "The Heart-Led Leader", adjective: "Purposeful & Warm", description: "You lead with conviction and carry others with you. Your commitment is contagious." },
  { combo: "Rational+Utility", name: "The Systems Thinker", adjective: "Efficient & Informed", description: "You see patterns others miss and build routines that actually stick." },
  { combo: "Social+Utility", name: "The Adaptive Connector", adjective: "Flexible & Social", description: "You thrive in community and adapt your approach to fit any situation." },
  { combo: "Psychological+Utility", name: "The Determined Doer", adjective: "Driven & Practical", description: "You know what you want and you build the systems to get there." },
  { combo: "Rational+Social", name: "The Informed Advocate", adjective: "Knowledgeable & Empathetic", description: "You combine understanding with compassion — for yourself and others." },
];

function computePersona(spurAnswers: Record<string, number>) {
  const safe = spurAnswers || {};
  const dims: Record<string, number[]> = { Psychological: [], Rational: [], Social: [], Utility: [] };
  SPUR_QUESTIONS.forEach((q) => {
    if (safe[q.id] !== undefined) {
      dims[q.dimension].push(safe[q.id]);
    }
  });

  const avgScores: Record<string, number> = {};
  for (const [dim, scores] of Object.entries(dims)) {
    avgScores[dim] = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  // Sort dimensions by score
  const sorted = Object.entries(avgScores).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const second = sorted[1];

  // If we have enough data, try blended persona
  if (top[1] > 0 && second[1] > 0 && Math.abs(top[1] - second[1]) < 1.5) {
    const comboKey = [top[0], second[0]].sort().join("+");
    const blended = BLENDED_PERSONAS.find((p) => p.combo === comboKey);
    if (blended) return { ...blended, scores: avgScores, hasData: true };
  }

  if (top[1] > 0) {
    const arch = PERSONA_ARCHETYPES.find((p) => p.dominant === top[0]);
    if (arch) return { ...arch, scores: avgScores, hasData: true };
  }

  return { name: "Discovering...", adjective: "Emerging", description: "Answer a few questions and we'll reveal your unique wellness persona.", scores: avgScores, hasData: false };
}

function getRadarData(
  spurAnswers: Record<string, number>,
  healthGoals: string[],
  passions: string[],
) {
  const safe = spurAnswers || {};
  const dims: Record<string, number[]> = { Psychological: [], Rational: [], Social: [], Utility: [] };
  SPUR_QUESTIONS.forEach((q) => {
    if (safe[q.id] !== undefined) dims[q.dimension].push(safe[q.id]);
  });

  return [
    { axis: "🧠 Psychological", value: dims.Psychological.length > 0 ? (dims.Psychological.reduce((a, b) => a + b, 0) / dims.Psychological.length / 4) * 100 : 10, fullMark: 100 },
    { axis: "💡 Rational", value: dims.Rational.length > 0 ? (dims.Rational.reduce((a, b) => a + b, 0) / dims.Rational.length / 4) * 100 : 10, fullMark: 100 },
    { axis: "❤️ Health Focus", value: Math.min(healthGoals.length * 18, 100), fullMark: 100 },
    { axis: "👥 Social", value: dims.Social.length > 0 ? (dims.Social.reduce((a, b) => a + b, 0) / dims.Social.length / 4) * 100 : 10, fullMark: 100 },
    { axis: "⚙️ Utility", value: dims.Utility.length > 0 ? (dims.Utility.reduce((a, b) => a + b, 0) / dims.Utility.length / 4) * 100 : 10, fullMark: 100 },
    { axis: "🔥 Passions", value: Math.min(passions.length * 14, 100), fullMark: 100 },
  ];
}

const Dashboard = ({ profile, spurAnswers, setSpurAnswers, ehrConnected, setEhrConnected, onRestart, onGoToLight }: DashboardProps) => {
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

  const safeSpurAnswers = spurAnswers || {};
  const nextUnansweredIdx = SPUR_QUESTIONS.findIndex((q) => safeSpurAnswers[q.id] === undefined);
  const currentQ = nextUnansweredIdx >= 0 ? nextUnansweredIdx : 0;

  const persona = useMemo(() => computePersona(spurAnswers), [spurAnswers]);
  const radarData = useMemo(() => getRadarData(spurAnswers, profile.healthGoals, profile.passions), [spurAnswers, profile.healthGoals, profile.passions]);

  const handleSpurAnswer = (questionId: string, answerIdx: number) => {
    const newAnswers = { ...spurAnswers, [questionId]: answerIdx };
    setSpurAnswers(newAnswers);
    const newSessionCount = sessionAnswered + 1;
    setSessionAnswered(newSessionCount);

    const newTotal = Object.keys(newAnswers || {}).length;

    if (newTotal >= totalQuestions) {
      setTimeout(() => { setShowSpur(false); setSessionDone(false); }, 400);
    } else if (newSessionCount >= QUESTIONS_PER_SESSION) {
      setTimeout(() => { setShowSpur(false); setSessionDone(true); }, 400);
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
      <div className="px-6 pt-8 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider">Your Roots</p>
            <h1 className="text-2xl font-serif font-bold text-foreground">{greeting}, {profile.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Who you are under the noise.</p>
          </div>
          <button onClick={onRestart} className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground" title="Start over">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 space-y-5">

        {/* Daily nudge */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sun className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Today's nudge</span>
          </div>
          <p className="text-foreground text-base leading-relaxed font-serif">{tip}</p>
        </motion.div>

        {/* Your Light nudge */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={onGoToLight}
          className="w-full bg-sage/10 rounded-2xl border border-sage/25 p-5 text-left group hover:border-sage/40 transition-all"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center flex-shrink-0">
              <Sun className="w-5 h-5 text-sage" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sage font-semibold uppercase tracking-wider mb-0.5">Your Light</p>
              <p className="text-sm font-serif font-semibold text-foreground">The noise is clearing. What will you fill the space with?</p>
            </div>
            <ChevronRight className="w-4 h-4 text-sage group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </div>
        </motion.button>

        {/* ===== PERSONA CARD + RADAR ===== */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl border border-primary/20 overflow-hidden" style={{ boxShadow: "var(--shadow-soft)" }}>
          
          {/* Persona header */}
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your Persona</span>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-serif font-bold text-primary">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground font-medium mb-0.5">{persona.adjective}</p>
                <h2 className="text-lg font-serif font-bold text-foreground leading-tight">{persona.name}</h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{persona.description}</p>
              </div>
            </div>
          </div>

          {/* Radar chart */}
          <div className="px-2 pb-2">
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="You"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Profile pills */}
          <div className="px-5 pb-5">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {profile.healthGoals.map((id) => (
                <span key={id} className="px-2.5 py-1 bg-primary/10 text-foreground text-[11px] rounded-full border border-primary/20 font-medium flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 text-primary" />
                  {HEALTH_LABEL[id] || id}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.passions.map((id) => (
                <span key={id} className="px-2.5 py-1 bg-accent/30 text-foreground text-[11px] rounded-full border border-accent font-medium flex items-center gap-1">
                  <Flame className="w-2.5 h-2.5 text-primary" />
                  {PASSION_LABEL[id] || id}
                </span>
              ))}
            </div>
            {answeredCount > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2.5 flex items-center gap-1">
                <Eye className="w-3 h-3" />
                This is your data. You control what you share and when.
              </p>
            )}
          </div>
        </motion.div>

        {/* AI teaser — what sharing more unlocks */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-primary/20 p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Your experience evolves</span>
          </div>
          <h3 className="text-lg font-serif font-bold text-foreground mb-2">
            {persona.hasData ? "Keep deepening your persona" : "Deepen your persona with a few questions"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Every answer sharpens your persona and reshapes the radar above. The deeper your profile, the more your experiences transform — coaching style, content, and mini-apps all adapt to who you truly are.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { title: "Persona coaching", desc: "an AI coach matched to your motivation archetype", unlocked: persona.hasData },
              { title: "Custom experiences", desc: "mini-apps woven around your passions and goals", unlocked: profile.passions.length > 0 },
              { title: "Smart health nudges", desc: "AI insights that evolve as your profile deepens", unlocked: allSpurComplete && ehrConnected },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-2">
                {item.unlocked 
                  ? <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  : <Sparkles className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />}
                <p className={`text-xs ${item.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className="font-semibold">{item.title}</span> — {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Data completeness */}
          <div className="bg-secondary/60 rounded-xl p-3 mt-2">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium text-foreground">Profile completeness</span>
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
                : "All set — your AI experience is fully active."}
            </p>
          </div>
        </motion.div>

        {/* SPUR Assessment — 3 questions per session */}
        {!allSpurComplete && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-card rounded-2xl border border-border p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Deepen Your Profile</span>
              </div>
              <span className="text-xs text-muted-foreground">{answeredCount}/{totalQuestions}</span>
            </div>

            {sessionDone && !showSpur ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-3">
                <div className="w-10 h-10 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-5 h-5 text-foreground" />
                </div>
                <h4 className="font-serif font-bold text-foreground mb-1 text-sm">Nice work!</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-1">
                  Your persona updated — check the radar above. 
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {totalQuestions - answeredCount} more to unlock health data import.
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
              <>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {answeredCount === 0
                    ? "3 quick questions about your motivations. Your radar profile and persona update instantly — you'll see yourself reflected back immediately."
                    : `You've answered ${answeredCount}. ${totalQuestions - answeredCount} more to sharpen your persona and unlock health data.`}
                </p>
                {answeredCount > 0 && (
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(answeredCount / totalQuestions) * 100}%` }} />
                  </div>
                )}
                <button onClick={startNewSession}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                  {answeredCount > 0 ? `Answer ${Math.min(QUESTIONS_PER_SESSION, totalQuestions - answeredCount)} more` : "Start — just 3 questions"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
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
                  Your profile is complete. AI personalization is fully active — check your Experiences tab.
                </p>
              </motion.div>
            ) : !showEhr ? (
              <>
                <h3 className="text-lg font-serif font-bold text-foreground mb-2">
                  Connect your health records
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  Your assessment is complete — great work! Now connect your records to unlock the final layer of personalization.
                </p>
                <div className="flex items-start gap-2 mb-4">
                  <Shield className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    This is your data — encrypted, never shared. You control what we see.
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

        {/* Footer */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground italic font-serif">
            Your roots ground you. The clearing was always there.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
