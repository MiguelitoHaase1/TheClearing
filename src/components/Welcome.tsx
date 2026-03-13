import { motion } from "framer-motion";
import { TreePine, Sparkles } from "lucide-react";

interface WelcomeProps {
  onStart: () => void;
}

const Welcome = ({ onStart }: WelcomeProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full text-center"
      >
        {/* Logo mark */}
        <div className="mb-8 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-sage/10 flex items-center justify-center">
            <TreePine className="w-10 h-10 text-sage" strokeWidth={1.5} />
          </div>
        </div>

        <h1 className="text-4xl font-serif font-bold text-foreground mb-3 tracking-tight">
          The Clearing
        </h1>

        <p className="text-lg text-muted-foreground mb-2 font-serif italic">
          Discover your clearing.
        </p>

        <div className="w-12 h-px bg-sage/40 mx-auto my-6" />

        <p className="text-base text-muted-foreground leading-relaxed mb-4">
          When the noise about food goes quiet, something opens up — focus, strength, peace. A clearing that was always there.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-10">
          Three questions to start. Your <span className="text-primary font-medium">roots</span> ground you. Your <span className="text-sage font-medium">light</span> emerges.
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
