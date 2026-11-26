/** Local round-end notification. Routes through the service worker when one is installed. */
export async function notifyRoundEnd(title: string, body: string, url = "/"): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "arise-round",
        data: { url },
      });
      return;
    }
    new Notification(title, { body, icon: "/icon.svg" });
  } catch {
    // a failed notification must never interrupt the timer
  }
}
