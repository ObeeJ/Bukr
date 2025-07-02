import { motion } from "framer-motion";

// Modern animation variants
export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -30 },
  transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
};

export const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const hoverScale = {
  whileHover: { 
    scale: 1.05,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  },
  whileTap: { scale: 0.95 }
};

export const hoverLift = {
  whileHover: { 
    y: -8,
    boxShadow: "0 20px 60px -10px hsl(var(--primary) / 0.4)",
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
  }
};

export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 0 0 hsl(var(--primary) / 0.7)",
      "0 0 0 20px hsl(var(--primary) / 0)",
      "0 0 0 0 hsl(var(--primary) / 0)"
    ],
  },
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

// Pre-configured motion components
export const MotionDiv = motion.div;
export const MotionButton = motion.button;
export const MotionSpan = motion.span;
export const MotionH1 = motion.h1;
export const MotionH2 = motion.h2;
export const MotionH3 = motion.h3;
export const MotionP = motion.p;