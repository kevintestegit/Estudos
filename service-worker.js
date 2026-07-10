const CACHE_VERSION = 'portal-estudos-v1';

const CORE_FILES = [
  './',
  './index.html',
  './hoje.html',
  './cronograma.html',
  './biblioteca.html',
  './materias.html',
  './questoes.html',
  './flashcards.html',
  './simulados.html',
  './provas.html',
  './caderno-erros.html',
  './progresso.html',
  './backup.html',
  './offline.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/js/app.js',
  './assets/js/storage.js',
  './assets/js/dashboard.js',
  './assets/js/cronograma.js',
  './assets/js/biblioteca.js',
  './assets/js/quiz.js',
  './assets/js/flashcards.js',
  './assets/js/backup.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './data/cronograma.json',
  './data/materias.json',
  './data/aulas.json',
  './data/pdfs.json',
  './data/questoes-inss.json',
  './data/questoes-prf.json',
  './data/simulados.json',
  './data/provas.json',
  './data/dicas.json',
  './data/flashcards.json',
  './data/materiais.json',
  './data/legislacao.json',
  './data/resolucoes.json',
  './data/textos.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match('./offline.html'));

      return cached || network;
    })
  );
});
