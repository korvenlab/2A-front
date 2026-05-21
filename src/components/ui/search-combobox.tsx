import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { matchesFieldsSearch } from "@/lib/text-search";

export type SearchComboboxProps<T> = {
  items: T[];
  value: string;
  onValueChange: (value: string, item: T | undefined) => void;
  getItemId: (item: T) => string;
  getItemLabel: (item: T) => string;
  getSearchFields: (item: T) => (string | null | undefined)[];
  renderItem?: (item: T) => ReactNode;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  /** Largura da lista (popover); padrão acompanha o campo. */
  contentClassName?: string;
  /** Item fixo no topo (ex.: «Sem cliente»). */
  leadingOption?: { value: string; label: string };
};

export function SearchCombobox<T>({
  items,
  value,
  onValueChange,
  getItemId,
  getItemLabel,
  getSearchFields,
  renderItem,
  placeholder = "Digite para buscar…",
  emptyMessage = "Nenhum resultado para essa busca.",
  disabled = false,
  className,
  inputClassName,
  listClassName,
  contentClassName,
  leadingOption,
}: SearchComboboxProps<T>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => items.find((item) => getItemId(item) === value),
    [items, value, getItemId],
  );

  useEffect(() => {
    if (leadingOption && value === leadingOption.value) {
      if (!open) setQuery(leadingOption.label);
      return;
    }
    if (!value) {
      setQuery("");
      return;
    }
    if (selected && !open) {
      setQuery(getItemLabel(selected));
    }
  }, [value, selected, open, getItemLabel, leadingOption]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items.filter((item) => matchesFieldsSearch(getSearchFields(item), query));
  }, [items, query, getSearchFields]);

  const handleInputChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    if (value) {
      const label = selected ? getItemLabel(selected) : "";
      if (next.trim() !== label.trim()) {
        onValueChange("", undefined);
      }
    }
  };

  const handleSelect = (item: T) => {
    const id = getItemId(item);
    onValueChange(id, item);
    setQuery(getItemLabel(item));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative w-full", className)}>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            disabled={disabled}
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={cn("h-10 pl-9", inputClassName)}
            autoComplete="off"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          "z-[200] w-[var(--radix-popover-anchor-width)] p-0",
          contentClassName,
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul
          id={listId}
          role="listbox"
          className={cn("max-h-[min(320px,55vh)] overflow-y-auto overscroll-contain p-1", listClassName)}
        >
          {leadingOption ? (
            <li role="option" aria-selected={value === leadingOption.value}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  value === leadingOption.value && "bg-accent",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onValueChange(leadingOption.value, undefined);
                  setQuery(leadingOption.label);
                  setOpen(false);
                }}
              >
                <span className="text-muted-foreground">{leadingOption.label}</span>
              </button>
            </li>
          ) : null}
          {filtered.length === 0 && !leadingOption ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</li>
          ) : filtered.length === 0 && leadingOption ? null : (
            filtered.map((item) => {
              const id = getItemId(item);
              const active = value === id;
              return (
                <li key={id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      active && "bg-accent",
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                  >
                    {renderItem ? renderItem(item) : (
                      <span className="font-medium leading-tight">{getItemLabel(item)}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
          {filtered.length === 0 && leadingOption ? (
            <li className="px-3 py-4 text-center text-xs text-muted-foreground">{emptyMessage}</li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
