import { useAuthContext } from '@/contexts/AuthProvider';
import {
  followUser,
  getUser,
  searchUsersByUsernamePrefix,
  unfollowUser,
  type UserDocument,
} from '@/lib/firestore';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const BG = '#0D0D0D';
const CARD = '#1A1A1A';
const ACCENT = '#FF4B1F';

function initialsFrom(user: UserDocument & { uid: string }): string {
  const n = user.displayName?.trim() || user.username?.trim() || '??';
  if (n.length >= 2) return n.slice(0, 2).toUpperCase();
  return (n + n).slice(0, 2).toUpperCase();
}

export default function AddFriendsScreen() {
  const router = useRouter();
  const { user } = useAuthContext();

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<(UserDocument & { uid: string })[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
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
      setFollowingIds(me?.following ?? []);
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
        console.error('[AddFriends]', e);
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

  const handleFollow = useCallback(
    async (targetUser: UserDocument & { uid: string }) => {
      if (!user) return;
      const targetUid = targetUser.uid;
      try {
        await followUser(user.uid, targetUid);
        setFollowingIds((prev) => (prev.includes(targetUid) ? prev : [...prev, targetUid]));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert('Could not follow', message);
        console.error(e);
      }
    },
    [user],
  );

  const handleUnfollow = useCallback(
    async (targetUid: string) => {
      if (!user) return;
      try {
        await unfollowUser(user.uid, targetUid);
        setFollowingIds((prev) => prev.filter((id) => id !== targetUid));
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        Alert.alert('Could not unfollow', message);
        console.error(e);
      }
    },
    [user],
  );

  const goToApp = useCallback(() => {
    router.replace('/(tabs)/' as any);
  }, [router]);

  const resultsHeader = useMemo(() => {
    if (!debouncedQuery) return '';
    return `RESULTS FOR '${debouncedQuery.toUpperCase()}'`;
  }, [debouncedQuery]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.heroEmoji}>🔥</Text>
        <Text style={styles.heroTitle}>Find your friends</Text>
        <Text style={styles.heroSub}>{"See who's already on Flamd"}</Text>

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
                      const isFollowing = followingIds.includes(u.uid);
                      const streak = u.currentStreak ?? 0;
                      const display = u.displayName?.trim() || u.username || 'User';
                      return (
                        <View key={u.uid}>
                          {idx > 0 ? <View style={styles.divider} /> : null}
                          <View style={styles.row} pointerEvents="box-none">
                            <View
                              style={[
                                styles.avatar,
                                { backgroundColor: isFollowing ? ACCENT : '#2a2a2a' },
                              ]}>
                              <Text style={styles.avatarText}>{initialsFrom(u)}</Text>
                            </View>
                            <View style={styles.rowMid} pointerEvents="box-none">
                              <Text style={styles.username}>{u.username ?? u.uid}</Text>
                              <Text style={styles.subline}>
                                {display} · 🔥 {streak}d streak
                              </Text>
                            </View>
                            {isFollowing ? (
                              <Pressable
                                style={styles.btnFollowing}
                                onLongPress={() => handleUnfollow(u.uid)}
                                delayLongPress={450}>
                                <Text style={styles.btnFollowingText}>Following</Text>
                              </Pressable>
                            ) : (
                              <TouchableOpacity
                                style={styles.btnAdd}
                                activeOpacity={0.85}
                                onPress={() => handleFollow(u)}
                                hitSlop={10}
                                accessibilityRole="button"
                                accessibilityLabel={`Add ${u.username ?? 'user'}`}>
                                <Text style={styles.btnAddText}>Add</Text>
                              </TouchableOpacity>
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

      <View style={styles.bottom}>
        <Pressable onPress={goToApp} hitSlop={8}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
        <TouchableOpacity style={styles.continueBtn} activeOpacity={0.9} onPress={goToApp}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <Text style={styles.bottomHint}>
          You can always find friends later from the home screen
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 50,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  scrollFlex: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  heroEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 24,
    textAlign: 'center',
  },
  heroSub: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
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
  bottom: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 14,
  },
  skipText: {
    color: '#888888',
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  bottomHint: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});
