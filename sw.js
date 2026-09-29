// Ledger service worker — push notifications only.
// Deliberately no offline caching (no "fetch" handler), so every app update
// still loads fresh from the network exactly as before.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "Ledger", {
    body: data.body || "",
    icon: "icon-192.png",
    tag: data.tag || "ledger",
    renotify: true,
    data: { url: data.url || "./" },
  }));
});

// Tapping the notification: focus Ledger if it's open (and jump to Subscriptions), else open it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of windows) {
      if (w.url.startsWith(self.registration.scope)) {
        await w.focus();
        w.postMessage({ type: "open-tab", tab: "subs" });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
