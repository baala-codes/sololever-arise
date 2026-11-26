import type { ReactNode } from "react";

export function SystemPanel({
  title,
  right,
  children,
  className = "",
  accent,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section className={`panel panel-brackets ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
          <div className="flex items-center gap-2">
            {accent ? (
              <span className="size-1.5" style={{ background: accent }} aria-hidden />
            ) : null}
            <h2 className="label">{title}</h2>
          </div>
          {right ? <div className="text-[11px] text-muted">{right}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function KeyValue({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted">{k}</span>
      <span className="text-sm text-fg">{v}</span>
    </div>
  );
}
