import { FormEvent, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_MS = 36;
const DELETE_MS = 20;
const PAUSE_END_MS = 2000;
const PAUSE_START_MS = 400;

/** Somente 2AVendas — sem referências a outros produtos. */
const PHRASES = [
  "Distribua funil e oportunidades entre a equipe externa…",
  "Gere um orçamento com itens do catálogo para enviar ao cliente…",
  "Registre uma visita comercial e ligue ao pipeline…",
  "Acompanhe NF-e e status dos pedidos por cliente ou vendedor…",
  "Configure comissões por organização e convites com percentual padrão…",
  "Veja eventos de outreach e próximos follow-ups…",
  "Ative o portal: cliente monta pedido pelo link e você vê no painel.",
];

type Props = {
  className?: string;
};

export function LandingMagicInput({ className }: Props) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("");
  const [ghostText, setGhostText] = useState("");

  const showGhost = !value && !focused;

  useEffect(() => {
    if (!showGhost) {
      setGhostText("");
      return;
    }

    let cancelled = false;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;

    function schedule(ms: number, fn: () => void) {
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
      timeoutId = globalThis.setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    }

    function step() {
      if (cancelled || !showGhost) return;
      const phrase = PHRASES[phraseIndex] ?? "";

      if (!deleting) {
        if (charIndex < phrase.length) {
          charIndex += 1;
          setGhostText(phrase.slice(0, charIndex));
          schedule(TYPE_MS, step);
        } else {
          schedule(PAUSE_END_MS, () => {
            deleting = true;
            step();
          });
        }
      } else if (charIndex > 0) {
        charIndex -= 1;
        setGhostText(phrase.slice(0, charIndex));
        schedule(DELETE_MS, step);
      } else {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % PHRASES.length;
        schedule(PAUSE_START_MS, step);
      }
    }

    step();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) globalThis.clearTimeout(timeoutId);
    };
  }, [showGhost]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    toast.message("2AVendas", {
      description:
        "Assistente em evolução — por agora use o app após criar conta. Sua mensagem: " +
        q.slice(0, 120) +
        (q.length > 120 ? "…" : ""),
    });
    setValue("");
  }

  return (
    <form
      onSubmit={submit}
      className={cn("relative mx-auto w-full max-w-2xl", className)}
      aria-label="Experimente perguntar ao 2AVendas"
    >
      <div
        data-focused={focused ? "true" : "false"}
        className={cn(
          "landing-magic-shell landing-magic-float rounded-2xl border border-[rgba(0,122,255,0.22)] bg-white px-1.5 py-1.5 transition-[border-color] duration-300",
          focused && "border-[#007AFF]/55",
        )}
      >
        <div className="relative flex items-center gap-2 rounded-[14px] px-3 py-2.5 md:px-4 md:py-3">
          <Sparkles
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-300 md:h-5 md:w-5",
              focused ? "text-[#007AFF]" : "text-[#9CA3AF]",
            )}
            aria-hidden
          />
          <div className="relative min-h-[44px] flex-1">
            {showGhost ? (
              <div
                className="pointer-events-none absolute inset-0 flex items-center text-left font-mono text-[14px] leading-relaxed text-[#9CA3AF] md:text-[15px]"
                aria-hidden
              >
                <span>{ghostText}</span>
                <span className="ml-0.5 inline-block h-[1.1em] w-px animate-pulse bg-[#007AFF]/90 align-middle" />
              </div>
            ) : null}
            <input
              type="search"
              name="landing-ai-q"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className={cn(
                "relative z-10 w-full bg-transparent font-mono text-[14px] leading-relaxed text-[#003366] outline-none md:text-[15px]",
                showGhost ? "[&::placeholder]:text-transparent" : "",
              )}
              placeholder={focused && !value ? "Digite e pressione Enter…" : " "}
              aria-label="Campo de exemplo — pergunte ao 2AVendas"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[#007AFF] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_2px_12px_rgba(0,122,255,0.25)] outline-none transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#0066DB] hover:shadow-[0_4px_20px_rgba(0,122,255,0.35)] hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
          >
            Enviar
          </button>
        </div>
      </div>
    </form>
  );
}
