import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { theme } from '@/theme';
import { fetchDealMessages, sendDealMessage, markDealMessagesRead, type OtcChatMessage } from '@/api/otcChat';

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: '2-digit' });
  } catch {
    return '';
  }
};

const sameDay = (a: string, b: string) => {
  return new Date(a).toDateString() === new Date(b).toDateString();
};

export default function OtcDealChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { dealId } = useLocalSearchParams<{ dealId: string }>();
  const [messages, setMessages] = useState<OtcChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList<OtcChatMessage>>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!dealId) return;
    try {
      const data = await fetchDealMessages(dealId);
      setMessages(data);
    } catch {
      // fail-soft
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  // Initial load + mark-read + lightweight polling for inbound messages.
  useFocusEffect(
    useCallback(() => {
      load();
      if (dealId) {
        markDealMessagesRead(dealId).catch(() => undefined);
        pollRef.current = setInterval(() => {
          fetchDealMessages(dealId).then(setMessages).catch(() => undefined);
        }, 7000);
      }
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [load, dealId])
  );

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        flatRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  const onSend = async () => {
    const text = draft.trim();
    if (!text || !dealId || sending) return;
    setSending(true);
    setDraft('');
    Keyboard.dismiss();
    try {
      const msg = await sendDealMessage(dealId, text);
      setMessages((prev) => [...prev, msg]);
    } catch {
      // restore draft on failure
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft color={theme.colors.gold} size={22} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.gold, fontSize: 16, letterSpacing: 1.2, fontWeight: '300' }}>
            {t('otcChat.dealChatTitle') || 'OTC Desk'}
          </Text>
          <Text style={{ color: theme.colors.textFaint, fontSize: 11, marginTop: 2 }}>
            {String(dealId).startsWith('demo-') ? '⚠ Demo' : t('otcChat.secureChannel') || 'Canal seguro'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.gold} style={{ marginTop: 48 }} />
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16, gap: 4, flexGrow: 1 }}
            renderItem={({ item, index }) => {
              const showDateSep = index === 0 || !sameDay(messages[index - 1].created_at, item.created_at);
              return (
                <>
                  {showDateSep && (
                    <View style={{ alignItems: 'center', marginVertical: 12 }}>
                      <Text style={{
                        color: theme.colors.textFaint, fontSize: 11, letterSpacing: 1,
                        backgroundColor: theme.colors.surface,
                        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                      }}>
                        {formatDate(item.created_at)}
                      </Text>
                    </View>
                  )}
                  <MessageBubble msg={item} />
                </>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 80, paddingHorizontal: 24 }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                  {t('otcChat.noMessages') || 'Sem mensagens ainda. Envie a primeira para iniciar a conversa.'}
                </Text>
              </View>
            }
          />
        )}

        <View style={{
          flexDirection: 'row', alignItems: 'flex-end', gap: 8,
          paddingHorizontal: 12, paddingVertical: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          backgroundColor: theme.colors.bgElevated,
          borderTopWidth: 1, borderTopColor: theme.colors.border,
        }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('otcChat.composerPh') || 'Escrever mensagem…'}
            placeholderTextColor={theme.colors.textFaint}
            multiline
            style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              color: theme.colors.text,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 10,
              maxHeight: 120,
              fontSize: 14,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            testID="otc-chat-input"
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={!draft.trim() || sending}
            activeOpacity={0.8}
            testID="otc-chat-send"
            style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: draft.trim() ? theme.colors.gold : theme.colors.surface,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: theme.colors.gold + '55',
              opacity: !draft.trim() || sending ? 0.5 : 1,
            }}
          >
            {sending ? (
              <ActivityIndicator color="#0a0a0a" size="small" />
            ) : (
              <Send color={draft.trim() ? '#0a0a0a' : theme.colors.gold} size={18} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const MessageBubble: React.FC<{ msg: OtcChatMessage }> = ({ msg }) => {
  const self = msg.is_self;
  return (
    <View style={{
      alignSelf: self ? 'flex-end' : 'flex-start',
      maxWidth: '78%',
      marginVertical: 3,
    }}>
      {!self && (
        <Text style={{
          color: theme.colors.gold, fontSize: 10, letterSpacing: 0.5,
          marginBottom: 2, marginLeft: 4, fontWeight: '600',
        }}>
          {msg.sender_role === 'desk' ? '✦ ' : ''}{msg.sender_name}
        </Text>
      )}
      <View style={{
        backgroundColor: self ? theme.colors.gold : theme.colors.surface,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderTopRightRadius: self ? 4 : 16,
        borderTopLeftRadius: self ? 16 : 4,
        borderWidth: self ? 0 : 1,
        borderColor: theme.colors.border,
      }}>
        <Text style={{
          color: self ? '#0a0a0a' : theme.colors.text,
          fontSize: 14, lineHeight: 19,
        }}>
          {msg.body}
        </Text>
      </View>
      <Text style={{
        color: theme.colors.textFaint, fontSize: 10,
        marginTop: 2,
        textAlign: self ? 'right' : 'left',
        marginHorizontal: 4,
      }}>
        {formatTime(msg.created_at)}
      </Text>
    </View>
  );
};
