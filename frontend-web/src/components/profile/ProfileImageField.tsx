import { ImageUp, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { profileService } from '../../services/profileService'
import { ApiError } from '../../utils/apiError'
import { Button } from '../common/Button'
import { Avatar } from './Avatar'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ProfileImageFieldProps {
  label: string
  /** Name behind the initials while there is no picture. */
  name: string
  value: string
  onChange: (url: string) => void
  shape: 'circle' | 'square'
  disabled?: boolean
}

/** A photo or logo: it uploads as soon as it is chosen, and the panel's Save keeps it. */
export function ProfileImageField({ label, name, value, onChange, shape, disabled }: ProfileImageFieldProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const messageId = useId()
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function upload(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setMessage(t('publish.uploader.notImage', { name: file.name }))
      return
    }
    if (file.size > MAX_FILE_BYTES) {
      setMessage(t('publish.uploader.tooBig', { name: file.name }))
      return
    }
    setMessage(null)
    setIsUploading(true)
    try {
      onChange(await profileService.uploadImage(file))
    } catch (error) {
      setMessage(ApiError.from(error).message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || '?'} src={value || null} shape={shape} size="lg" />
      <div className="min-w-0 space-y-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => inputRef.current?.click()}
            isLoading={isUploading}
            disabled={disabled}
            leftIcon={<ImageUp className="size-4" />}
            aria-describedby={messageId}
          >
            {value ? t('profile.image.change') : t('profile.image.upload')}
          </Button>
          {value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange('')}
              disabled={disabled || isUploading}
              leftIcon={<Trash2 className="size-4" />}
            >
              {t('profile.image.remove')}
            </Button>
          )}
        </div>
        <p id={messageId} role={message ? 'alert' : undefined} className={message ? 'text-xs text-red-600' : 'text-xs text-slate-500'}>
          {message ?? t('profile.image.rules')}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void upload(file)
        }}
      />
    </div>
  )
}
