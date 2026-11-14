import { Ionicons } from '@expo/vector-icons'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, RefreshControl, Text, View } from 'react-native'
import { AppButton } from '../../components/AppButton'
import { EmptyState, ErrorView, LoadingView } from '../../components/StateViews'
import { TextField } from '../../components/TextField'
import { useAction } from '../../hooks/useAction'
import { useAsync } from '../../hooks/useAsync'
import { useTheme } from '../../hooks/useTheme'
import { categoryService } from '../../services/rentequipApi'
import { radius, spacing } from '../../theme'
import { makeStyles } from '../../theme/makeStyles'
import type { EquipmentCategory } from '../../types/api'

const MIN_NAME = 2
const MAX_NAME = 80

/**
 * Admin screen for the catalogue categories: create (POST), rename with a description (PUT replaces the
 * whole category) and delete (DELETE). The backend only lets company admins do it.
 */
export default function CategoriesScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const fetchCategories = useCallback((signal: AbortSignal) => categoryService.list(signal), [])
  const categories = useAsync(fetchCategories)
  const { run, isRunning } = useAction()
  const [editing, setEditing] = useState<EquipmentCategory | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState<string | undefined>()

  function startEditing(category: EquipmentCategory | null) {
    setEditing(category)
    setName(category?.name ?? '')
    setDescription(category?.description ?? '')
    setNameError(undefined)
  }

  async function save() {
    const trimmed = name.trim()
    if (trimmed.length < MIN_NAME || trimmed.length > MAX_NAME) {
      setNameError(t('categories.nameLength', { min: MIN_NAME, max: MAX_NAME }))
      return
    }
    const request = { name: trimmed, description: description.trim() || undefined }
    const saved = await run(
      () => (editing ? categoryService.replace(editing.id, request) : categoryService.create(request)),
      { successMessage: editing ? t('categories.updated') : t('categories.created'), errorTitle: t('categories.saveFailed') },
    )
    if (saved) {
      startEditing(null)
      categories.refresh()
    }
  }

  function confirmDelete(category: EquipmentCategory) {
    Alert.alert(t('categories.deleteTitle'), t('categories.deleteMessage', { name: category.name }), [
      { text: t('common.back'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          void run(() => categoryService.remove(category.id), {
            successMessage: t('categories.deleted'),
            errorTitle: t('categories.deleteFailed'),
            onSuccess: () => {
              if (editing?.id === category.id) startEditing(null)
              categories.refresh()
            },
          }),
      },
    ])
  }

  if (categories.isLoading) return <LoadingView label={t('categories.loading')} />
  if (categories.error) return <ErrorView error={categories.error} onRetry={categories.reload} />

  const form = (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{editing ? t('categories.editTitle', { name: editing.name }) : t('categories.newTitle')}</Text>
      <TextField
        label={t('categories.name')}
        required
        value={name}
        onChangeText={(text) => {
          setName(text)
          setNameError(undefined)
        }}
        error={nameError}
        maxLength={MAX_NAME}
        placeholder={t('categories.namePlaceholder')}
      />
      <TextField
        label={t('categories.description')}
        value={description}
        onChangeText={setDescription}
        maxLength={255}
        placeholder={t('common.optional')}
      />
      <View style={styles.row}>
        {editing && <AppButton title={t('common.cancel')} variant="secondary" style={styles.flex} onPress={() => startEditing(null)} />}
        <AppButton
          title={editing ? t('common.save') : t('categories.create')}
          icon={editing ? 'save-outline' : 'add'}
          style={styles.flex}
          isLoading={isRunning}
          onPress={() => void save()}
        />
      </View>
    </View>
  )

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={categories.data ?? []}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={form}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={categories.isRefreshing} onRefresh={categories.refresh} tintColor={colors.brand} />}
        ListEmptyComponent={<EmptyState icon="pricetags-outline" title={t('categories.empty')} description={t('categories.emptyHint')} />}
        renderItem={({ item }) => (
          <View style={[styles.item, editing?.id === item.id && styles.itemEditing]}>
            <View style={styles.flex}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description && <Text style={styles.caption}>{item.description}</Text>}
            </View>
            <Pressable
              onPress={() => startEditing(item)}
              accessibilityRole="button"
              accessibilityLabel={t('categories.editLabel', { name: item.name })}
              hitSlop={8}
            >
              <Ionicons name="create-outline" size={22} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={t('categories.deleteLabel', { name: item.name })}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 48 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: typography.heading,
  caption: typography.caption,
  row: { flexDirection: 'row', gap: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  itemEditing: { borderColor: colors.brand },
  itemName: { fontSize: 15, fontWeight: '700', color: colors.ink },
}))
