// Foot Mate 서비스워커 — Web Push 수신 + 알림 클릭 처리.
// 앱이 꺼져 있어도(브라우저 백그라운드) 이 워커가 push 이벤트를 받아 알림을 띄운다.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Foot Mate", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Foot Mate";
  const options = {
    body: data.body || "",
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: data.tag || undefined,
    data: { link: data.link || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // 이미 열린 창이 있으면 그 창을 링크로 이동시키고 포커스, 없으면 새 창
        for (const client of clientList) {
          if ("focus" in client && "navigate" in client) {
            client.focus();
            return client.navigate(link);
          }
        }
        return self.clients.openWindow(link);
      }),
  );
});
