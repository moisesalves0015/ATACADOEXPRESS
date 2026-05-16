import { messaging, db, auth } from '../../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { collection, doc, setDoc, query, where, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { PushToken } from '../../types';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

export const pushService = {
  async isSupported() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      messaging !== null
    );
  },

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  },

  async getAndSaveToken(userId: string | null = null): Promise<string | null> {
    if (!messaging) return null;
    if (!VAPID_KEY) {
      console.error('VAPID Key não encontrada no .env (VITE_VAPID_KEY)');
      return null;
    }

    try {
      console.log("Solicitando token FCM...");
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
      });

      if (token) {
        console.log("Token FCM obtido com sucesso:", token.substring(0, 10) + "...");
        await this.saveTokenToFirestore(token, userId);
        return token;
      }
      console.warn("Nenhum token retornado pelo FCM.");
      return null;
    } catch (error) {
      console.error('Erro ao obter token FCM:', error);
      return null;
    }
  },

  async saveTokenToFirestore(token: string, userId: string | null) {
    const platform = this.getPlatform();
    const tokenRef = doc(db, 'users_push_tokens', token);
    
    const tokenData: PushToken = {
      userId: userId || null,
      token: token,
      platform: platform as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(tokenRef, tokenData, { merge: true });
      console.log('Token salvo com sucesso:', platform);
    } catch (error) {
      console.error('Erro ao salvar token no Firestore:', error);
    }
  },

  getPlatform(): 'android' | 'ios' | 'desktop' {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'ios';
    return 'desktop';
  },

  onForegroundMessage(callback: (payload: any) => void) {
    if (!messaging) return () => {};
    return onMessage(messaging, (payload) => {
      console.log('Mensagem em foreground recebida:', payload);
      callback(payload);
    });
  },

  async unregisterToken(token: string) {
    try {
      const tokenRef = doc(db, 'users_push_tokens', token);
      await updateDoc(tokenRef, { status: 'inactive', updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error('Erro ao desativar token:', error);
    }
  }
};
