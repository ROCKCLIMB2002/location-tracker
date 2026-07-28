// sw.js – Service Worker برای ارسال داده‌ها در پس‌زمینه

const CACHE_NAME = 'location-tracker-v1';
const urlsToCache = [
    '/',
    '/index.html'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.filter(function(cacheName) {
                    return cacheName !== CACHE_NAME;
                }).map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                return response || fetch(event.request);
            })
    );
});

// دریافت پیام‌ها از صفحه اصلی (برای ارسال موقعیت در پس‌زمینه)
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'location') {
        const data = event.data.payload;
        // می‌توانیم داده را به سرور ارسال کنیم (نیاز به fetch در SW)
        fetch('/api/collect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            console.log('[SW] Location sent:', result);
        })
        .catch(err => {
            console.warn('[SW] Failed to send:', err);
        });
    }
});