// ============================================
// FIREBASE MESSAGING SERVICE WORKER - VERSION COMPLÈTE
// Gestion de TOUTES les notifications en arrière-plan
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
// GESTION DE TOUS LES TYPES DE NOTIFICATIONS
// ============================================
messaging.onBackgroundMessage((payload) => {
  console.log('📨 [firebase-messaging-sw] Message reçu:', payload);
  
  const data = payload.data || {};
  const notification = payload.notification || {};
  
  // Déterminer le type de notification
  const type = data.type || 'general';
  
  // Configuration selon le type
  let title = notification.title || 'CS la Colombe';
  let body = notification.body || 'Nouvelle notification';
  let icon = '/icon-192x192.png';
  let badge = '/icon-72x72.png';
  let tag = `notif-${type}-${Date.now()}`;
  let actions = [
    { action: 'open', title: 'Ouvrir' },
    { action: 'close', title: 'Fermer' }
  ];
  
  // Personnalisation par type
  switch(type) {
    // ===== INCIDENTS =====
    case 'incident':
      title = `⚠️ INCIDENT - ${title}`;
      body = data.childName ? `${data.childName}: ${body}` : body;
      icon = '/icon-192x192.png';
      actions = [
        { action: 'view', title: 'Voir l\'incident' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== PRÉSENCES =====
    case 'presence':
      title = `📅 PRÉSENCE - ${title}`;
      if (data.status) {
        const statusEmoji = data.status === 'present' ? '✅' : 
                           data.status === 'absent' ? '❌' : '⏰';
        body = `${data.childName || 'Enfant'} est ${statusEmoji} ${data.status}`;
      }
      break;
      
    // ===== COTES ET NOTES =====
    case 'grade':
    case 'cote':
    case 'grades':
      title = `📊 NOUVELLE NOTE - ${title}`;
      if (data.subject) {
        body = `${data.childName || 'Enfant'}: ${data.subject} - ${data.grade || ''}`;
      }
      actions = [
        { action: 'view', title: 'Voir les notes' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== DEVOIRS (tous niveaux) =====
    case 'homework':
    case 'devoir':
      title = `📚 NOUVEAU DEVOIR - ${title}`;
      if (data.subject) {
        body = `${data.childName || 'Enfant'}: ${data.subject} - À rendre le ${data.dueDate || ''}`;
      }
      if (data.level === 'kindergarten') {
        title = `🎨 ACTIVITÉ MATERNELLE - ${title}`;
      }
      actions = [
        { action: 'view', title: 'Voir le devoir' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== DEVOIRS MATERNELLE (spécifique) =====
    case 'kindergarten_homework':
      title = `🎨 ACTIVITÉ MATERNELLE - ${title}`;
      body = `${data.childName || 'Enfant'}: ${data.title || 'Nouvelle activité'}`;
      if (data.hasAudio) {
        body += ' 📢 Avec message vocal';
      }
      actions = [
        { action: 'view', title: 'Voir l\'activité' },
        { action: 'listen', title: 'Écouter le message' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== PAIEMENTS =====
    case 'payment':
    case 'paiement':
      title = `💰 PAIEMENT - ${title}`;
      if (data.amount) {
        body = `${data.childName || 'Enfant'}: ${data.amount} FCFA - ${data.month || ''}`;
      }
      actions = [
        { action: 'view', title: 'Voir le paiement' },
        { action: 'pay', title: 'Payer maintenant' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== COMMUNIQUÉS =====
    case 'communique':
    case 'communiqué':
      title = `📄 COMMUNIQUÉ - ${title}`;
      if (data.feeType) {
        body = `${data.feeType}: ${data.amount || ''} FCFA - Limite: ${data.deadline || ''}`;
      }
      actions = [
        { action: 'view', title: 'Lire le communiqué' },
        { action: 'pay', title: 'Marquer payé' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== EMPLOI DU TEMPS =====
    case 'timetable':
    case 'horaire':
      title = `⏰ EMPLOI DU TEMPS - ${title}`;
      body = `${data.childName || 'Enfant'}: Nouvel horaire disponible pour ${data.month || ''}`;
      actions = [
        { action: 'view', title: 'Voir l\'horaire' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== MESSAGERIE =====
    case 'message':
    case 'communication':
      title = `💬 MESSAGE - ${title}`;
      actions = [
        { action: 'reply', title: 'Répondre' },
        { action: 'view', title: 'Lire' },
        { action: 'close', title: 'Fermer' }
      ];
      break;
      
    // ===== RAPPELS =====
    case 'reminder':
    case 'rappel':
      title = `⏰ RAPPEL - ${title}`;
      break;
      
    // ===== GÉNÉRAL =====
    default:
      title = `📱 ${title}`;
  }
  
  // Options de la notification
  const options = {
    body: body,
    icon: icon,
    badge: badge,
    vibrate: [200, 100, 200],
    data: {
      ...data,
      type: type,
      timestamp: Date.now()
    },
    actions: actions,
    tag: tag,
    renotify: true,
    requireInteraction: true,
    silent: false
  };
  
  // Afficher la notification
  return self.registration.showNotification(title, options);
});

// ============================================
// GESTION DES CLIQUES SUR LES NOTIFICATIONS
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [firebase-messaging-sw] Notification cliquée:', event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  const type = data.type || 'general';
  
  notification.close();
  
  // Gérer les actions spécifiques
  if (action === 'close') return;
  
  // Déterminer l'action à effectuer
  let url = 'index.html';
  let page = 'dashboard';
  let params = [];
  
  switch(type) {
    case 'incident':
      page = 'presence-incidents';
      if (data.childId) params.push(`child=${data.childId}`);
      if (action === 'view') params.push(`incident=${data.incidentId}`);
      break;
      
    case 'presence':
      page = 'presence-incidents';
      if (data.childId) params.push(`child=${data.childId}`);
      if (data.date) params.push(`date=${data.date}`);
      break;
      
    case 'grade':
    case 'cote':
    case 'grades':
      page = 'grades';
      if (data.childId) params.push(`child=${data.childId}`);
      if (data.period) params.push(`period=${data.period}`);
      break;
      
    case 'homework':
    case 'devoir':
    case 'kindergarten_homework':
      page = 'homework';
      if (data.childId) params.push(`child=${data.childId}`);
      if (data.level === 'kindergarten') params.push(`tab=kindergarten`);
      if (action === 'listen' && data.audioUrl) {
        // Ouvrir directement l'audio
        event.waitUntil(clients.openWindow(data.audioUrl));
        return;
      }
      break;
      
    case 'payment':
    case 'paiement':
      page = 'payments';
      if (data.childId) params.push(`child=${data.childId}`);
      if (action === 'pay') {
        // Ouvrir directement la page de paiement
        params.push(`pay=true`);
      }
      break;
      
    case 'communique':
    case 'communiqué':
      page = 'communiques';
      if (data.communiqueId) params.push(`id=${data.communiqueId}`);
      if (action === 'pay') {
        // Marquer comme payé
        params.push(`mark-paid=${data.communiqueId}`);
      }
      break;
      
    case 'timetable':
    case 'horaire':
      page = 'timetable';
      if (data.childId) params.push(`child=${data.childId}`);
      if (data.month) params.push(`month=${data.month}`);
      break;
      
    case 'message':
    case 'communication':
      page = 'communication';
      if (data.messageId) params.push(`message=${data.messageId}`);
      if (action === 'reply') params.push(`reply=true`);
      break;
  }
  
  // Construire l'URL avec les paramètres
  if (params.length > 0) {
    url += `#${page}?${params.join('&')}`;
  } else {
    url += `#${page}`;
  }
  
  console.log('🔗 Navigation vers:', url);
  
  // Ouvrir ou focus la fenêtre
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes('index.html') && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: action,
              data: data,
              page: page
            });
            return;
          }
        }
        return clients.openWindow(url);
      })
  );
});

// ============================================
// GESTION DES MESSAGES DU CLIENT
// ============================================
self.addEventListener('message', (event) => {
  console.log('📨 [firebase-messaging-sw] Message client:', event.data);
  
  if (event.data.type === 'NOTIFICATION_RECEIVED') {
    // Marquer la notification comme reçue
    updateBadgeCount(1);
  }
});

// ============================================
// MISE À JOUR DU BADGE
// ============================================
async function updateBadgeCount(increment = 1) {
  try {
    let count = await getBadgeCount();
    count += increment;
    
    await saveBadgeCount(count);
    
    // Informer tous les clients
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BADGE_UPDATED',
        count: count
      });
    });
  } catch (error) {
    console.error('❌ Erreur badge:', error);
  }
}

async function getBadgeCount() {
  try {
    const cache = await caches.open('badge-cache');
    const response = await cache.match('/badge-count');
    if (response) {
      const data = await response.json();
      return data.count || 0;
    }
  } catch (error) {}
  return 0;
}

async function saveBadgeCount(count) {
  try {
    const cache = await caches.open('badge-cache');
    await cache.put('/badge-count', 
      new Response(JSON.stringify({ count, timestamp: Date.now() }))
    );
  } catch (error) {}
}
