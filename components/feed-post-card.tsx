import { Timestamp } from 'firebase/firestore';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type FlameMeta = { likes: number; comments: number };

export type PRPost = {
  id: string;
  userId: string;
  type: 'pr';
  author: { name: string; initials: string; ringColor: string };
  headline: string;
  prText: string;
  exercise: string;
  detail: string;
  previousBest: string;
  meta: FlameMeta;
  leaderboardRank?: string;
};

export type WorkoutPost = {
  id: string;
  userId: string;
  type: 'workout';
  author: { name: string; initials: string; ringColor: string };
  title: string;
  duration: string;
  items: { label: string; detail: string }[];
  caption: string;
  meta: FlameMeta;
  leaderboardRank?: string;
  avatarRightText?: string;
};

export type CardioPost = {
  id: string;
  userId: string;
  type: 'cardio';
  author: { name: string; initials: string; ringColor: string };
  activityName: string;
  durationText: string;
  distanceKm: number;
  notes: string;
  meta: FlameMeta;
  avatarRightText: string;
};

export type RestPost = {
  id: string;
  userId: string;
  type: 'rest';
  author: { name: string; initials: string; ringColor: string };
  text: string;
  streakText: string;
  meta: FlameMeta;
  avatarRightText?: string;
};

export type FeedPost = PRPost | WorkoutPost | CardioPost | RestPost;

