import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AdBanner, PushNotificationItem, Salon } from './types/salon';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId
); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export const PLATFORM_STATE_DOC_ID = 'jaunpur_live_v2';
export const PLATFORM_STATE_PATH = `platform_state/${PLATFORM_STATE_DOC_ID}`;

/**
 * Defensive Payload Sanitization to strictly match firebase-blueprint.json & firestore.rules volumetric bounds
 */
export function sanitizeSalonPayload(salon: Salon): Salon {
  return {
    ...salon,
    id: String(salon.id || 'salon-1')
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 128),
    name: String(salon.name || 'Jaunpur Salon').slice(0, 120),
    locality: salon.locality,
    address: String(salon.address || 'Jaunpur').slice(0, 250),
    distanceKm: Number(salon.distanceKm ?? 1),
    rating: Number(salon.rating ?? 4.7),
    reviewCount: Number(salon.reviewCount ?? 25),
    nowServingToken: Math.max(
      0,
      Math.min(10000, Number(salon.nowServingToken ?? 1))
    ),
    avgWaitMinsPerPerson: Math.max(
      1,
      Math.min(240, Number(salon.avgWaitMinsPerPerson ?? 10))
    ),
    completedTodayCount: Math.max(
      0,
      Math.min(10000, Number(salon.completedTodayCount ?? 0))
    ),
    revenueToday: Math.max(
      0,
      Math.min(100000000, Number(salon.revenueToday ?? 0))
    ),
    artworkVariant: salon.artworkVariant || 'flagship',
    mapQuery: String(salon.mapQuery || salon.address || 'Jaunpur').slice(
      0,
      250
    ),
    ownerName: String(salon.ownerName || 'Salon Partner').slice(0, 100),
    ownerPhone: String(salon.ownerPhone || '+91 7043602377').slice(0, 30),
    category: salon.category || 'Unisex',
    approvalStatus: salon.approvalStatus || 'Approved',
    isFeatured: Boolean(salon.isFeatured),
    ...(salon.photoUrl
      ? { photoUrl: String(salon.photoUrl).slice(0, 500000) }
      : {}),
    registeredAt: String(salon.registeredAt || 'Today').slice(0, 80),
    services: Array.isArray(salon.services) ? salon.services.slice(0, 30) : [],
    queue: Array.isArray(salon.queue) ? salon.queue.slice(0, 100) : [],
  };
}

export async function signInWithGooglePopup(): Promise<User | null> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(
  callback: (user: User | null) => void
): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

/**
 * Subscribe to real-time updates on platform_state/jaunpur_live_v2 when authenticated
 */
export function subscribeToLivePlatformState(
  initialData: {
    salons: Salon[];
    adBanners: AdBanner[];
    notifications: PushNotificationItem[];
  },
  onData: (data: {
    salons: Salon[];
    adBanners: AdBanner[];
    notifications: PushNotificationItem[];
    updatedAtLabel: string;
  }) => void,
  onSyncError?: (errMessage: string) => void
): Unsubscribe {
  const stateDocRef = doc(db, 'platform_state', PLATFORM_STATE_DOC_ID);

  return onSnapshot(
    stateDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        onData({
          salons: Array.isArray(data.salons)
            ? data.salons
            : initialData.salons,
          adBanners: Array.isArray(data.adBanners)
            ? data.adBanners
            : initialData.adBanners,
          notifications: Array.isArray(data.notifications)
            ? data.notifications
            : initialData.notifications,
          updatedAtLabel: new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
        });
      } else if (auth.currentUser && auth.currentUser.emailVerified) {
        // Seed initial state into Firestore when document does not exist yet
        try {
          await setDoc(stateDocRef, {
            id: PLATFORM_STATE_DOC_ID,
            salons: initialData.salons.slice(0, 50).map(sanitizeSalonPayload),
            adBanners: initialData.adBanners.slice(0, 25),
            notifications: initialData.notifications.slice(0, 50),
            updatedBy: auth.currentUser.uid.slice(0, 128),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.CREATE,
            PLATFORM_STATE_PATH
          );
        }
      }
    },
    (error) => {
      if (onSyncError) {
        onSyncError(error.message);
      }
      handleFirestoreError(error, OperationType.GET, PLATFORM_STATE_PATH);
    }
  );
}

/**
 * Push live platform state updates (salons, adBanners, notifications) to Firestore
 */
export async function syncPlatformStateToFirestore(payload: {
  salons: Salon[];
  adBanners: AdBanner[];
  notifications: PushNotificationItem[];
}): Promise<boolean> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) {
    return false;
  }

  const stateDocRef = doc(db, 'platform_state', PLATFORM_STATE_DOC_ID);
  const sanitizedSalons = payload.salons.slice(0, 50).map(sanitizeSalonPayload);
  const sanitizedAds = payload.adBanners.slice(0, 25);
  const sanitizedNotifs = payload.notifications.slice(0, 50);
  const uid = auth.currentUser.uid.slice(0, 128);

  try {
    const existingSnap = await getDoc(stateDocRef);
    if (!existingSnap.exists()) {
      try {
        await setDoc(stateDocRef, {
          id: PLATFORM_STATE_DOC_ID,
          salons: sanitizedSalons,
          adBanners: sanitizedAds,
          notifications: sanitizedNotifs,
          updatedBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, PLATFORM_STATE_PATH);
      }
    } else {
      try {
        await updateDoc(stateDocRef, {
          salons: sanitizedSalons,
          adBanners: sanitizedAds,
          notifications: sanitizedNotifs,
          updatedBy: uid,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, PLATFORM_STATE_PATH);
      }
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, PLATFORM_STATE_PATH);
  }
}
