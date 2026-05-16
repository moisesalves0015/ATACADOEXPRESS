import { useState, useEffect } from 'react';
import { pushService } from '../services/notifications/pushService';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const supported = await pushService.isSupported();
      setIsSupported(supported);
      
      // Se já tiver permissão, garante que o token esteja salvo no Firestore
      if (supported && Notification.permission === 'granted') {
        console.log("Permissão já concedida. Garantindo registro do token...");
        pushService.getAndSaveToken(auth.currentUser?.uid);
      }

      // Lógica para iOS (PWA instalado)
      const isIOS = pushService.getPlatform() === 'ios';
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone;

      if (isIOS && !isStandalone) {
        // setShowIOSGuide(true);
      }
    };
    checkSupport();
  }, []);

  useEffect(() => {
    // Monitorar login para atualizar token com userId
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && permission === 'granted') {
        pushService.getAndSaveToken(user.uid);
      }
    });
    return () => unsubscribe();
  }, [permission]);

  const handleRequestPermission = async () => {
    const isIOS = pushService.getPlatform() === 'ios';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
                         || (window.navigator as any).standalone;

    if (isIOS && !isStandalone) {
      setShowIOSGuide(true);
      return;
    }

    const granted = await pushService.requestPermission();
    setPermission(granted ? 'granted' : 'denied');
    setShowPermissionModal(false);

    if (granted) {
      await pushService.getAndSaveToken(auth.currentUser?.uid);
    }
  };

  return {
    permission,
    isSupported,
    showPermissionModal,
    setShowPermissionModal,
    showIOSGuide,
    setShowIOSGuide,
    handleRequestPermission,
  };
}
