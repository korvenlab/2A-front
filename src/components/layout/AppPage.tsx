import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Container padrão das telas autenticadas — evita clipping em zoom e telas estreitas. */
export function AppPage({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("app-page", className)}>{children}</div>;
}

/** Barra de filtros / botões: quebra linha em vez de esconder controles. */
export function AppToolbar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("app-toolbar", className)}>{children}</div>;
}

/** Cartão de tabela com scroll horizontal quando necessário. */
export function AppTableCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("app-table-card", className)}>{children}</div>;
}
