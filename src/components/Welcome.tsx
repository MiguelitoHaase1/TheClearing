import { motion } from "framer-motion";
import { Heart, Sparkles } from "lucide-react";

interface WelcomeProps {
  onStart: () => void;
}

const Welcome = ({ onStart }: WelcomeProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center"
      >
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Heart className="w-10 h-10 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">
          Kaitality
        </h1>

        <p className="text-lg text-muted-foreground mb-2 font-serif italic">
          Sustained Success
        </p>

        <div className="w-12 h-px bg-primary/40 mx-auto my-6" />

        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          Three questions. That's all it takes to start building an experience that's uniquely yours.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          You own your data. You control what you share. The more you put in, the more the app transforms around you.
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl text-base font-semibold transition-colors hover:opacity-90"
        >
          <span className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Begin Your Journey
          </span>
        </motion.button>

        <p className="text-xs text-muted-foreground mt-6">
          90 seconds to a product that knows you. Your data stays yours — always.
        </p>
      </motion.div>
    </div>
  );
};

export default Welcome;