function formatRelativeTime(ts: Timestamp | undefined): string {
  if (!ts || !(ts instanceof Timestamp)) return '';
  const d = ts.toDate();
  const now = Date.now();
  const diffMs = now - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function summarizeExerciseSets(
  sets?: { kg?: string; reps?: string; done?: boolean }[],
): string {
  if (!sets?.length) return '—';
  return sets
    .map((s) => {
      const kg = s.kg?.trim() || '—';
      const r = s.reps?.trim() || '—';
      return `${kg}×${r}`;
    })
    .join(' · ');
}

function secondsToDurationText(sec: unknown): string {
  const n = typeof sec === 'number' ? sec : Number(sec);
  const s = Number.isFinite(n) ? n : 0;
  const mins = Math.round(s / 60);
  return mins > 0 ? `${mins} min` : '—';
}

function streakPrefix(raw: Record<string, unknown>): string {
  const streakSnap = raw.authorStreak as number | undefined;
  return typeof streakSnap === 'number' && streakSnap > 0 ? `🔥 ${streakSnap}d streak · ` : '';
}

const CARDIO_TYPE_EMOJI: Record<string, string> = {
  Run: '🏃',
  Cycle: '🚴',
  Swim: '🏊',
  Walk: '🚶',
  Football: '⚽',
  Basketball: '🏀',
  Tennis: '🎾',
  Badminton: '🏸',
  Boxing: '🥊',
  'Horse Riding': '🏇',
  Squash: '🎱',
  HIIT: '🏋️',
  Yoga: '🧘',
  Gymnastics: '🤸',
  Volleyball: '🏐',
  'Table Tennis': '🏓',
  'Martial Arts': '🥋',
  Rowing: '🚣',
  Skiing: '⛷️',
  Surfing: '🏄',
  Climbing: '🧗',
  Handball: '🤾',
  Hockey: '🏑',
  Rugby: '🏉',
  Snowboarding: '🎿',
  'Mountain Bike': '🚵',
  'Water Polo': '🤽',
  Golf: '🏌️',
};

function emojiForCardioType(name: string): string {
  return CARDIO_TYPE_EMOJI[name] ?? '🏃';
}

export function normalizeFirestorePost(
  raw: Record<string, unknown> & { id?: string },
): FeedPost | null {
  const id = String(raw.id ?? '');
  const userId = String(raw.userId ?? '');
  const type = raw.type as string | undefined;
  const likes = Array.isArray(raw.likes) ? raw.likes.length : 0;
  const meta: FlameMeta = { likes, comments: 0 };
  const createdAt = raw.createdAt as Timestamp | undefined;

  const author = {
    name: String(raw.username ?? 'user'),
    initials: String(raw.userInitials ?? '??').slice(0, 2),
    ringColor: '#FF4B1F',
  };

  if (type === 'pr') {
    const w = raw.weight as number | undefined;
    const prev = raw.previousBest as number | undefined;
    return {
      id,
      userId,
      type: 'pr',
      author,
      headline: `${author.name} just hit a new PR!`,
      prText: w != null ? `${w}kg` : '—',
      exercise: String(raw.exercise ?? ''),
      detail: '',
      previousBest: prev != null ? `Previous best: ${prev}kg` : '',
      meta,
      leaderboardRank: undefined,
    };
  }

  if (type === 'cardio') {
    const cardioType = String(raw.cardioType ?? 'Run');
    const activityEmoji = emojiForCardioType(cardioType);
    const durationText = secondsToDurationText(raw.duration);
    const dist = raw.distance as number | undefined;
    const distanceKm = typeof dist === 'number' && Number.isFinite(dist) ? dist : 0;
    const notes = typeof raw.notes === 'string' ? raw.notes : '';
    const timeStr = formatRelativeTime(createdAt);
    const avatarRightText = `${streakPrefix(raw)}${timeStr} · ${activityEmoji} ${cardioType}`;
    return {
      id,
      userId,
      type: 'cardio',
      author,
      activityName: cardioType,
      durationText,
      distanceKm,
      notes,
      meta,
      avatarRightText,
    };
  }

  if (type === 'workout') {
    const exercises = raw.exercises as
      | { id?: string; name?: string; sets?: { kg?: string; reps?: string; done?: boolean }[] }[]
      | undefined;
    const items =
      exercises?.map((ex, idx) => ({
        label: ex.name?.trim() || `Exercise ${idx + 1}`,
        detail: summarizeExerciseSets(ex.sets),
      })) ?? [];
    const workoutName = String(raw.workoutName ?? 'Workout');
    const duration = secondsToDurationText(raw.duration);
    const caption = typeof raw.caption === 'string' ? raw.caption : '';
    return {
      id,
      userId,
      type: 'workout',
      author,
      title: workoutName,
      duration,
      items: items.length ? items : [{ label: workoutName, detail: '—' }],
      caption,
      meta,
      leaderboardRank: undefined,
      avatarRightText: `${streakPrefix(raw)}${formatRelativeTime(createdAt)} · ${workoutName.toLowerCase()}`,
    };
  }

  if (type === 'rest') {
    return {
      id,
      userId,
      type: 'rest',
      author,
      text: 'Rest day',
      streakText: typeof raw.streakText === 'string' ? raw.streakText : 'streak kept 🔥',
      meta,
      avatarRightText: `${streakPrefix(raw)}${formatRelativeTime(createdAt)} · rest`,
    };
  }

  return null;
}

function AvatarRow({
  author,
  rightText,
  onPress,
}: {
  author: { name: string; initials: string; ringColor: string };
  rightText?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.authorRow}>
      <View style={[styles.miniRing, { borderColor: author.ringColor }]}>
        <View style={styles.miniAvatar}>
          <Text style={styles.miniInitials}>{author.initials}</Text>
        </View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.authorName}>{author.name}</Text>
        {rightText ? <Text style={styles.authorSubText}>{rightText}</Text> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

export function FeedPostCard({
  post,
  onAuthorPress,
}: {
  post: FeedPost;
  onAuthorPress?: () => void;
}) {
  if (post.type === 'pr') {
    const header = (
      <View style={styles.prTopLine}>
        <Text style={styles.prTopLineText}>{post.headline}</Text>
        <Text style={styles.prTopEmoji}>🔥</Text>
      </View>
    );
    return (
      <View style={[styles.card, styles.cardPR]} key={post.id}>
        {onAuthorPress ? <Pressable onPress={onAuthorPress}>{header}</Pressable> : header}

        <View style={styles.prMain}>
          <Text style={styles.prNew}>NEW PR</Text>
          <Text style={styles.prValue}>{post.prText}</Text>
          <Text style={styles.prExercise}>{post.exercise}</Text>
          {post.detail ? <Text style={styles.prDetail}>{post.detail}</Text> : null}
          {post.previousBest ? <Text style={styles.prPrev}>{post.previousBest}</Text> : null}
        </View>

        {post.leaderboardRank ? (
          <View style={styles.leaderboardPill}>
            <Text style={styles.leaderboardPillText}>{post.leaderboardRank}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={styles.metaFlame}>🔥 {post.meta.likes}</Text>
          <Text style={styles.metaCount}>💬 {post.meta.comments}</Text>
        </View>
      </View>
    );
  }

  if (post.type === 'workout') {
    return (
      <View style={[styles.card, styles.cardDark]} key={post.id}>
        <AvatarRow
          author={post.author}
          rightText={post.avatarRightText ?? 'workout'}
          onPress={onAuthorPress}
        />

        <View style={styles.workoutHeader}>
          <Text style={styles.workoutTitle}>{post.title} ·</Text>
          <Text style={styles.workoutDuration}>{post.duration}</Text>
        </View>

        <View style={styles.workoutGrid}>
          {post.items.map((it, idx) => (
            <View key={`${post.id}-${it.label}-${idx}`} style={styles.workoutItem}>
              <Text style={styles.workoutItemLabel}>{it.label}</Text>
              <Text style={styles.workoutItemDetail}>{it.detail}</Text>
            </View>
          ))}
        </View>

        {post.leaderboardRank ? (
          <View style={styles.leaderboardPillDark}>
            <Text style={styles.leaderboardPillTextDark}>{post.leaderboardRank}</Text>
          </View>
        ) : null}

        {post.caption ? <Text style={styles.captionText}>{post.caption}</Text> : null}

        <View style={styles.metaRowDark}>
          <Text style={styles.metaFlameDark}>🔥 {post.meta.likes}</Text>
          <Text style={styles.metaCountDark}>💬 {post.meta.comments}</Text>
        </View>
      </View>
    );
  }

  if (post.type === 'cardio') {
    return (
      <View style={[styles.card, styles.cardDark]} key={post.id}>
        <AvatarRow author={post.author} rightText={post.avatarRightText} onPress={onAuthorPress} />

        <View style={styles.workoutHeader}>
          <Text style={styles.workoutTitle}>{post.activityName} ·</Text>
          <Text style={styles.workoutDuration}>{post.durationText}</Text>
        </View>

        {post.distanceKm > 0 ? (
          <Text style={styles.cardioDistance}>
            {post.distanceKm % 1 === 0 ? String(post.distanceKm) : post.distanceKm.toFixed(1)} km
          </Text>
        ) : null}

        {post.notes ? <Text style={styles.captionText}>{post.notes}</Text> : null}

        <View style={styles.metaRowDark}>
          <Text style={styles.metaFlameDark}>🔥 {post.meta.likes}</Text>
          <Text style={styles.metaCountDark}>💬 {post.meta.comments}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardDark]} key={post.id}>
      <AvatarRow
        author={post.author}
        rightText={post.avatarRightText ?? 'rest day'}
        onPress={onAuthorPress}
      />

      <View style={styles.restRow}>
        <Text style={styles.restZzz}>💤</Text>
        <Text style={styles.restText}>{post.text}</Text>
      </View>

      <Text style={styles.restStreak}>{post.streakText}</Text>

      <View style={styles.metaRowDark}>
        <Text style={styles.metaFlameDark}>🔥 {post.meta.likes}</Text>
        <Text style={styles.metaCountDark}>💬 {post.meta.comments}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#1A1A1A',
  },
  cardDark: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardPR: {
    backgroundColor: '#FF4B1F',
    borderWidth: 0,
  },
  prTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  prTopLineText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  prTopEmoji: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  prMain: {
    gap: 2,
  },
  prNew: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 0.3,
  },
  prValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 40,
    lineHeight: 42,
    marginTop: 2,
  },
  prExercise: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    marginTop: -2,
  },
  prDetail: {
    color: '#FFFFFF',
    fontWeight: '900',
    opacity: 0.95,
    fontSize: 12,
    marginTop: 2,
  },
  prPrev: {
    color: '#FFFFFF',
    fontWeight: '900',
    opacity: 0.95,
    fontSize: 12,
    marginTop: 8,
  },
  leaderboardPill: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  leaderboardPillText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingBottom: 2,
  },
  metaFlame: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  metaCount: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    opacity: 0.95,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  miniRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInitials: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 10,
  },
  authorName: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  authorSubText: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 11,
    opacity: 0.95,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 10,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  workoutDuration: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 16,
  },
  workoutGrid: {
    gap: 10,
  },
  workoutItem: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  workoutItemLabel: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  workoutItemDetail: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 12,
    marginTop: 6,
  },
  cardioDistance: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 8,
  },
  leaderboardPillDark: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#0D0D0D',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,75,31,0.45)',
  },
  leaderboardPillTextDark: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 12,
  },
  captionText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    opacity: 0.95,
  },
  metaRowDark: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  metaFlameDark: {
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 14,
  },
  metaCountDark: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    opacity: 0.95,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  restZzz: {
    color: '#FF4B1F',
    fontSize: 16,
    fontWeight: '900',
  },
  restText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  restStreak: {
    marginTop: 10,
    color: '#FF4B1F',
    fontWeight: '900',
    fontSize: 12,
    opacity: 0.9,
  },
});