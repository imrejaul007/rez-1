// @ts-nocheck
/**
 * Corporate Team Management
 * Add/remove team members, assign roles, view team spend.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';

interface TeamMember { _id: string; name: string; email: string; phone: string; role: string; monthlySpend: number; joinedAt: string; }

export default function CorporateTeamPage() {
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTeam = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/user/profile');
      setMembers(res.data?.corporateAccount?.members || []);
    } catch {} finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (!authLoading && isAuthenticated) fetchTeam(); }, [isAuthenticated, authLoading, fetchTeam]);

  const filtered = members.filter(m => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));

  const renderMember = useCallback(({ item }: { item: TeamMember }) => (
    <View style={s.card}>
      <View style={s.avatar}><Text style={s.avatarText}>{item.name?.[0] || '?'}</Text></View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.email}>{item.email}</Text>
      </View>
      <View style={s.roleBadge}><Text style={s.roleText}>{item.role}</Text></View>
    </View>
  ), []);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <FlatList data={filtered} keyExtractor={i => i._id} renderItem={renderMember}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text style={s.title}>Team Members</Text>
            <TextInput style={s.searchInput} placeholder="Search by name or email..." placeholderTextColor="#9CA3AF" value={search} onChangeText={setSearch} />
          </View>
        }
        ListEmptyComponent={isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color="#7C3AED" /> : (
          <View style={s.empty}><Ionicons name="people-outline" size={48} color="#9CA3AF" /><Text style={s.emptyText}>No team members yet</Text></View>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  searchInput: { backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 14, marginBottom: 14, color: '#111827' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 8, ...Platform.select({ ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, android: { elevation: 1 } }) },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  email: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  roleBadge: { backgroundColor: '#F3E8FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleText: { fontSize: 11, fontWeight: '600', color: '#7C3AED', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
});
