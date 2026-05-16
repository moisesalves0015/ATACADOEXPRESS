// Scripts for firebase and firebase-messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Initialize the Firebase app
firebase.initializeApp({
  apiKey: "AIzaSyDB5R2FgvQNEJsiL9JFa-4K1vjSHwZD36o",
  authDomain: "atacadoexpress-b7e97.firebaseapp.com",
  projectId: "atacadoexpress-b7e97",
  storageBucket: "atacadoexpress-b7e97.firebasestorage.app",
  messagingSenderId: "889091650088",
  appId: "1:889091650088:web:742cbd06340153f043fb1d",
  measurementId: "G-7PEJRHDX9P"
});

const messaging = firebase.messaging();

console.log('[SW] Service Worker Carregado e Pronto.');

// Listener bruto de Push (para diagnóstico no iOS)
self.addEventListener('push', (event) => {
  console.log('[SW] Evento de Push recebido bruto:', event);
  if (event.data) {
    console.log('[SW] Payload do Push:', event.data.json());
  } else {
    console.log('[SW] Evento de Push sem dados.');
  }
});

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'Atacado Express';
  const notificationOptions = {
    body: payload.notification?.body || 'Nova atualização no seu marketplace.',
    icon: 'https://atacado-express-boutique.web.app/icon.svg',
    badge: 'https://atacado-express-boutique.web.app/icon.svg',
    image: payload.data?.image || payload.notification?.image || '',
    data: {
      url: payload.data?.url || '/'
    },
    // Propriedades importantes para Safari/iOS
    tag: 'order-update',
    renotify: true,
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada:', event.notification.tag);
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
