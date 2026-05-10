import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export function LandingFlowRibbon({ className }: Props) {
  return (
    <div
      className={cn(
        "landing-flow-ribbon relative h-14 w-full overflow-hidden rounded-2xl bg-[#F9F9F9]",
        className,
      )}
      aria-hidden
    >
      <div className="landing-flow-ribbon-layer absolute inset-0 opacity-70" />
    </div>
  );
}
