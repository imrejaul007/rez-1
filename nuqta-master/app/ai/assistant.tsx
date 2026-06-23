// @ts-nocheck
/**
 * AI Shopping Assistant
 *
 * Conversational AI chat interface for discovering stores, deals, and products.
 * Context-aware: uses user's wallet balance, location, preferences.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import apiClient from '@/services/apiClient';
import { BRAND } from '@/constants/brand';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: { label: string; action: string; param?: string }[];
  timestamp: Date;
}

const QUICK_ACTIONS = [
  { label: 'Find best deals', query: 'What are the best deals near me right now?' },
  { label: 'Gift suggestions', query: 'Suggest gifts under ₹1000' },
  { label: 'Where to use coins', query: 'Where can I use my coins for maximum savings?' },
  { label: 'Coffee nearby', query: 'Find me a coffee shop within 2km' },
];

export default function AIAssistantPage() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'assistant',
      content: `Hi! I'm your ${BRAND.APP_NAME} AI assistant. I can help you find deals, compare products, and discover stores near you. What are you looking for?`,
      suggestions: QUICK_ACTIONS.map(a => ({ label: a.label, action: 'query', param: a.query })),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const response = await apiClient.get('/search/ai-search', { q: text.trim(), limit: 5 });
      const results = response.data?.results || response.data?.stores || response.data?.products || [];

      let replyContent = '';
      const suggestions: Message['suggestions'] = [];

      if (results.length > 0) {
        replyContent = `Here's what I found:\n\n${results.slice(0, 5).map((r: any, i: number) =>
          `${i + 1}. **${r.name || r.title}**${r.cashbackPercent ? ` — ${r.cashbackPercent}% cashback` : ''}${r.price ? ` — ₹${r.price}` : ''}`
        ).join('\n')}`;
        results.slice(0, 3).forEach((r: any) => {
          if (r.storeId || r._id) {
            suggestions.push({ label: `View ${r.name || r.title}`, action: 'navigate', param: `/store/${r.storeId || r._id}` });
          }
        });
      } else {
        replyContent = "I couldn't find specific results for that. Try asking about:\n- Nearby stores or restaurants\n- Best deals today\n- Product comparisons\n- Where to spend your coins";
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant', content: replyContent, suggestions, timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsSending(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [isSending]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Ionicons name="sparkles" size={16} color="#7C3AED" />
          </View>
        )}
        <View style={[s.msgBubble, isUser ? s.userBubble : s.aiBubble]}>
          <Text style={[s.msgText, isUser && s.userMsgText]}>{item.content}</Text>
        </View>
        {item.suggestions?.length ? (
          <View style={s.suggestionsRow}>
            {item.suggestions.map((sug, i) => (
              <Pressable key={i} style={s.suggestionChip}
                onPress={() => sug.action === 'navigate' && sug.param ? router.push(sug.param as any) : sendMessage(sug.param || sug.label)}>
                <Text style={s.suggestionText}>{sug.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }, [router, sendMessage]);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={90}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={i => i.id} renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={s.inputRow}>
          <TextInput style={s.input} placeholder="Ask me anything..." placeholderTextColor="#9CA3AF"
            value={input} onChangeText={setInput} onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send" editable={!isSending} />
          <Pressable style={[s.sendBtn, isSending && { opacity: 0.5 }]} onPress={() => sendMessage(input)} disabled={isSending}>
            {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={18} color="#FFF" />}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  msgRow: { marginBottom: 12 },
  msgRowUser: { alignItems: 'flex-end' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  msgBubble: { maxWidth: '80%', borderRadius: 14, padding: 12 },
  userBubble: { backgroundColor: '#7C3AED', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  msgText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  userMsgText: { color: '#FFF' },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingLeft: 32 },
  suggestionChip: { backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  suggestionText: { fontSize: 12, color: '#7C3AED', fontWeight: '600' },
  inputRow: { flexDirection: 'row', padding: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: '#FFF', gap: 8 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E5E7EB', color: '#111827' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', justifyContent: 'center', alignItems: 'center' },
});
