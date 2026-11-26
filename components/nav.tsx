"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Status", glyph: "◈" },
  { href: "/timetable", label: "Timetable", glyph: "▤" },
  { href: "/focus", label: "Focus", glyph: "◷" },
  { href: "/dungeon", label: "Dungeon", glyph: "⛨" },
  { href: "/arena", label: "Arena", glyph: "◇" },
  { href: "/heatmap", label: "Heatmap", glyph: "▦" },
  { href: "/warroom", label: "War Room", glyph: "⚑" },
  { href: "/report", label: "Report", glyph: "▣" },
  { href: "/checkin", label: "Check-in", glyph: "✚" },
];

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav className="hidden w-40 shrink-0 flex-col gap-1 border-r border-line px-3 py-6 md:flex">
        <div className="mb-6 px-2">
          <div className="text-lg font-semibold tracking-[0.3em] text-system">ARISE</div>
          <div className="label mt-1">system v1.0</div>
        </div>
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 border border-transparent px-2 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                active
                  ? "border-line bg-panel text-system"
                  : "text-muted hover:border-line hover:text-fg"
              }`}
            >
              <span aria-hidden className="text-sm">
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
        <div className="mt-auto px-2 text-[10px] leading-relaxed text-muted/70">
          lanes live
          <br />
          push armed
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-line bg-bg/95 backdrop-blur md:hidden">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[56px] flex-1 shrink-0 flex-col items-center gap-0.5 py-2.5 text-[8px] uppercase tracking-[0.06em] ${
                active ? "text-system" : "text-muted"
              }`}
            >
              <span aria-hidden className="text-sm">
                {item.glyph}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
