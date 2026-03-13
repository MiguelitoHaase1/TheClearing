import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wand2, Sparkles, Send, Loader2, ChevronRight, Check, X,
  Heart, Flame, Brain, Target, Play, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { UserProfile } from "@/pages/Index";

interface ExperiencesProps {
  profile: UserProfile;
  spurAnswers: Record<string, number>;
  ehrConnected: boolean;
}

interface ExperienceStep {
  instruction: string;
  inputType: "choice" | "text" | "slider" | "timer" | "checklist";
  options?: string[];
  duration?: number;
}

interface GeneratedExperience {
  title: string;
  description: string;
  type: string;
  emoji: string;
  personalization: string;
  steps: ExperienceStep[];
}

const PROMPT_SUGGESTIONS = [
  "A morning routine that combines my passions with my health goals",
  "A quick mindfulness game I can play on my commute",
  "A weekly challenge based on what I care about most",
  "Something creative that helps me reflect on my progress",
  "A breathing exercise that connects to my energy goals",
  "A fun quiz that teaches me something about my wellness style",
];

const Experiences = ({ profile, spurAnswers, ehrConnected }: ExperiencesProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [experiences, setExperiences] = useState<GeneratedExperience[]>([]);
  const [activeExperience, setActiveExperience] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [stepResponses, setStepResponses] = useState<Record<number, string>>({});
  const [completedExperiences, setCompletedExperiences] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [timerActive, setTimerActive] = useState(false);
  const [timerCount, setTimerCount] = useState(0);

  const safeSpurAnswers = spurAnswers || {};

  const generateExperience = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-experience", {
        body: { prompt: userPrompt, profile, spurAnswers: safeSpurAnswers },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setExperiences((prev) => [data, ...prev]);
      setPrompt("");
    } catch (e: any) {
      console.error("Generation error:", e);
      setError(e.message || "Failed to generate experience. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = () => generateExperience(prompt);

  const startExperience = (idx: number) => {
    setActiveExperience(idx);
    setActiveStep(0);
    setStepResponses({});
    setTextInput("");
    setTimerActive(false);
    setTimerCount(0);
  };

  const completeStep = (response: string) => {
    setStepResponses((prev) => ({ ...prev, [activeStep]: response }));
    const exp = experiences[activeExperience!];
    if (activeStep < exp.steps.length - 1) {
      setActiveStep((s) => s + 1);
      setTextInput("");
      setTimerActive(false);
      setTimerCount(0);
    } else {
      setCompletedExperiences((prev) => new Set([...prev, activeExperience!]));
      setActiveExperience(null);
    }
  };

  const startTimer = (duration: number) => {
    setTimerActive(true);
    setTimerCount(duration);
    const interval = setInterval(() => {
      setTimerCount((c) => {
        if (c <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const renderStepInput = (step: ExperienceStep) => {
    switch (step.inputType) {
      case "choice":
        return (
          <div className="space-y-2">
            {(step.options || []).map((opt, i) => (
              <button key={i} onClick={() => completeStep(opt)}
                className="w-full text-left px-4 py-3 rounded-xl border border-border bg-background text-foreground text-sm hover:border-primary/40 transition-all">
                {opt}
              </button>
            ))}
          </div>
        );
      case "text":
        return (
          <div className="space-y-3">
            <textarea value={textInput} onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your response..."
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3} />
            <button onClick={() => completeStep(textInput)} disabled={!textInput.trim()}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-40">
              Continue
            </button>
          </div>
        );
      case "slider":
        return (
          <div className="space-y-3">
            <input type="range" min={1} max={10} defaultValue={5}
              className="w-full accent-primary"
              onChange={(e) => setTextInput(e.target.value)} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span><span>5</span><span>10</span>
            </div>
            <button onClick={() => completeStep(textInput || "5")}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
              Continue
            </button>
          </div>
        );
      case "timer":
        const dur = step.duration || 30;
        return (
          <div className="text-center space-y-4">
            <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold transition-all duration-1000 ${timerActive ? "bg-primary/20 text-primary scale-110" : "bg-secondary text-foreground"}`}>
              {timerActive ? timerCount : dur}
            </div>
            {!timerActive && timerCount === 0 ? (
              <button onClick={() => startTimer(dur)}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                Start timer
              </button>
            ) : timerCount === 0 ? (
              <button onClick={() => completeStep("completed")}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
                Done ✓
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">Focus…</p>
            )}
          </div>
        );
      case "checklist":
        return (
          <div className="space-y-2">
            {(step.options || ["Item 1", "Item 2", "Item 3"]).map((opt, i) => (
              <label key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background cursor-pointer hover:border-primary/40 transition-all">
                <input type="checkbox" className="accent-primary w-4 h-4" />
                <span className="text-sm text-foreground">{opt}</span>
              </label>
            ))}
            <button onClick={() => completeStep("checked")}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold mt-2">
              Continue
            </button>
          </div>
        );
      default:
        return (
          <button onClick={() => completeStep("done")}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            Continue
          </button>
        );
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 pt-8 pb-2">
        <div className="max-w-lg mx-auto">
          <p className="text-xs text-sage font-semibold uppercase tracking-wider">Your Light</p>
          <h1 className="text-2xl font-serif font-bold text-foreground">What emerges when the noise clears</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Describe what you want — we'll build it around who you are.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 space-y-5 mt-4">
        {/* Profile context strip */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-1.5">
          {profile.healthGoals.slice(0, 3).map((id) => (
            <span key={id} className="px-2 py-1 bg-primary/10 text-foreground text-[10px] rounded-full border border-primary/20 font-medium flex items-center gap-1">
              <Heart className="w-2.5 h-2.5 text-primary" />{id}
            </span>
          ))}
          {profile.passions.slice(0, 3).map((id) => (
            <span key={id} className="px-2 py-1 bg-accent/30 text-foreground text-[10px] rounded-full border border-accent font-medium flex items-center gap-1">
              <Flame className="w-2.5 h-2.5 text-primary" />{id}
            </span>
          ))}
          {Object.keys(safeSpurAnswers).length > 0 && (
            <span className="px-2 py-1 bg-secondary text-foreground text-[10px] rounded-full border border-border font-medium flex items-center gap-1">
              <Brain className="w-2.5 h-2.5 text-primary" />SPUR profile
            </span>
          )}
        </motion.div>

        {/* Prompt input */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-primary/20 p-5" style={{ boxShadow: "var(--shadow-soft)" }}>
          <div className="flex items-center gap-2 mb-3">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Build an experience</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            Tell us what you'd like and we'll generate a personalized experience using your profile data.
          </p>

          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isGenerating) { e.preventDefault(); handleSubmit(); } }}
              placeholder="I want a morning routine that combines cooking with my energy goals..."
              className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              rows={3}
              disabled={isGenerating}
            />
            <button
              onClick={handleSubmit}
              disabled={isGenerating || !prompt.trim()}
              className="absolute bottom-3 right-3 p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-all"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-destructive mt-2">{error}</p>
          )}

          {/* Suggestion chips */}
          {experiences.length === 0 && !isGenerating && (
            <div className="mt-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Based on your data and persona, we recommend…</p>
              <div className="flex flex-wrap gap-2">
                {PROMPT_SUGGESTIONS.slice(0, 4).map((s, i) => (
                  <button key={i} onClick={() => { setPrompt(s); }}
                    className="px-3 py-1.5 bg-secondary text-foreground text-[11px] rounded-full border border-border hover:border-primary/30 transition-all text-left leading-tight">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Generating state */}
        {isGenerating && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-border p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 animate-pulse">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-serif font-semibold text-foreground">Building your experience…</p>
            <p className="text-xs text-muted-foreground mt-1">Weaving your goals, passions, and profile into something unique.</p>
          </motion.div>
        )}

        {/* Generated experiences */}
        <AnimatePresence>
          {experiences.map((exp, idx) => {
            const isActive = activeExperience === idx;
            const isCompleted = completedExperiences.has(idx);

            return (
              <motion.div
                key={`${exp.title}-${idx}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl border border-border overflow-hidden"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Experience header */}
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-xl">
                      {exp.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{exp.title}</h3>
                        {isCompleted && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Done</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{exp.description}</p>
                      <p className="text-[10px] text-primary font-medium mt-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {exp.personalization}
                      </p>
                    </div>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => startExperience(idx)}
                      className={`mt-3 w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        isCompleted
                          ? "bg-secondary text-foreground hover:bg-secondary/80"
                          : "bg-primary text-primary-foreground hover:opacity-90"
                      }`}
                    >
                      {isCompleted ? (
                        <><RotateCcw className="w-3 h-3" /> Try again</>
                      ) : (
                        <><Play className="w-3 h-3" /> Start experience</>
                      )}
                    </button>
                  )}
                </div>

                {/* Active experience */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="border-t border-border"
                    >
                      <div className="p-5 relative">
                        <button
                          onClick={() => setActiveExperience(null)}
                          className="absolute top-3 right-3 p-1 rounded-md hover:bg-secondary text-muted-foreground"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Step progress */}
                        <div className="flex gap-1 mb-4">
                          {exp.steps.map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                              i < activeStep ? "bg-primary" : i === activeStep ? "bg-primary/50" : "bg-border"
                            }`} />
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1">
                          Step {activeStep + 1} of {exp.steps.length}
                        </p>

                        <AnimatePresence mode="wait">
                          <motion.div key={activeStep} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                            <p className="text-sm font-medium text-foreground mb-4 leading-relaxed">
                              {exp.steps[activeStep].instruction}
                            </p>
                            {renderStepInput(exp.steps[activeStep])}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {experiences.length === 0 && !isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-center pt-6 pb-8">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <Wand2 className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground font-serif italic">
              "I forgot I had room for this." Prompt above to discover what emerges.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Experiences;
