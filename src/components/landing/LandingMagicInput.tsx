import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPE_MS = 36;
const DELETE_MS = 20;
const PAUSE_END_MS = 2000;
const PAUSE_START_MS = 400;

/** Somente 2AVendas — sem referências a outros produtos. */
const PHRASES = [
  "Gere um orçamento com itens do catálogo para enviar ao cliente…",
  "Registre uma visita comercial e ligue ao funil de oportunidades…",
  "Acompanhe NF-e e status dos pedidos por cliente ou vendedor…",
  "Configure comissões por organização e convites com percentual padrão…",
  "Veja eventos de outreach e próximos follow-ups na conta…",
  "Cliente monta o pedido pelo seu link 2avendas.com — tudo no painel.",
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
          "landing-magic-shell rounded-[4px] border border-[#cbd5e1] bg-white px-1 py-1 shadow-sm transition-[border-color] duration-300",
          focused && "border-[#0056b3]/50",
        )}
      >
        <div className="relative flex items-center gap-2 rounded-[3px] px-3 py-2.5 md:px-4 md:py-3">
          <Sparkles
            className={cn(
              "h-4 w-4 shrink-0 transition-colors duration-300 md:h-5 md:w-5",
              focused ? "text-[#0056b3]" : "text-[#64748b]",
            )}
            aria-hidden
          />
          <div className="relative min-h-[44px] flex-1">
            {showGhost ? (
              <div
                className="pointer-events-none absolute inset-0 flex items-center text-left font-mono text-[14px] leading-relaxed text-[#64748b] md:text-[15px]"
                aria-hidden
              >
                <span>{ghostText}</span>
                <span className="ml-0.5 inline-block h-[1.1em] w-px animate-pulse bg-[#0056b3]/85 align-middle" />
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
                "relative z-10 w-full bg-transparent font-mono text-[14px] leading-relaxed text-[#002b5b] outline-none md:text-[15px]",
                showGhost ? "[&::placeholder]:text-transparent" : "",
              )}
              placeholder={focused && !value ? "Digite e pressione Enter…" : " "}
              aria-label="Campo de exemplo — pergunte ao 2AVendas"
            />
          </div>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 460, damping: 22 }}
            className="shrink-0 rounded-[4px] bg-[#0056b3] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-[#004494]"
          >
            Enviar
          </motion.button>
        </div>
      </div>
    </form>
  );
}
