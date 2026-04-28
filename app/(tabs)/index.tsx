import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FeedPostCard, normalizeFirestorePost, type FeedPost } from '@/components/feed-post-card';
import { useAuthContext } from '@/contexts/AuthProvider';
import { getFeedPosts, getUser } from '@/lib/firestore';

const COLORS = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  accent: '#FF4B1F',
  text: '#FFFFFF',
};

type Story = { id: string; name: string; postedToday: boolean; initials: string };

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    try {
      const u = await getUser(user.uid);
      setUserData(u);
      const followingIds = [...(u?.following ?? []), user.uid];
      const feedPosts = await getFeedPosts(followingIds);
      setPosts(feedPosts);

      const initialsFrom = (name: string) => {
        const t = name.trim();
        if (t.length >= 2) return t.slice(0, 2).toUpperCase();
        if (t.length === 1) return (t + t).toUpperCase();
        return 'YO';
      };

      const following = u?.following ?? [];
      if (following.length === 0) {
        setStories([
          {
            id: user.uid,
            name: u?.displayName ?? 'You',
            initials: initialsFrom(u?.displayName ?? 'YO'),
            postedToday: true,
          },
        ]);
      } else {
        const profiles = await Promise.all(following.map((fid) => getUser(fid)));
        const friendStories: Story[] = [];
        profiles.forEach((p, i) => {
          if (!p) return;
          const name = p.displayName ?? p.username ?? 'Friend';
          friendStories.push({
            id: following[i],
            name,
            initials: initialsFrom(p.displayName ?? p.username ?? 'FR'),
            postedToday: false,
          });
        });
        setStories(friendStories);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadFeed();
  }, [user, loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  const StoryPill = ({ item }: { item: Story }) => {
    const ringColor = item.postedToday ? '#FF4B1F' : '#2a2a2a';
    return (
      <View style={styles.storyWrap}>
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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FF4B1F" size="large" />
      </View>
    );
  }

  const normalizedPosts = posts
    .map((p) => normalizeFirestorePost(p as Record<string, unknown> & { id?: string }))
    .filter((p): p is FeedPost => p != null);

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
            <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/search' as any)}>
              <MaterialIcons name="search" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.storiesBannerGroup}>
          <FlatList
            data={stories}
            extraData={userData}
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
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4B1F" />
          }>
          {normalizedPosts.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Text style={{ color: '#444', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                No posts yet — log a workout or add friends to see their posts here
              </Text>
            </View>
          ) : (
            normalizedPosts.map((p) => (
              <View key={p.id} style={styles.postWrap}>
                <FeedPostCard
                  post={p}
                  onAuthorPress={
                    p.userId
                      ? () =>
                          router.push({
                            pathname: '/user-profile',
                            params: { uid: p.userId },
                          } as any)
                      : undefined
                  }
                />
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingTop: 50,
  },
  safeArea: {
    flex: 1,
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
    minWidth: 44,
    minHeight: 44,
    padding: 10,
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
});
