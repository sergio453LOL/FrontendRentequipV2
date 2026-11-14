import { Ionicons } from '@expo/vector-icons'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native'
import { EquipmentImage } from '../../components/EquipmentCard'
import { useTheme } from '../../hooks/useTheme'
import type { RootScreenProps } from '../../navigation/types'
import { assistantService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { ChatTurn, EquipmentSummary } from '../../types/api'
import { ApiError } from '../../utils/apiError'
import { formatCurrency } from '../../utils/format'

/** Same limit as the backend guardrail: longer questions are answered locally without calling the model. */
const MAX_MESSAGE_LENGTH = 300

interface ChatMessage extends ChatTurn {
  id: number
  recommendations?: EquipmentSummary[]
  isError?: boolean
}

/**
 * Chat with the catalogue assistant. The backend decides who answers: greetings and off-topic questions
 * locally, rental questions through Gemini, and the keyword search when the model is not available.
 */
export default function AssistantScreen({ navigation }: RootScreenProps<'Assistant'>) {
  const { t } = useTranslation()
  const { colors, scheme } = useTheme()
  const styles = useStyles()
  const nextId = useRef(1)
  const listRef = useRef<FlatList<ChatMessage>>(null)
  // The greeting (always the first message) is drawn from i18n, so it follows the language switch.
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 0, role: 'assistant', content: '' }])
  const [draft, setDraft] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const suggestions = t('assistant.suggestions', { returnObjects: true }) as readonly string[]

  function createMessage(message: Omit<ChatMessage, 'id'>): ChatMessage {
    return { ...message, id: nextId.current++ }
  }

  async function ask(question: string) {
    const text = question.trim()
    if (!text || isReplying) return

    const userMessage = createMessage({ role: 'user', content: text })
    // The greeting is UI copy and errors are not part of the conversation the model should see.
    const history = [...messages.slice(1), userMessage]
      .filter((message) => !message.isError)
      .map(({ role, content }) => ({ role, content }))

    setMessages((current) => [...current, userMessage])
    setDraft('')
    setIsReplying(true)
    try {
      const response = await assistantService.chat(history)
      setMessages((current) => [
        ...current,
        createMessage({ role: 'assistant', content: response.reply, recommendations: response.recommendations }),
      ])
    } catch (error) {
      setMessages((current) => [
        ...current,
        createMessage({ role: 'assistant', content: ApiError.from(error).message, isError: true }),
      ])
    } finally {
      setIsReplying(false)
    }
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.messageRow, item.role === 'user' && styles.userRow]}>
      <View
        style={[
          styles.bubble,
          item.role === 'user' ? styles.userBubble : styles.assistantBubble,
          item.isError && styles.errorBubble,
        ]}
      >
        <Text style={[styles.bubbleText, item.role === 'user' && styles.userText, item.isError && styles.errorText]}>
          {item.id === 0 ? t('assistant.greeting') : item.content}
        </Text>
      </View>
      {item.recommendations?.map((equipment) => (
        <Pressable
          key={equipment.id}
          style={({ pressed }) => [styles.recommendation, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('assistant.see', { name: equipment.name })}
          onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: equipment.id, name: equipment.name })}
        >
          <View style={styles.thumb}>
            <EquipmentImage uri={equipment.primaryImageUrl} height={56} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.recommendationName} numberOfLines={1}>
              {equipment.name}
            </Text>
            <Text style={styles.recommendationMeta}>
              {equipment.city} · {formatCurrency(equipment.dailyRate, equipment.currency)} {t('common.perDay')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          isReplying ? (
            <View style={styles.thinking} accessibilityLabel={t('assistant.thinking')}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.thinkingText}>{t('assistant.searching')}</Text>
            </View>
          ) : messages.length === 1 ? (
            <View style={styles.suggestions}>
              <Text style={styles.thinkingText}>{t('assistant.tryAsking')}</Text>
              {suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
                  onPress={() => void ask(suggestion)}
                  accessibilityRole="button"
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          ) : undefined
        }
      />
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={t('assistant.placeholder')}
          placeholderTextColor={colors.muted}
          keyboardAppearance={scheme}
          style={styles.input}
          maxLength={MAX_MESSAGE_LENGTH}
          editable={!isReplying}
          returnKeyType="send"
          onSubmitEditing={() => void ask(draft)}
          accessibilityLabel={t('assistant.inputLabel')}
        />
        <Pressable
          onPress={() => void ask(draft)}
          disabled={!draft.trim() || isReplying}
          style={[styles.send, (!draft.trim() || isReplying) && styles.disabled]}
          accessibilityRole="button"
          accessibilityLabel={t('assistant.send')}
        >
          <Ionicons name="send" size={18} color={colors.onBrand} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, gap: spacing.md },
  messageRow: { gap: spacing.sm, alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  userBubble: { backgroundColor: colors.brand },
  errorBubble: { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  userText: { color: colors.onBrand },
  errorText: { color: colors.danger },
  recommendation: {
    width: '88%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  thumb: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden' },
  recommendationName: { fontSize: 14, fontWeight: '700', color: colors.ink },
  recommendationMeta: { fontSize: 13, color: colors.muted },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  thinkingText: { fontSize: 13, color: colors.muted },
  suggestions: { gap: spacing.sm, paddingTop: spacing.sm },
  suggestion: { backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: spacing.md },
  suggestionText: { fontSize: 14, color: colors.brandDark, fontWeight: '600' },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.background,
  },
  send: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
}))
