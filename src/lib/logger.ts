import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SystemLog } from '../types';

export const logSystemAction = async (
  targetId: string,
  targetName: string,
  actionType: SystemLog['actionType'],
  description: string,
  metadata?: any
) => {
  try {
    const logData: Omit<SystemLog, 'id'> = {
      targetId,
      targetName,
      actionType,
      description,
      performedBy: auth.currentUser?.uid || 'Sistema',
      performedByEmail: auth.currentUser?.email || 'sistema@atacado.com',
      timestamp: new Date().toISOString(),
      metadata,
    };
    await addDoc(collection(db, 'system_logs'), logData);
  } catch (error) {
    console.error('Failed to log system action:', error);
  }
};
