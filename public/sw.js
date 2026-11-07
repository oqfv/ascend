// Ascend's service worker. It only shows notifications; it doesn't cache pages.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let msg = { title: "Ascend", body: "", url: "/today", tag: undefined };
  try {
    msg = { ...msg, ...event.data.json() };
  } catch {
    // Not JSON: show the defaults.
  }
  // Only ever open pages on this site.
  const url = typeof msg.url === "string" && msg.url.startsWith("/") && !msg.url.startsWith("//") ? msg.url : "/today";
  event.waitUntil(
    self.registration.showNotification(String(msg.title).slice(0, 100), {
      body: String(msg.body).slice(0, 300),
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: msg.tag,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/today", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(target);
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
