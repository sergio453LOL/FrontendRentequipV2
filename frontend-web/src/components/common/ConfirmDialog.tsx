import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { Modal } from './Modal'
import { Textarea } from './Textarea'

const MAX_REASON_LENGTH = 500

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  variant?: 'primary' | 'danger'
  /** Shows an optional "reason" field whose text is passed to `onConfirm`. */
  askForReason?: boolean
  isLoading?: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

/** Asks for explicit confirmation before a destructive or irreversible action. */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  variant = 'danger',
  askForReason = false,
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  function handleClose() {
    setReason('')
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={handleClose}
      size="sm"
      isDismissable={!isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            {t('common.back')}
          </Button>
          <Button variant={variant} isLoading={isLoading} onClick={() => onConfirm(reason.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
      {askForReason && (
        <Textarea
          className="mt-4"
          label={t('dialog.reasonLabel')}
          placeholder={t('dialog.reasonPlaceholder')}
          maxLength={MAX_REASON_LENGTH}
          hint={`${reason.length}/${MAX_REASON_LENGTH}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      )}
    </Modal>
  )
}
