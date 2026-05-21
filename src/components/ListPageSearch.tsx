import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

type ListPageSearchProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  hint: ReactNode;
  resultText: string;
  ariaLabel: string;
};

/** Barra de busca de listagem (mesmo padrão visual da tela Indústrias). */
export function ListPageSearch({
  value,
  onValueChange,
  placeholder,
  hint,
  resultText,
  ariaLabel,
}: ListPageSearchProps) {
  return (
    <div className="space-y-3">
      <div className="relative w-full max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9 h-11"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          autoComplete="off"
          aria-label={ariaLabel}
        />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <p className="text-sm text-muted-foreground">{resultText}</p>
    </div>
  );
}
