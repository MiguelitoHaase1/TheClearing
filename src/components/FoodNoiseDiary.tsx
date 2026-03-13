import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { UserProfile } from "@/pages/Index";

interface FoodNoiseDiaryProps {
  profile: UserProfile;
  spurAnswers: Record<string, number>;
  persona: { name: string; description: string } | null;
}

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/food-noise-chat`;

// Coach archetypes matched to SPUR persona
const COACH_PROFILES: Record<string, { name: string; style: string; emoji: string }> = {
  "The Mindful Navigator": { name: "Sage", style: "grounding & intentional", emoji: "🧭" },
  "The Evidence Seeker": { name: "Lena", style: "clear & evidence-based", emoji: "📊" },
  "The Community Catalyst": { name: "Maya", style: "warm & connected", emoji: "🤝" },
  "The Practical Builder": { name: "Kit", style: "practical & action-oriented", emoji: "🔧" },
  "The Strategic Visionary": { name: "Sage", style: "focused & precise", emoji: "🎯" },
  "The Heart-Led Leader": { name: "Maya", style: "purposeful & empathetic", emoji: "💛" },
  "The Systems Thinker": { name: "Lena", style: "structured & insightful", emoji: "🧩" },
  "The Adaptive Connector": { name: "Kit", style: "flexible & supportive", emoji: "🌊" },
  "The Determined Doer": { name: "Kit", style: "driven & encouraging", emoji: "⚡" },
  "The Informed Advocate": { name: "Lena", style: "knowledgeable & compassionate", emoji: "🌿" },
};

const DEFAULT_COACH = { name: "Haven", style: "gentle & curious", emoji: "✨" };

const FoodNoiseDiary = ({ profile, spurAnswers, persona }: FoodNoiseDiaryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const coach = useMemo(() => {
    if (persona?.name && COACH_PROFILES[persona.name]) {
      return COACH_PROFILES[persona.name];
    }
    return DEFAULT_COACH;
  }, [persona]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          profile,
          spurAnswers,
          persona,
          coach,
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to connect to coach");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e: any) {
      console.error("Food noise chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now. Let's try again in a moment." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [profile, spurAnswers, persona, coach]);

  const startConversation = useCallback(() => {
    setHasStarted(true);
    setIsOpen(true);
    const initialMessages: Msg[] = [];
    streamChat(initialMessages);
  }, [streamChat]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    streamChat(newMessages);
  }, [input, isLoading, messages, streamChat]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card rounded-2xl border border-sage/25 p-5 overflow-hidden"
        style={{ boxShadow: "var(--shadow-soft)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-sage" />
          <span className="text-xs font-semibold text-sage uppercase tracking-wider">Food Noise Diary</span>
        </div>

        {/* Coach intro */}
        <div className="flex items-center gap-3 mb-3 p-3 bg-sage/8 rounded-xl border border-sage/15">
          <div className="w-10 h-10 rounded-full bg-sage/15 flex items-center justify-center flex-shrink-0 text-lg">
            {coach.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-serif font-bold text-foreground">{coach.name}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {persona?.name
                ? <>Your coach — selected for your <span className="text-sage font-medium">{persona.name}</span> persona. {coach.style} approach.</>
                : <>Your personal coach — {coach.style} approach. Matched to you as your persona deepens.</>
              }
            </p>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-sage flex-shrink-0" />
        </div>

        <h3 className="text-base font-serif font-bold text-foreground mb-1.5">
          {hasStarted ? `Pick up with ${coach.name}` : "Your daily 5-minute check-in"}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          {hasStarted
            ? `${coach.name} is here whenever you're ready to continue.`
            : `${coach.name} will guide you through a quiet conversation about what's shifting inside — listening, reflecting, and helping you notice the clearing.`}
        </p>
        <button
          onClick={hasStarted ? () => setIsOpen(true) : startConversation}
          className="w-full py-3 bg-sage text-accent-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {hasStarted ? `Resume with ${coach.name}` : `Start with ${coach.name}`}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border border-sage/25 overflow-hidden"
      style={{ boxShadow: "var(--shadow-soft)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sage/15 flex items-center justify-center text-sm">
            {coach.emoji}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{coach.name}</p>
            <p className="text-[10px] text-muted-foreground">{coach.style} coach</p>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="h-72 overflow-y-auto px-4 py-3 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-sage/10 text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none [&>p]:m-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-sage/10 px-3.5 py-2.5 rounded-2xl rounded-bl-md">
              <Loader2 className="w-4 h-4 text-sage animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Talk to ${coach.name}...`}
            className="flex-1 px-3 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sage/30"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-xl bg-sage text-accent-foreground disabled:opacity-40 hover:opacity-90 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default FoodNoiseDiary;
