importScripts("ngsw-worker.js");

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  const title = data.title || "Health+";
  const options = {
    body: data.body || "Bạn có thông báo mới",
    icon: "/assets/icons/icon-192x192.png",
    badge: "/assets/icons/icon-72x72.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
