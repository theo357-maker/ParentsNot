// ============================================
// FIREBASE MESSAGING SERVICE WORKER
// ============================================

importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBn7VIddclO7KtrXb5sibCr9SjVLjOy-qI",
  authDomain: "theo1d.firebaseapp.com",
  projectId: "theo1d",
  storageBucket: "theo1d.firebasestorage.app",
  messagingSenderId: "269629842962",
  appId: "1:269629842962:web:a80a12b04448fe1e595acb"
};

// Initialiser Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ============================================
// GESTION DES NOTIFICATIONS EN ARRIÈRE-PLAN
// ============================================
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [firebase-messaging-sw] Message:', payload);
  
  const data = payload.data || {};
  const notification = payload.notification || {};
  
  // Déterminer l'icône et le titre selon le type
  let icon = '/icon-192x192.png';
  let title = notification.title || 'CS la Colombe';
  
  switch(data.type) {
    case 'incident':
      title = `⚠️ ${title}`;
      break;
    case 'presence':
      title = `📅 ${title}`;
      break;
    case 'grade':
    case 'cote':
      title = `📊 ${title}`;
      break;
    case 'homework':
      title = `📚 ${title}`;
      break;
    case 'payment':
      title = `💰 ${title}`;
      break;
    case 'communique':
      title = `📄 ${title}`;
      break;
    case 'timetable':
      title = `⏰ ${title}`;
      break;
  }
  
  const options = {
    body: notification.body || 'Nouvelle notification',
    icon: icon,
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ],
    tag: `fcm-${Date.now()}`,
    renotify: true,
    requireInteraction: true
  };
  
  return self.registration.showNotification(title, options);
});

// ============================================
// GESTION DES CLIKS
// ============================================
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'close') return;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'FCM_NAVIGATE',
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