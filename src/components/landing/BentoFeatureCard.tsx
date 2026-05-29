import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  gridClass?: string;
};

export function BentoFeatureCard({ title, description, icon: Icon, gridClass }: Props) {
  return (
    <article
      className={cn(
        "landing-bento-cell group relative rounded-[20px] p-[1px] md:rounded-[24px]",
        gridClass,
      )}
    >
      <div className="landing-bento-bridge pointer-events-none absolute inset-0 rounded-[inherit]" />
      <div className="landing-bento-inner relative flex h-full min-h-[140px] flex-col gap-3 rounded-[19px] bg-[#F9F9F9] p-6 md:rounded-[23px] md:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#003366]/10 bg-white shadow-[0_6px_28px_rgba(0,51,102,0.12)]">
            <Icon className="h-5 w-5 text-[#007AFF]" aria-hidden strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold tracking-tight text-[#003366] md:text-xl">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">{description}</p>
          </div>
        </div>
      </div>
    </article>
  );
}
