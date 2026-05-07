import { useState } from "react";
import { List, ChevronDown, ChevronUp } from "lucide-react";
import type { TocItem } from "@/lib/tocUtils";

interface TableOfContentsProps {
  items: TocItem[];
}

const TableOfContents = ({ items }: TableOfContentsProps) => {
  const [open, setOpen] = useState(true);

  if (items.length < 3) return null;

  return (
    <nav
      aria-label="목차"
      className="my-8 rounded-xl border border-border bg-muted/40 overflow-hidden"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/60 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-semibold text-foreground text-sm">
          <List className="w-4 h-4 text-primary" />
          목차
        </span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <ol className="px-5 pb-4 space-y-1.5">
          {items.map((item, i) => (
            <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
              <a
                href={`#${item.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-start gap-2"
              >
                <span className="text-primary/60 text-xs mt-0.5 flex-shrink-0 font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
};

export default TableOfContents;
