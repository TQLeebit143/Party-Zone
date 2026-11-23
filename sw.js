/* =========================================================
   PARTY ZONE · SERVICE WORKER OFFLINE-FIRST
   Precachea la app y las fotografías reales de img/
   ========================================================= */
'use strict';

const CACHE_NAME = 'partyzone-v2';
const CACHE_PREFIX = 'partyzone-';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './js/jquery.min.js',
  './shared/validacion.js',
  './shared/supabase.js',
  './shared/supabase-config.js',
  './shared/dompurify.min.js',
  './data/catalogo.js',
  './img/logo.png',
  './img/nuestro ambiente 1.png',
  './img/nuestro ambiente 2.jpg',
  './img/nuestro ambiente 3.png',
  './img/nuestro ambiente 4.jpg',
  './img/nuestro ambiente 5.png',
  './img/cars.jpeg',
  './img/cosito.jpeg',
  './img/cositos.jpeg',
  './img/dragon.jpeg',
  './img/granja zenon.jpeg',
  './img/hello kitty 1.jpeg',
  './img/kpop demon.jpeg',
  './img/mario.jpeg',
  './img/mariquita.jpeg',
  './img/mickey mouse 2.jpeg',
  './img/mickey mouse.jpeg',
  './img/ositoscariñositos.jpeg',
  './img/plimplim.jpeg',
  './img/plimplim 2.jpeg',
  './img/plimplim 3.jpeg',
  './img/plimplim 4.jpeg',
  './img/pokemon.jpeg',
  './img/princesa.jpeg',
  './img/rey leon.jpeg',
  './img/rock.jpeg',
  './img/sing.jpeg',
  './img/sirenita.jpeg',
  './img/unicornio.jpeg',
  './img/unicornio 2.jpeg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        APP_SHELL.map(url =>
          cache.add(new Request(encodeURI(url), { cache: 'reload' })).catch(() => null)
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
          return response;
        })
        .catch(() => caches.match(request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(cacheada => {
        const red = fetch(request).then(response => {
          if (response && response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
          }
          return response;
        }).catch(() => cacheada);
        return cacheada || red;
      })
    );
  }
});