/*! coi-serviceworker v0.1.7-mod | MIT License | https://github.com/gzuidhof/coi-serviceworker */
const VERSION = "1.0.3";

if (typeof window === 'undefined') {
    const CACHE_NAME = `ddnet-assets-v${VERSION}`;
    const CACHE_MATCH = [/\.wasm/, /\.js/, /\.data/, /\.png/, /\.ttf/];

    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (event) => {
        event.waitUntil(
            caches.keys().then((keys) => Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            )).then(() => self.clients.claim())
        );
    });

    async function handleRequest(event) {
        const url = new URL(event.request.url);
        
        if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
            return fetch(event.request);
        }

        const shouldCache = CACHE_MATCH.some(regex => regex.test(url.pathname));

        try {
            if (shouldCache) {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;
            }

            const response = await fetch(event.request);

            if (response.status === 0 || response.status === 304 || response.status === 204 || response.redirected) {
                return response;
            }

            const newHeaders = new Headers(response.headers);
            newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
            newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

            const moddedResponse = new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            });

            if (shouldCache && response.status === 200) {
                const clone = moddedResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone).catch(() => {});
                }).catch(() => {});
            }

            return moddedResponse;
        } catch (err) {
            console.error(`[COI SW v${VERSION}] Error:`, url.pathname, err);
            return fetch(event.request);
        }
    }

    self.addEventListener("fetch", (event) => {
        event.respondWith(handleRequest(event));
    });
} else {
    (() => {
        const script = document.currentScript;
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register(script.src).then((registration) => {
                if (registration.active && !window.crossOriginIsolated) {
                    const reloaded = sessionStorage.getItem("coiReloaded");
                    if (!reloaded) {
                        sessionStorage.setItem("coiReloaded", "true");
                        window.location.reload();
                    }
                } else if (window.crossOriginIsolated) {
                    sessionStorage.removeItem("coiReloaded");
                }
            });
        }
    })();
}
