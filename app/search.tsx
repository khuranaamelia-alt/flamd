import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuthContext } from '@/contexts/AuthProvider';
import {
  followUser,
  getUser,
  searchUsersByUsernamePrefix,
  unfollowUser,
  type UserDocument,
} from '@/lib/firestore';

export const options = { headerShown: false };

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';

function initialsFrom(user: UserDocument & { uid: string }): string {
  const n = user.displayName?.trim() || user.username?.trim() || '??';
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  return (n + n).slice(0, 2).toUpperCase();
}

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<(UserDocument & { uid: string })[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchText.trim());
    }, 500);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    if (!user) return;
    getUser(user.uid).then((me) => {
      setFollowingIds(new Set(me?.following ?? []));
    });
  }, [user]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    (async () => {
      try {
        const r = await searchUsersByUsernamePrefix(debouncedQuery);
        if (cancelled) return;
        const filtered = r.filter((u) => u.uid !== user?.uid);
        setResults(filtered);
        setHasSearched(true);
      } catch (e) {
        console.error('[Search]', e);
        setResults([]);
        setHasSearched(true);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, user?.uid]);

  const onFollow = useCallback(
    async (targetUid: string) => {
      if (!user) return;
      try {
        await followUser(user.uid, targetUid);
        setFollowingIds((prev) => new Set(prev).add(targetUid));
      } catch (e) {
        console.error(e);
      }
    },
    [user],
  );

  const onUnfollow = useCallback(
    async (targetUid: string) => {
      if (!user) return;
      try {
        await unfollowUser(user.uid, targetUid);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
      } catch (e) {
        console.error(e);
      }
    },
    [user],
  );

  const resultsHeader = useMemo(() => {
    if (!debouncedQuery) return '';
    return `RESULTS FOR '${debouncedQuery.toUpperCase()}'`;
  }, [debouncedQuery]);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        </View>
        <View style={styles.topBarCenter}>
          <Text style={styles.topTitle}>Find friends</Text>
        </View>
        <View style={styles.topBarRight} />
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search by username..."
          placeholderTextColor="#666666"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.searchInput}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {!debouncedQuery ? (
          <>
            <Text style={styles.sectionLabel}>Before searching</Text>
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyText}>Search for friends by username</Text>
            </View>
          </>
        ) : (
          <>
            {searching ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator color={ACCENT} size="large" />
              </View>
            ) : (
              <>
                {results.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>{resultsHeader}</Text>
                    {results.map((u, idx) => {
                      const isFollowing = followingIds.has(u.uid);
                      const streak = u.currentStreak ?? 0;
                      const display = u.displayName?.trim() || u.username || 'User';
                      return (
                        <View key={u.uid}>
                          {idx > 0 ? <View style={styles.divider} /> : null}
                          <View style={styles.row}>
                            <View
                              style={[
                                styles.avatar,
                                { backgroundColor: isFollowing ? ACCENT : '#2a2a2a' },
                              ]}>
                              <Text style={styles.avatarText}>{initialsFrom(u)}</Text>
                            </View>
                            <View style={styles.rowMid}>
                              <Text style={styles.username}>{u.username ?? u.uid}</Text>
                              <Text style={styles.subline}>
                                {display} · 🔥 {streak}d streak
                              </Text>
                            </View>
                            {isFollowing ? (
                              <Pressable
                                style={styles.btnFollowing}
                                onLongPress={() => onUnfollow(u.uid)}
                                delayLongPress={450}>
                                <Text style={styles.btnFollowingText}>Following</Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={styles.btnAdd}
                                onPress={() => onFollow(u.uid)}
                                hitSlop={8}>
                                <Text style={styles.btnAddText}>Add</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </>
                ) : hasSearched ? (
                  <View style={styles.emptyBlock}>
                    <Text style={styles.emptyText}>No users found</Text>
                  </View>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBarLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  topBarCenter: {
    flex: 2,
    alignItems: 'center',
  },
  topBarRight: {
    flex: 1,
  },
  backText: {
    color: '#555555',
    fontWeight: '800',
    fontSize: 16,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 17,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 10,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  scroll: {
    paddingBottom: 40,
  },
  sectionLabel: {
    color: '#666666',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
    marginVertical: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  subline: {
    color: '#888888',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  btnAdd: {
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  btnAddText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  btnFollowing: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  btnFollowingText: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 13,
  },
  emptyBlock: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingBlock: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});
