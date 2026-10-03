self.addEventListener(
    "push",
    (event) => {
        let data = {};

        try {
            data = event.data
                ? event.data.json()
                : {};
        } catch {
            data = {
                title: "우리끼리",
                body: "새로운 알림이 있어요.",
            };
        }

        const title =
            data.title ||
            "우리끼리";

        const options = {
            body:
                data.body ||
                "새로운 알림이 있어요.",

            icon:
                "/icon-192.png",

            badge:
                "/icon-192.png",

            data: {
                url:
                    data.url ||
                    "/notifications",
            },
        };

        event.waitUntil(
            self.registration
                .showNotification(
                    title,
                    options
                )
        );
    }
);

self.addEventListener(
    "notificationclick",
    (event) => {
        event.notification.close();

        const targetUrl =
            event.notification
                .data?.url ||
            "/notifications";

        event.waitUntil(
            (async () => {
                const windowClients =
                    await clients.matchAll({
                        type: "window",
                        includeUncontrolled:
                            true,
                    });

                const absoluteUrl =
                    new URL(
                        targetUrl,
                        self.location.origin
                    ).href;

                // ========================================
                // 이미 우리끼리 창/PWA가 열려 있으면
                // 그 창을 재사용
                // ========================================

                for (
                    const client of
                    windowClients
                    ) {
                    const clientUrl =
                        new URL(
                            client.url
                        );

                    if (
                        clientUrl.origin ===
                        self.location.origin
                    ) {
                        if (
                            "navigate" in
                            client
                        ) {
                            await client.navigate(
                                absoluteUrl
                            );
                        }

                        if (
                            "focus" in
                            client
                        ) {
                            return client.focus();
                        }

                        return;
                    }
                }

                // ========================================
                // 열려 있는 창이 없으면 새로 열기
                // ========================================

                return clients.openWindow(
                    absoluteUrl
                );
            })()
        );
    }
);