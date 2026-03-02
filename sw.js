// ============================================
// SERVICE WORKER PRINCIPAL - VERSION 2.0.0
// ============================================

const CACHE_NAME = 'cs-parent-v2';
const API_CACHE = 'cs-api-v2';
const DYNAMIC_CACHE = 'cs-dynamic-v2';

const STATIC_ASSETS = [
  '/',
  'index.html',
  'manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  'icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// ============================================
// INSTALLATION
// ============================================
self.addEventListener('install', event => {
  console.log('✅ Service Worker: Installation');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Mise en cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATION
// ============================================
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Activation');
  
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME && key !== API_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
        );
      }),
      self.clients.claim()
    ])
  );
});

// ============================================
// STRATÉGIE DE CACHE
// ============================================
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Stratégie pour les assets statiques
  if (url.pathname === '/' || 
      url.pathname === '/index.html' || 
      url.pathname.startsWith('/icon-') ||
      url.pathname === '/manifest.json') {
    
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }
  
  // Stratégie pour les API Firebase
  if (url.hostname.includes('firebase') || 
      url.hostname.includes('googleapis') || 
      url.hostname.includes('cloudinary')) {
    
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(API_CACHE).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            return new Response(JSON.stringify({ 
              offline: true, 
              message: 'Mode hors ligne' 
            }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }
  
  // Stratégie par défaut (Network First)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        return caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      })
      .catch(() => caches.match(event.request))
  );
});

// ============================================
// GESTION DES NOTIFICATIONS PUSH
// ============================================
self.addEventListener('push', event => {
  console.log('📨 Push reçu:', event);
  
  let data = {};
  
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'CS la Colombe',
      body: event.data ? event.data.text() : 'Nouvelle notification',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: { type: 'general' }
    };
  }
  
  const options = {
    title: data.notification?.title || data.title || 'CS la Colombe',
    body: data.notification?.body || data.body || 'Nouvelle notification',
    icon: data.notification?.icon || data.icon || '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data || { 
      type: data.type || 'general',
      page: data.page || 'dashboard',
      childId: data.childId,
      childName: data.childName
    },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ],
    tag: `notif-${Date.now()}`,
    renotify: true,
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(options.title, options)
  );
});

// ============================================
// GESTION DES CLIKS SUR NOTIFICATIONS
// ============================================
self.addEventListener('notificationclick', event => {
  console.log('👆 Notification cliquée:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NAVIGATE',
              page: data.page || 'dashboard',
              data: data
            });
            return;
          }
        }
        return clients.openWindow('index.html');
      })
  );
});

// ============================================
// GESTION DES MESSAGES
// ============================================
self.addEventListener('message', event => {
  console.log('📨 Message reçu du client:', event.data);
  
  switch (event.data.type) {
    case 'SAVE_PARENT_DATA':
      saveParentData(event.data.data);
      break;
    case 'ACTIVATE_NOW':
      self.skipWaiting();
      break;
    case 'PING':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ type: 'PONG', timestamp: Date.now() });
      }
      break;
  }
});

// ============================================
// STOCKAGE LOCAL (IndexedDB)
// ============================================
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CSParentOfflineDB', 1);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('parent')) {
        db.createObjectStore('parent', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('children')) {
        const childStore = db.createObjectStore('children', { keyPath: 'matricule' });
        childStore.createIndex('class', 'class');
        childStore.createIndex('type', 'type');
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveParentData(data) {
  try {
    const db = await openDB();
    const tx = db.transaction(['parent', 'children'], 'readwrite');
    
    const parentStore = tx.objectStore('parent');
    await parentStore.put({ id: 'current', ...data, savedAt: Date.now() });
    
    if (data.children) {
      const childStore = tx.objectStore('children');
      for (const child of data.children) {
        await childStore.put(child);
      }
    }
    
    console.log('💾 Données parent sauvegardées');
  } catch (error) {
    console.error('❌ Erreur sauvegarde:', error);
  }
}
