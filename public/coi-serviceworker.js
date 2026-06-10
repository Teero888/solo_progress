/*! coi-serviceworker v0.1.7-mod | MIT License | https://github.com/gzuidhof/coi-serviceworker */
const VERSION = "1.0.5";

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
        const request = event.request;
        const url = new URL(request.url);

        if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
            return fetch(request);
        }

        if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
            return;
        }

        const shouldCache = CACHE_MATCH.some(regex => regex.test(url.pathname));

        try {
            if (shouldCache) {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) return cachedResponse;
            }

            let fetchResponse;
            try {
                fetchResponse = await fetch(request);
            } catch (e) {
                if (request.mode === 'navigate' || request.mode === 'no-cors') {
                    console.warn(`[COI SW v${VERSION}] Retrying fetch with fresh request for:`, url.pathname);
                    fetchResponse = await fetch(request.url);
                } else {
                    throw e;
                }
            }

            if (fetchResponse.status === 0 || fetchResponse.status === 304 || fetchResponse.status === 204 || fetchResponse.redirected) {
                return fetchResponse;
            }

            const newHeaders = new Headers(fetchResponse.headers);
            newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
            newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
            newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");

            const moddedResponse = new Response(fetchResponse.body, {
                status: fetchResponse.status,
                statusText: fetchResponse.statusText,
                headers: newHeaders,
            });

            if (shouldCache && fetchResponse.status === 200) {
                const clone = moddedResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, clone).catch(() => { });
                }).catch(() => { });
            }

            return moddedResponse;
        } catch (err) {
            console.error(`[COI SW v${VERSION}] Fatal Error:`, url.pathname, err);
            // Last resort: standard fetch with no modifications
            return fetch(request);
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
                        console.log(`[COI SW v${VERSION}] Forcing reload for Cross-Origin Isolation...`);
                        sessionStorage.setItem("coiReloaded", "true");
                        window.location.reload();
                    }
                } else if (window.crossOriginIsolated) {
                    sessionStorage.removeItem("coiReloaded");
                }
            }).catch(err => {
                console.error(`[COI SW v${VERSION}] Registration failed:`, err);
            });
        }
    })();
}
