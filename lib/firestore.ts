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

import { sendPushNotification } from '@/lib/notifications';

import { db } from '@/lib/firebase';

// ——— Types ———

export interface UserDocument extends DocumentData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  pushToken?: string;
  totalWorkouts?: number;
  /** Last day user posted; empty string until first activity (new users). */
  lastPostDate?: Timestamp | null | '';
  /** ISO or app-specific week key; empty until set. */
  weekStartDate?: string | '';
  currentStreak?: number;
  bestStreak?: number;
  restDaysUsedThisWeek?: number;
  following?: string[];
  followers?: string[];
}

export interface PostDocument extends DocumentData {
  userId: string;
  authorStreak?: number;
  isPublic?: boolean;
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

/** Calendar day in UTC, consistent across the streak logic. */
function isoDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

function todayIsoDate(): string {
  return isoDateString(new Date());
}

function yesterdayIsoDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return isoDateString(d);
}

function timestampToIsoDate(ts: Timestamp): string {
  return isoDateString(ts.toDate());
}

function isEmptyLastPostDate(
  lastPostDate: UserDocument['lastPostDate'],
): lastPostDate is null | undefined | '' {
  return lastPostDate == null || lastPostDate === '';
}

function shouldSkipStreakUpdate(lastPostDate: UserDocument['lastPostDate']): boolean {
  if (isEmptyLastPostDate(lastPostDate)) return false;
  if (!(lastPostDate instanceof Timestamp)) return false;
  return timestampToIsoDate(lastPostDate) === todayIsoDate();
}

/**
 * Streak rules: if last post was yesterday → +1; if today → unchanged; if gap → reset to 1;
 * if never posted → 1. bestStreak updated when current exceeds it.
 */
function computeStreakValues(data: UserDocument): { currentStreak: number; bestStreak: number } {
  const lastPost = data.lastPostDate;
  const lastKey =
    !isEmptyLastPostDate(lastPost) && lastPost instanceof Timestamp
      ? timestampToIsoDate(lastPost)
      : null;
  const todayKey = todayIsoDate();
  const yesterdayKey = yesterdayIsoDate();

  if (lastKey === todayKey) {
    return {
      currentStreak: data.currentStreak ?? 0,
      bestStreak: data.bestStreak ?? 0,
    };
  }

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

/** If last activity was before yesterday (UTC day), stored streak is stale for UI. Do not persist. */
function staleStreakShouldReadAsZero(
  lastPostDate: UserDocument['lastPostDate'],
  currentStreak: number,
): boolean {
  if (currentStreak <= 0) return false;
  if (isEmptyLastPostDate(lastPostDate)) return false;
  if (!(lastPostDate instanceof Timestamp)) return false;
  const lastKey = timestampToIsoDate(lastPostDate);
  const y = yesterdayIsoDate();
  const t = todayIsoDate();
  if (lastKey === t || lastKey === y) return false;
  return lastKey < y;
}

// ——— User ———

export async function getUser(uid: string): Promise<UserDocument | null> {
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = { ...snap.data(), uid } as UserDocument & { uid?: string };
    const streak = data.currentStreak ?? 0;
    if (staleStreakShouldReadAsZero(data.lastPostDate, streak)) {
      return { ...data, currentStreak: 0 };
    }
    return data;
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

/** True if another user already has this lowercase username. */
export async function isUsernameTakenByOther(
  normalizedUsername: string,
  excludeUid: string,
): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'users'),
      where('username', '==', normalizedUsername),
      limit(1),
    );
    const snap = await getDocs(q);
    if (snap.empty) return false;
    return snap.docs[0].id !== excludeUid;
  } catch (error) {
    console.error('[firestore:isUsernameTakenByOther]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function followUser(currentUid: string, targetUid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', currentUid), {
      following: arrayUnion(targetUid),
    });
    await updateDoc(doc(db, 'users', targetUid), {
      followers: arrayUnion(currentUid),
    });
  } catch (error) {
    console.error('[firestore:followUser]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function unfollowUser(currentUid: string, targetUid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', currentUid), {
      following: arrayRemove(targetUid),
    });
    await updateDoc(doc(db, 'users', targetUid), {
      followers: arrayRemove(currentUid),
    });
  } catch (error) {
    console.error('[firestore:unfollowUser]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/** Prefix search on lowercase `username` (same format as profile-setup). */
export async function searchUsersByUsernamePrefix(
  prefix: string,
): Promise<(UserDocument & { uid: string })[]> {
  try {
    const trimmed = prefix.trim().toLowerCase();
    if (!trimmed) return [];
    const q = query(
      collection(db, 'users'),
      where('username', '>=', trimmed),
      where('username', '<=', `${trimmed}\uf8ff`),
      limit(30),
    );
    const snap = await getDocs(q);
    const out: (UserDocument & { uid: string })[] = [];
    snap.forEach((d) => {
      out.push({ ...d.data(), uid: d.id } as UserDocument & { uid: string });
    });
    return out;
  } catch (error) {
    console.error('[firestore:searchUsersByUsernamePrefix]', error);
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

export async function getUserPosts(uid: string): Promise<(PostDocument & { id: string })[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('userId', '==', uid),
      where('isPublic', '==', true),
      orderBy('createdAt', 'desc'),
      limit(5),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PostDocument & { id: string }));
  } catch (error) {
    console.error('[firestore:getUserPosts]', error);
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

/** If `weekStartDate` is not this calendar week's Monday, reset rest days for the new week. */
export async function maybeResetWeeklyRestDays(uid: string): Promise<void> {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);
    const mondayStr = monday.toISOString().split('T')[0];

    const userRef = doc(db, 'users', uid);
    const userData = await getDoc(userRef);
    if (!userData.exists()) return;
    const data = userData.data();

    const isNewWeek = data?.weekStartDate !== mondayStr;

    if (isNewWeek) {
      await updateDoc(userRef, {
        restDaysUsedThisWeek: 0,
        weekStartDate: mondayStr,
      });
    }
  } catch (error) {
    console.error('[firestore:maybeResetWeeklyRestDays]', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

export async function updateStreak(uid: string): Promise<void> {
  try {
    await maybeResetWeeklyRestDays(uid);
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      throw new Error('User not found');
    }
    const data = snap.data() as UserDocument;

    if (shouldSkipStreakUpdate(data.lastPostDate)) {
      return;
    }

    if (isEmptyLastPostDate(data.lastPostDate)) {
      const currentStreak = 1;
      const bestStreak = Math.max(data.bestStreak ?? 0, currentStreak);
      await updateDoc(userRef, {
        currentStreak,
        bestStreak,
        lastPostDate: serverTimestamp(),
      });
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
    await maybeResetWeeklyRestDays(uid);
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

export async function notifyGetFlamd(newLeaderUid: string, displacedUid: string) {
  try {
    const displaced = await getDoc(doc(db, 'users', displacedUid));
    const token = (displaced.data() as UserDocument | undefined)?.pushToken;
    if (token) {
      const newLeader = await getDoc(doc(db, 'users', newLeaderUid));
      const leaderName = (newLeader.data() as UserDocument | undefined)?.username ?? 'Someone';
      await sendPushNotification(
        token,
        'You just got Flamd 🔥',
        `${leaderName} just took #1 — get back up there`,
      );
    }
  } catch (e) {
    console.error('[firestore:notifyGetFlamd]', e);
  }
}
