import { type ReactNode, useCallback, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  strength?: number;
  radius?: number;
};

export function MagneticWrap({ children, className, strength = 0.22, radius = 72 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number>(0);
  const [xy, setXy] = useState({ x: 0, y: 0 });

  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        setXy({ x: 0, y: 0 });
        return;
      }
      const nx = dx * strength;
      const ny = dy * strength;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => setXy({ x: nx, y: ny }));
    },
    [radius, strength],
  );

  const onLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setXy({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={ref}
      className={cn("inline-flex", className)}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        style={{
          transform: `translate3d(${xy.x}px, ${xy.y}px, 0)`,
          transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
