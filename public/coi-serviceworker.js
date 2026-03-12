/*! coi-serviceworker v0.1.7 | MIT License | https://github.com/gzuidhof/coi-serviceworker */
if (typeof window === 'undefined') {
    const CACHE_NAME = 'ddnet-assets';
    // Match common large assets, ignoring anchors to handle Vite query params
    const CACHE_MATCH = [/\.wasm/, /\.js/, /\.data/, /\.png/, /\.ttf/];

    self.addEventListener("install", () => {
        console.log("[COI Service Worker] Installing...");
        self.skipWaiting();
    });

    self.addEventListener("activate", (event) => {
        console.log("[COI Service Worker] Activated");
        event.waitUntil(self.clients.claim());
    });

    self.addEventListener("fetch", (event) => {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }

        const url = new URL(event.request.url);
        const shouldCache = CACHE_MATCH.some(regex => regex.test(url.pathname));

        if (shouldCache && event.request.method === 'GET') {
            event.respondWith(
                caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return fetch(event.request).then((response) => {
                        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }

                        console.log("[COI Service Worker] Caching asset:", url.pathname);
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        const newHeaders = new Headers(response.headers);
                        newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                        return new Response(response.body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: newHeaders,
                        });
                    });
                })
            );
        } else {
            event.respondWith(
                fetch(event.request).then((response) => {
                    if (response.status === 0) {
                        return response;
                    }

                    const newHeaders = new Headers(response.headers);
                    newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
                    newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

                    return new Response(response.body, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: newHeaders,
                    });
                })
            );
        }
    });
} else {
    (() => {
        const script = document.currentScript;
        
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register(script.src).then((registration) => {
                console.log("[COI Service Worker] Registered with scope:", registration.scope);

                registration.addEventListener("updatefound", () => {
                    console.log("[COI Service Worker] Update found, reloading...");
                    window.location.reload();
                });

                // Force registration logic even if already isolated, so caching works
                if (registration.active && !window.crossOriginIsolated) {
                    const reloaded = sessionStorage.getItem("coiReloaded");
                    if (!reloaded) {
                        console.log("[COI Service Worker] Performing initial isolation reload...");
                        sessionStorage.setItem("coiReloaded", "true");
                        window.location.reload();
                    }
                } else if (window.crossOriginIsolated) {
                    sessionStorage.removeItem("coiReloaded");
                }
            }).catch(err => {
                console.error("[COI Service Worker] Registration failed:", err);
            });
        }
    })();
}
