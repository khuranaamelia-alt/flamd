import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const COLORS = {
    bg: '#0D0D0D',
    card: '#1A1A1A',
    accent: '#FF4B1F',
    text: '#FFFFFF',
  };

  type Story = { id: string; name: string; postedToday: boolean; initials: string };
  type FlameMeta = { likes: number; comments: number };

  type PRPost = {
    id: string;
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

  type WorkoutPost = {
    id: string;
    type: 'workout';
    author: { name: string; initials: string; ringColor: string };
    title: string;
    duration: string;
    items: { label: string; detail: string }[];
    caption: string;
    meta: FlameMeta;
    leaderboardRank?: string;
  };

  type RestPost = {
    id: string;
    type: 'rest';
    author: { name: string; initials: string; ringColor: string };
    text: string;
    streakText: string;
    meta: FlameMeta;
  };

  const stories: Story[] = [
    { id: 's1', name: 'Siddharth', initials: 'SK', postedToday: true },
    { id: 's2', name: 'Arjun', initials: 'AR', postedToday: false },
    { id: 's3', name: 'Priya', initials: 'PV', postedToday: false },
    { id: 's4', name: 'Rahul', initials: 'RK', postedToday: true },
    { id: 's5', name: 'Karan', initials: 'KS', postedToday: true },
  ];

  const posts: (PRPost | WorkoutPost | RestPost)[] = [
    {
      id: 'p1',
      type: 'pr',
      author: { name: 'Siddharth_k', initials: 'SK', ringColor: '#FF4B1F' },
      headline: 'Siddharth just got +1!',
      prText: '120kg',
      exercise: 'Bench Press',
      detail: '5x5 - 100kg',
      previousBest: 'Previous best: 115kg',
      meta: { likes: 24, comments: 6 },
      leaderboardRank: '#1 on leaderboard',
    },
    {
      id: 'p2',
      type: 'workout',
      author: { name: 'arjun_r', initials: 'AR', ringColor: '#3B82F6' },
      title: 'Leg Day',
      duration: '52 min',
      items: [
        { label: 'Squat', detail: '5×5 - 100kg' },
        { label: 'Romanian Deadlift', detail: '4×8 - 80kg' },
      ],
      caption: 'legs are done. someone carry me',
      meta: { likes: 18, comments: 3 },
      leaderboardRank: '#2 leaderboard',
    },
    {
      id: 'p3',
      type: 'pr',
      author: { name: 'Priya_f', initials: 'PV', ringColor: '#FF4B1F' },
      headline: 'Priya just hit a new PR!',
      prText: '92kg',
      exercise: 'Deadlift',
      detail: '3x10 - 92kg',
      previousBest: 'Previous best: 80kg',
      meta: { likes: 9, comments: 2 },
    },
    {
      id: 'p4',
      type: 'rest',
      author: { name: 'rahul_k', initials: 'HK', ringColor: '#22C55E' },
      text: 'Rest day',
      streakText: 'streak kept 🔥 02/02',
      meta: { likes: 5, comments: 1 },
    },
    {
      id: 'p5',
      type: 'workout',
      author: { name: 'Siddharth_k', initials: 'SK', ringColor: '#FF4B1F' },
      title: 'Upper Body',
      duration: '41 min',
      items: [
        { label: 'Bench Press', detail: '4×6 - 85kg' },
        { label: 'Row', detail: '3×10 - 60kg' },
      ],
      caption: 'quick session. felt strong',
      meta: { likes: 12, comments: 2 },
    },
    {
      id: 'p6',
      type: 'rest',
      author: { name: 'Karan', initials: 'KS', ringColor: '#F97316' },
      text: 'Rest day',
      streakText: 'streak kept 🔥 01/02',
      meta: { likes: 3, comments: 0 },
    },
  ];

  const StoryPill = ({ item }: { item: Story }) => {
    const ringColor = item.postedToday ? '#FF4B1F' : '#2a2a2a';
    return (
      <View style={styles.storyWrap} key={item.id}>
        <View style={[styles.storyRing, { borderColor: ringColor }]}>
          <View style={styles.storyAvatar}>
            <Text style={styles.storyInitials}>{item.initials}</Text>
          </View>
        </View>
        <Text style={styles.storyName} numberOfLines={1}>
          {item.name}
        </Text>
      </View>
    );
  };

  const AvatarRow = ({
    author,
    rightText,
  }: {
    author: { name: string; initials: string; ringColor: string };
    rightText?: string;
  }) => {
    return (
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
  };

  const PostCard = ({ post }: { post: PRPost | WorkoutPost | RestPost }) => {
    if (post.type === 'pr') {
      return (
        <View style={[styles.card, styles.cardPR]} key={post.id}>
          <View style={styles.prTopLine}>
            <Text style={styles.prTopLineText}>{post.headline}</Text>
            <Text style={styles.prTopEmoji}>🔥</Text>
          </View>

          <View style={styles.prMain}>
            <Text style={styles.prNew}>NEW PR</Text>
            <Text style={styles.prValue}>{post.prText}</Text>
            <Text style={styles.prExercise}>{post.exercise}</Text>
            <Text style={styles.prDetail}>{post.detail}</Text>
            <Text style={styles.prPrev}>{post.previousBest}</Text>
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
          <AvatarRow author={post.author} rightText="14 min ago - leg day" />

          <View style={styles.workoutHeader}>
            <Text style={styles.workoutTitle}>{post.title} ·</Text>
            <Text style={styles.workoutDuration}>{post.duration}</Text>
          </View>

          <View style={styles.workoutGrid}>
            {post.items.map((it) => (
              <View key={it.label} style={styles.workoutItem}>
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

          <Text style={styles.captionText}>{post.caption}</Text>

          <View style={styles.metaRowDark}>
            <Text style={styles.metaFlameDark}>🔥 {post.meta.likes}</Text>
            <Text style={styles.metaCountDark}>💬 {post.meta.comments}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.card, styles.cardDark]} key={post.id}>
        <AvatarRow author={post.author} rightText="rest day" />

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
  };

  return (
    <View style={styles.screen}>
      <View style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={styles.logo}>
            <Text style={styles.logoFl}>fl</Text>
            <Text style={styles.logoAmd}>amd</Text>
          </View>

          <View style={styles.topIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
              <MaterialIcons name="notifications" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => {}}>
              <MaterialIcons name="search" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storiesBannerGroup}>
          <FlatList
            data={stories}
            horizontal
            style={{ flexShrink: 1 }}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(s) => s.id}
            contentContainerStyle={styles.storiesRow}
            renderItem={({ item }) => <StoryPill item={item} />}
          />

          <View style={styles.bannerWrap}>
            <View style={styles.banner}>
              <Text style={styles.bannerText}>Get Flamd</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}>
          {posts.map((p) => (
            <View key={p.id} style={styles.postWrap}>
              <PostCard post={p} />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  safeArea: {
    flex: 1,
    paddingTop: 16,
  },
  topBar: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  logoFl: {
    color: '#FF4B1F',
    fontWeight: '800',
    fontSize: 28,
    letterSpacing: 0.2,
  },
  logoAmd: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 28,
    letterSpacing: 0.2,
  },
  topIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  storiesBannerGroup: {
    // Prevent any unexpected spacing between stories and the banner.
    padding: 0,
    margin: 0,
  },
  storiesRow: {
    paddingHorizontal: 14,
    gap: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  storyWrap: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  storyRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  storyName: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    opacity: 0.95,
  },
  bannerWrap: {
    paddingHorizontal: 0,
    marginTop: 8,
    marginBottom: 0,
  },
  banner: {
    backgroundColor: '#FF4B1F',
    borderRadius: 0,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bannerText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 14,
  },
  postWrap: {
    borderRadius: 18,
  },
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
