import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface WelcomeProps {
  onStart: () => void;
}

const Welcome = ({ onStart }: WelcomeProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background: the clearing itself — dark edges fading to warm light */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 45%, hsl(40 33% 97%) 0%, hsl(40 20% 93%) 50%, hsl(30 15% 82%) 80%, hsl(25 12% 70%) 100%)",
        }}
      />
      {/* Subtle light rays from center */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, hsl(40 50% 95% / 0.8) 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="max-w-md w-full text-center relative z-10"
      >
        {/* Logo mark — an opening, a breath, light emerging */}
        <div className="mb-8 flex justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="w-24 h-24 rounded-full relative flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, hsl(40 50% 97%) 0%, hsl(40 33% 92%) 40%, hsl(145 32% 42% / 0.15) 70%, hsl(17 62% 60% / 0.1) 100%)",
              boxShadow: "0 0 40px hsl(40 50% 95% / 0.6), 0 0 80px hsl(40 50% 95% / 0.3)",
            }}
          >
            {/* Inner glow — the clearing */}
            <div
              className="w-10 h-10 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(40 60% 98%) 0%, hsl(40 40% 94%) 60%, transparent 100%)",
                boxShadow: "0 0 20px hsl(40 50% 95% / 0.8)",
              }}
            />
          </motion.div>
        </div>

        <h1 className="text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">
          The Clearing
        </h1>

        <p className="text-lg text-muted-foreground mb-2 font-serif italic">
          Discover your clearing.
        </p>

        <div className="w-12 h-px bg-primary/30 mx-auto my-6" />

        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          You've been navigating thick, disorienting terrain — the constant noise about food, weight, guilt. Then one day, it goes quiet. And there it is: an opening. Breath. Light.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Three questions to start. Your <span className="text-primary font-medium">roots</span> are who you've always been. Your <span className="text-sage font-medium">light</span> is what emerges now that there's room.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl text-base font-semibold transition-colors hover:opacity-90"
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Step Into The Clearing
          </span>
        </motion.button>

        <p className="text-xs text-muted-foreground mt-6">
          90 seconds. Your data stays yours — always.
        </p>
      </motion.div>
    </div>
  );
};

export default Welcome;
