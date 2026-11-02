import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BrandWordmark } from '../common/BrandMark'
import { LanguageMenu } from '../common/LanguageMenu'

interface AuthLayoutProps {
  title: string
  description: string
  /** Width of the form column: the login is a narrow form, the registration has two columns of fields. */
  width?: 'narrow' | 'wide'
  children: ReactNode
}

/**
 * Clip placement in the tall left panel. A landscape clip cropped to fill the panel would cut the worker,
 * so it keeps its ratio instead: 150% of the panel's width, which shows the worker and the towers behind
 * him (centred at 52% of the frame), on the bottom edge. Its top fades into a backdrop of the clip's pale sky.
 */
const CLIP_CLASSES =
  'absolute bottom-0 left-[-28%] h-auto w-[150%] max-w-none [mask-image:linear-gradient(to_bottom,transparent,black_12%)]'

/**
 * Login and registration: a looping clip of a construction worker over the city on the left half, the form on
 * white on the right. With "reduce motion" on, the clip's first frame stands still instead.
 */
export function AuthLayout({ title, description, width = 'narrow', children }: AuthLayoutProps) {
  const { t } = useTranslation()
  return (
    <main className="theme-light min-h-screen bg-sheet lg:grid lg:grid-cols-2">
      <figure className="relative hidden overflow-hidden bg-gradient-to-b from-[#eef8fa] to-[#d2eaee] lg:block">
        <video
          src="/videos/login.mp4"
          poster="/videos/login.jpg"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className={`${CLIP_CLASSES} motion-reduce:hidden`}
        />
        <img src="/videos/login.jpg" alt={t('photo.authAlt')} className={`${CLIP_CLASSES} hidden motion-reduce:block`} />
      </figure>

      <div className="flex min-h-screen flex-col px-4 py-6 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <BrandWordmark />
          <LanguageMenu />
        </div>
        <div className={`m-auto w-full py-10 ${width === 'wide' ? 'max-w-[560px]' : 'max-w-[380px]'}`}>
          <h1 className="text-[22px] leading-7 font-semibold text-ink">{title}</h1>
          <p className="mt-1 mb-8 text-sm text-slate-600">{description}</p>
          {children}
        </div>
      </div>
    </main>
  )
}
