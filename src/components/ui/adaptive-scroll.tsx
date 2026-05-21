import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type AdaptiveScrollProps = {
  children: ReactNode;
  className?: string;
  /** Teto de altura/largura; omita para o bloco crescer com o conteúdo. */
  maxHeight?: string;
  maxWidth?: string;
  axis?: "y" | "x" | "both";
  style?: CSSProperties;
};

/**
 * Rolagem só quando o conteúdo ultrapassa o teto (viewport, zoom ou max* passado).
 * Sem maxHeight/maxWidth, o container acompanha o tamanho do conteúdo.
 */
export function AdaptiveScroll({
  children,
  className,
  maxHeight,
  maxWidth,
  axis = "y",
  style,
}: AdaptiveScrollProps) {
  const capped = Boolean(maxHeight || maxWidth);
  const overflow = capped
    ? axis === "y"
      ? "overflow-y-auto overflow-x-visible"
      : axis === "x"
        ? "overflow-x-auto overflow-y-visible"
        : "overflow-auto"
    : undefined;

  return (
    <div
      className={cn("min-h-0 min-w-0", capped && "overscroll-contain", overflow, className)}
      style={{
        ...style,
        ...(maxHeight ? { maxHeight } : {}),
        ...(maxWidth ? { maxWidth } : {}),
      }}
    >
      {children}
    </div>
  );
}
