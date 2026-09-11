const CACHE_NAME = 'hoc-han-ngu-shell-v1';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/app-icon.png', '/app-icon-192.png'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).then(() => {
			// @ts-expect-error — skipWaiting exists on ServiceWorkerGlobalScope
			self.skipWaiting();
		}),
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
		).then(() => {
			// @ts-expect-error — clients exists on ServiceWorkerGlobalScope
			self.clients.claim();
		}),
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Network-first for API; cache-first for navigations when offline
	if (url.pathname.startsWith('/api/')) return;

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const clone = response.clone();
					void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					return response;
				})
				.catch(() => caches.match(request).then((r) => r ?? caches.match('/'))),
		);
	}
});
