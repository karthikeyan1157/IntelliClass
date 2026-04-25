import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp, getDocs, query, where, getDoc } from 'firebase/firestore';

export type NotificationType = 'announcement' | 'assignment' | 'grade' | 'feedback';

interface SendNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  senderName?: string;
  senderRole?: string;
  link?: string;
}

export const sendNotification = async ({
  userId,
  title,
  message,
  type,
  senderName,
  senderRole,
  link
}: SendNotificationParams) => {
  try {
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const newDocRef = doc(notificationsRef);
    
    await setDoc(newDocRef, {
      title,
      message,
      type,
      senderName: senderName || 'System',
      senderRole: senderRole || 'admin',
      read: false,
      link: link || '',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

export const broadcastNotificationToDept = async (
  dept: string,
  params: Omit<SendNotificationParams, 'userId'>,
  targetRole: string = 'student'
) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', targetRole));
    const snapshot = await getDocs(q);
    
    const notificationPromises = snapshot.docs.map(async (userDoc) => {
      const profileRef = doc(db, 'users', userDoc.id, 'profiles', 'main');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        if (data.department === dept) {
          await sendNotification({ ...params, userId: userDoc.id });
        }
      }
    });
    
    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error broadcasting notification:', error);
  }
};

export const broadcastNotificationToClass = async (
  year: string,
  section: string,
  dept: string,
  params: Omit<SendNotificationParams, 'userId'>
) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'student'));
    const snapshot = await getDocs(q);
    
    const notificationPromises = snapshot.docs.map(async (userDoc) => {
      const profileRef = doc(db, 'users', userDoc.id, 'profiles', 'main');
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        const data = profileSnap.data();
        if (data.department === dept && data.year === year && data.section === section) {
          await sendNotification({ ...params, userId: userDoc.id });
        }
      }
    });

    await Promise.all(notificationPromises);
  } catch (error) {
    console.error('Error broadcasting to class:', error);
  }
};
