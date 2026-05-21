import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1 basis-full sm:basis-[min(100%,28rem)]">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl break-words">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground break-words">{description}</p>
        )}
      </div>
      {action ? (
        <div className="app-toolbar w-full shrink-0 sm:w-auto sm:max-w-full sm:justify-end">
          {action}
        </div>
      ) : null}
    </div>
  );
}
