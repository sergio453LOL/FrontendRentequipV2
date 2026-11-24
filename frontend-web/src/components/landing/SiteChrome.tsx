import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PATHS } from '../../routes/paths'
import { MODE_HOME, readStoredMode } from '../../utils/workspaceMode'
import { BrandMark } from '../common/BrandMark'
import { LanguageMenu } from '../common/LanguageMenu'
import { NewsletterSignup } from './NewsletterSignup'

/** The yellow action of the public pages: register, or go to the panel once signed in. */
export function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="inline-flex">
      <Link
        to={to}
        className="inline-flex h-11 items-center gap-2 rounded-lg bg-machine px-5 text-[15px] font-semibold whitespace-nowrap text-asphalt transition-colors hover:bg-machine-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt"
      >
        {children}
      </Link>
    </motion.span>
  )
}

/**
 * Header shared by the landing and the blog. `nav` holds the section links of the page it sits on; `appHome`
 * is the side of the panel the visitor chose (renter or owner), read from storage when not given.
 */
export function SiteHeader({ nav, appHome }: { nav?: ReactNode; appHome?: string }) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const home = appHome ?? MODE_HOME[readStoredMode()]
  return (
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to={PATHS.landing} className="flex items-center gap-2" aria-label={t('landing.home')}>
          <BrandMark className="size-7 text-machine" />
          <span className="text-xl font-bold tracking-tight text-ink">RentEquip</span>
        </Link>
        {nav && (
          <nav className="ml-3 hidden items-center gap-8 text-[17px] text-slate-500 md:flex" aria-label={t('landing.sections')}>
            {nav}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-2">
          <LanguageMenu />
          {isAuthenticated ? (
            <ActionLink to={home}>
              {t('landing.goToPanel')} <ArrowRight className="size-4" aria-hidden="true" />
            </ActionLink>
          ) : (
            <>
              <Link to={PATHS.login} className="hidden h-10 items-center rounded-lg px-4 text-[17px] font-medium text-ink transition-colors hover:bg-slate-100 sm:inline-flex">
                {t('landing.login')}
              </Link>
              <ActionLink to={PATHS.register}>{t('landing.register')}</ActionLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

/** Dark close of the public pages: the name, what RentEquip is, the offers sign-up and the credits line. */
export function SiteFooter() {
  const { t } = useTranslation()
  return (
    <footer className="bg-asphalt">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-12 sm:px-6 md:grid-cols-[1fr_auto] md:items-start">
        <div className="max-w-sm space-y-3">
          <Link to={PATHS.landing} className="inline-flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-machine">
            <BrandMark className="size-7 text-machine" />
            <span className="text-xl font-bold tracking-tight text-white">RentEquip</span>
          </Link>
          <p className="text-sm leading-6 text-[#a3a7ad]">{t('landing.footerTagline')}</p>
          <Link to={PATHS.blog} className="inline-block text-sm font-semibold text-white underline decoration-machine decoration-2 underline-offset-4 hover:decoration-white">
            {t('blog.footerLink')}
          </Link>
        </div>
        <NewsletterSignup />
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-[#a3a7ad] sm:px-6">
          <span>{t('landing.footer')}</span>
          <span>{t('landing.location')}</span>
        </div>
      </div>
    </footer>
  )
}
