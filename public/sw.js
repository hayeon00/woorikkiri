self.addEventListener("push", (event) => {
    let data = {};

    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = {
            title: "우리끼리",
            body: "새로운 알림이 있어요.",
        };
    }

    const title = data.title || "우리끼리";

    const options = {
        body: data.body || "새로운 알림이 있어요.",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: {
            url: data.url || "/notifications",
        },
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    const url =
        event.notification.data?.url ||
        "/notifications";

    event.waitUntil(
        clients.openWindow(url)
    );
});