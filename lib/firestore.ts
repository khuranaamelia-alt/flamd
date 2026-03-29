import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';

// ——— Types ———

export interface UserDocument extends DocumentData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  totalWorkouts?: number;
  /** Last day user posted (workout or rest day activity for streak). */
  lastPostDate?: Timestamp | null;
  currentStreak?: number;
  bestStreak?: number;
  restDaysUsedThisWeek?: number;
  following?: string[];
}

export interface PostDocument extends DocumentData {
  userId: string;
  createdAt?: Timestamp;
  likes?: string[];
  [key: string]: unknown;
}

/** Fields for a new post; `createdAt` and `likes` are set by `createPost`. */
export type CreatePostInput = Omit<PostDocument, 'createdAt' | 'likes'>;

export interface PRRecord extends DocumentData {
  weight: number;
  date?: Timestamp;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    out.push(items.slice(i, i + chunkSize));
  }
  return out;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timestampToDateKey(ts: Timestamp): string {
  return dateKey(ts.toDate());
}

function shouldSkipStreakUpdate(lastPostDate: Timestamp | null | undefined): boolean {
  if (!lastPostDate) return false;
  return timestampToDateKey(lastPostDate) === dateKey(new Date());
}

/**
 * Streak rules: if last post was yesterday → +1; if today → unchanged; if gap → reset to 1;
 * if never posted → 1. bestStreak updated when current exceeds it.
 */
function computeStreakValues(data: UserDocument): { currentStreak: number; bestStreak: number } {
  const lastKey = data.lastPostDate ? timestampToDateKey(data.lastPostDate as Timestamp) : null;
  const todayKey = dateKey(new Date());

  if (lastKey === todayKey) {
    return {
      currentStreak: data.currentStreak ?? 0,
      bestStreak: data.bestStreak ?? 0,
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = dateKey(yesterday);

  let current: number;
  if (lastKey === null) {
    current = 1;
  } else if (lastKey === yesterdayKey) {
    current = (data.currentStreak ?? 0) + 1;
  } else {
    current = 1;
  }

  const best = Math.max(data.bestStreak ?? 0, current);
  return { currentStreak: current, bestStreak: best };
}

// ——— User ———

export async function getUser(uid: string): Promise<UserDocument | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { ...snap.data(), uid } as UserDocument & { uid?: string };
  } catch (error) {
    console.error('[firestore:getUser]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function updateUser(
  uid: string,
  data: UpdateData<UserDocument>,
): Promise<void> {
  try {
    const ref = doc(db, 'users', uid);
    await updateDoc(ref, data);
  } catch (error) {
    console.error('[firestore:updateUser]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/** Firestore `in` queries allow at most 10 values per query. */
const IN_QUERY_LIMIT = 10;

export async function getFeedPosts(followingIds: string[]): Promise<PostDocument[]> {
  try {
    if (followingIds.length === 0) return [];

    const chunks = chunkArray(followingIds, IN_QUERY_LIMIT);
    const merged: PostDocument[] = [];

    for (const ids of chunks) {
      if (ids.length === 0) continue;
      const q = query(
        collection(db, 'posts'),
        where('userId', 'in', ids),
        orderBy('createdAt', 'desc'),
        limit(20),
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        merged.push({ id: docSnap.id, ...docSnap.data() } as PostDocument & { id: string });
      });
    }

    merged.sort((a, b) => {
      const ta = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
      return tb - ta;
    });

    return merged.slice(0, 20);
  } catch (error) {
    console.error('[firestore:getFeedPosts]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// ——— Posts ———

export async function createPost(postData: CreatePostInput): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'posts'), {
      ...postData,
      likes: [],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('[firestore:createPost]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function likePost(postId: string, uid: string): Promise<void> {
  try {
    const ref = doc(db, 'posts', postId);
    await updateDoc(ref, {
      likes: arrayUnion(uid),
    });
  } catch (error) {
    console.error('[firestore:likePost]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function unlikePost(postId: string, uid: string): Promise<void> {
  try {
    const ref = doc(db, 'posts', postId);
    await updateDoc(ref, {
      likes: arrayRemove(uid),
    });
  } catch (error) {
    console.error('[firestore:unlikePost]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// ——— Streak ———

export async function updateStreak(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error('User not found');
    }
    const data = snap.data() as UserDocument;

    if (shouldSkipStreakUpdate(data.lastPostDate as Timestamp | undefined)) {
      return;
    }

    const { currentStreak, bestStreak } = computeStreakValues(data);
    await updateDoc(userRef, {
      currentStreak,
      bestStreak,
      lastPostDate: serverTimestamp(),
    });
  } catch (error) {
    console.error('[firestore:updateStreak]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function useRestDay(uid: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error('User not found');
    }
    const data = snap.data() as UserDocument;
    const used = data.restDaysUsedThisWeek ?? 0;
    if (used >= 2) {
      throw new Error('No rest days left for this week');
    }

    const { currentStreak, bestStreak } = computeStreakValues(data);
    await updateDoc(userRef, {
      restDaysUsedThisWeek: used + 1,
      currentStreak,
      bestStreak,
      lastPostDate: serverTimestamp(),
    });
  } catch (error) {
    console.error('[firestore:useRestDay]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// ——— PRs ———

export async function updatePR(uid: string, exercise: string, weight: number): Promise<boolean> {
  try {
    const recordRef = doc(db, 'prs', uid, 'records', exercise);
    const snap = await getDoc(recordRef);
    const existing = snap.exists() ? (snap.data() as PRRecord).weight : null;

    if (existing !== null && weight <= existing) {
      return false;
    }

    await setDoc(
      recordRef,
      {
        weight,
        date: serverTimestamp(),
      },
      { merge: true },
    );

    return true;
  } catch (error) {
    console.error('[firestore:updatePR]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function getUserPRs(uid: string): Promise<(PRRecord & { exercise: string })[]> {
  try {
    const col = collection(db, 'prs', uid, 'records');
    const snap = await getDocs(col);
    const out: (PRRecord & { exercise: string })[] = [];
    snap.forEach((docSnap) => {
      out.push({
        exercise: docSnap.id,
        ...(docSnap.data() as PRRecord),
      });
    });
    return out;
  } catch (error) {
    console.error('[firestore:getUserPRs]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// ——— Leaderboard ———

export async function getLeaderboard(followingIds: string[]): Promise<UserDocument[]> {
  try {
    if (followingIds.length === 0) return [];

    const chunks = chunkArray(followingIds, IN_QUERY_LIMIT);
    const byId = new Map<string, UserDocument>();

    for (const ids of chunks) {
      if (ids.length === 0) continue;
      const q = query(collection(db, 'users'), where(documentId(), 'in', ids));
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        byId.set(docSnap.id, { ...docSnap.data(), uid: docSnap.id } as UserDocument);
      });
    }

    const list = Array.from(byId.values());
    list.sort((a, b) => (b.currentStreak ?? 0) - (a.currentStreak ?? 0));
    return list;
  } catch (error) {
    console.error('[firestore:getLeaderboard]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
