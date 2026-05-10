import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = HTMLMotionProps<"div"> & {
  children: React.ReactNode;
  delay?: number;
};

export function LandingScrollReveal({ children, className, delay = 0, ...rest }: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={
        reduceMotion ? { opacity: 1, y: 0, rotateZ: 0 } : { opacity: 0, y: 26, rotateZ: -1.2 }
      }
      whileInView={{ opacity: 1, y: 0, rotateZ: 0 }}
      viewport={{ once: true, margin: "-64px 0px -90px 0px", amount: 0.12 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 270, damping: 28, mass: 0.88, delay }
      }
      {...rest}
    >
      {children}
    </motion.div>
  );
}
