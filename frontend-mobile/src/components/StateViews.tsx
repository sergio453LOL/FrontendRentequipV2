import { Ionicons } from '@expo/vector-icons'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, View } from 'react-native'
import { useTheme } from '../hooks/useTheme'
import { spacing } from '../theme'
import { makeStyles } from '../theme/makeStyles'
import type { ApiError } from '../utils/apiError'
import { AppButton } from './AppButton'

export function LoadingView({ label }: { label?: string }) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const text = label ?? t('common.loading')
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={text}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.caption}>{text}</Text>
    </View>
  )
}

interface ErrorViewProps {
  error: ApiError
  onRetry?: () => void
}

/** Friendly error with a retry button when retrying makes sense (not for 403/404). */
export function ErrorView({ error, onRetry }: ErrorViewProps) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const styles = useStyles()
  const canRetry = onRetry && error.status !== 403 && error.status !== 404
  return (
    <View style={styles.center} accessibilityRole="alert">
      <Ionicons name={error.isNetworkError ? 'cloud-offline-outline' : 'alert-circle-outline'} size={44} color={colors.danger} />
      <Text style={styles.title}>{error.isNetworkError ? t('stateViews.noConnection') : t('stateViews.somethingWrong')}</Text>
      <Text style={styles.description}>{error.message}</Text>
      {canRetry && <AppButton title={t('common.retry')} icon="refresh" variant="secondary" onPress={onRetry} />}
    </View>
  )
}

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme()
  const styles = useStyles()
  return (
    <View style={styles.center}>
      <View style={styles.iconBubble}>
        <Ionicons name={icon} size={30} color={colors.brandDark} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {action}
    </View>
  )
}

const useStyles = makeStyles((colors, typography) => ({
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  caption: typography.caption,
  title: { ...typography.heading, textAlign: 'center' },
  description: { ...typography.body, textAlign: 'center', color: colors.muted },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
}))
