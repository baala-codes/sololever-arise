"use client";

import { useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestPush,
} from "@/app/actions/push";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export function SystemLink() {
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [linked, setLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.register("/sw.js").catch(() => {});

    navigator.serviceWorker.ready
      .then(async (registration) => {
        const existing = await registration.pushManager.getSubscription();
        setLinked(Boolean(existing) && Notification.permission === "granted");
      })
      .catch(() => setLinked(false));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setMessage(choice.outcome === "accepted" ? "Installed." : "Install dismissed.");
    setInstallPrompt(null);
  }

  async function enableAlerts() {
    if (!publicKey) {
      setMessage("VAPID public key is missing from this build.");
      return;
    }
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission denied in the browser.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      });
      const json = subscription.toJSON();
      const result = await savePushSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!result.ok) {
        setMessage(result.error ?? "Could not store the subscription.");
        return;
      }
      setLinked(true);
      setMessage("Alerts linked to this device.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Subscription failed.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const result = await sendTestPush();
      setMessage(result.ok ? `Ping sent to ${result.sent} device(s).` : (result.error ?? "Ping failed."));
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await removePushSubscription(existing.endpoint);
        await existing.unsubscribe();
      }
      setLinked(false);
      setMessage("Alerts unlinked from this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted">Install as an app</span>
        {installPrompt ? (
          <button
            type="button"
            onClick={() => void install()}
            className="border border-system/50 px-2 py-0.5 text-[9px] tracking-[0.14em] text-system hover:bg-system/10"
          >
            INSTALL
          </button>
        ) : (
          <span className="text-[9px] text-muted/50">
            {"standalone" in navigator && matchMedia("(display-mode: standalone)").matches
              ? "installed"
              : "use browser menu → install"}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px]">
        <span className="text-muted">Round-end alerts</span>
        <span className="flex gap-1">
          {linked ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void test()}
                className="border border-line px-2 py-0.5 text-[9px] tracking-[0.14em] text-muted hover:text-fg disabled:opacity-40"
              >
                TEST
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void unlink()}
                className="border border-line px-2 py-0.5 text-[9px] tracking-[0.14em] text-muted hover:border-danger/40 hover:text-danger disabled:opacity-40"
              >
                UNLINK
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void enableAlerts()}
              className="border border-shadow/50 px-2 py-0.5 text-[9px] tracking-[0.14em] text-shadow hover:bg-shadow/10 disabled:opacity-40"
            >
              ENABLE
            </button>
          )}
        </span>
      </div>

      <p className="text-[9px] leading-relaxed text-muted/60">
        {message ??
          "Needs a push-capable browser (Chrome, Edge, Firefox, iOS 16.4+ installed to home screen)."}
      </p>
    </div>
  );
}
