"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  addApplication,
  deleteApplication,
  setApplicationStage,
  type ApplicationResult,
} from "@/app/actions/application";
import { LevelUpOverlay } from "@/components/level-up";
import { STAGE_META, STAGE_ORDER } from "@/lib/readiness";
import type { AppStage } from "@/lib/generated/prisma/client";

export type ApplicationRow = {
  id: string;
  company: string;
  role: string | null;
  stage: AppStage;
  appliedAt: string;
  url: string | null;
};

export function ApplicationList({ applications }: { applications: ApplicationRow[] }) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function handle(res: ApplicationResult, success: string) {
    if (!res.ok) {
      setError(res.error ?? "That did not work.");
      return;
    }
    setError(null);
    setToast(res.awarded ? `${success} · +${res.awarded} XP` : success);
    window.setTimeout(() => setToast(null), 1800);
    if (res.leveledUp && res.level !== undefined) setLevelUp(res.level);
    router.refresh();
  }

  return (
    <div>
      <LevelUpOverlay level={levelUp} onDone={() => setLevelUp(null)} />

      <div className="flex items-center justify-between border-b border-line px-4 py-2 text-[10px] tracking-[0.14em] text-muted">
        <span>APPLICATIONS</span>
        <span className="tabular-nums">{applications.length} sent · 40 XP each</span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!company.trim()) return;
          const c = company;
          const r = role;
          setCompany("");
          setRole("");
          startTransition(async () => {
            handle(await addApplication(c, r), "Logged");
          });
        }}
        className="space-y-1.5 border-b border-line px-4 py-3"
      >
        <div className="flex gap-1.5">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="company"
            maxLength={120}
            className="min-w-0 flex-1 border border-line bg-panel2 px-2 py-1.5 text-xs text-fg placeholder:text-muted/50 focus:border-system/60 focus:outline-none"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="role (optional)"
            maxLength={120}
            className="min-w-0 flex-1 border border-line bg-panel2 px-2 py-1.5 text-xs text-fg placeholder:text-muted/50 focus:border-line2 focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending || !company.trim()}
            className="shrink-0 border border-system/50 bg-system/10 px-3 py-1.5 text-[10px] tracking-[0.14em] text-system transition-colors hover:bg-system/20 disabled:opacity-40"
          >
            SENT
          </button>
        </div>
        {error ? <p className="text-[10px] text-danger">{error}</p> : null}
      </form>

      {applications.length === 0 ? (
        <p className="px-4 py-4 text-[11px] text-muted">
          Nothing sent yet. Applications cost no calendar time — they only cost the nerve to press
          send.
        </p>
      ) : (
        <ul className="divide-y divide-line/60">
          {applications.map((app) => {
            const meta = STAGE_META[app.stage];
            return (
              <li key={app.id} className="flex items-center gap-2 px-4 py-2">
                <span className="size-1.5 shrink-0" style={{ background: meta.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-fg">{app.company}</p>
                  <p className="truncate text-[9px] text-muted/60">
                    {app.role ?? "role unspecified"} · {app.appliedAt}
                  </p>
                </div>
                <select
                  value={app.stage}
                  disabled={pending}
                  onChange={(e) => {
                    const stage = e.target.value as AppStage;
                    startTransition(async () => {
                      handle(await setApplicationStage(app.id, stage), STAGE_META[stage].label);
                    });
                  }}
                  className="shrink-0 border border-line bg-panel2 px-1 py-0.5 text-[9px] tracking-[0.1em]"
                  style={{ color: meta.color }}
                  aria-label={`Stage for ${app.company}`}
                >
                  {STAGE_ORDER.map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_META[stage].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteApplication(app.id);
                      router.refresh();
                    })
                  }
                  className="shrink-0 text-[10px] text-muted/40 hover:text-danger disabled:opacity-40"
                  aria-label={`Delete ${app.company}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {toast ? (
        <motion.div
          className="border-t border-line px-4 py-1.5 text-[10px] text-ok"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {toast}
        </motion.div>
      ) : null}
    </div>
  );
}
