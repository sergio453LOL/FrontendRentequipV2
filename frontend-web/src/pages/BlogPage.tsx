import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArticleRow, LeadArticle } from '../components/blog/BlogCards'
import { ScrollToTopButton } from '../components/common/ScrollToTopButton'
import { SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { BLOG_ARTICLES } from '../content/blog'
import { PATHS } from '../routes/paths'

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Every guide, newest first: the latest one large, the rest as a list beside and below it. */
export default function BlogPage() {
  const { t } = useTranslation()
  const [lead, ...rest] = [...BLOG_ARTICLES].sort((a, b) => b.date.localeCompare(a.date))

  useEffect(() => {
    const previous = document.title
    document.title = `${t('blog.title')} · RentEquip`
    return () => {
      document.title = previous
    }
  }, [t])

  return (
    <div className="theme-light flex min-h-screen flex-col bg-slate-50 text-ink">
      <SiteHeader
        nav={
          <>
            <Link to={PATHS.landing} className="transition-colors hover:text-ink">
              {t('blog.navHome')}
            </Link>
            <Link to={PATHS.blog} aria-current="page" className="font-medium text-ink underline decoration-machine decoration-[3px] underline-offset-[6px]">
              {t('blog.nav')}
            </Link>
          </>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-14 pb-24 sm:px-6 lg:pt-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }} className="max-w-3xl">
          <h1 className="text-4xl leading-[1.05] font-bold tracking-[-0.025em] text-balance text-[#0f172a] sm:text-6xl">{t('blog.title')}</h1>
          <p className="mt-5 max-w-[56ch] text-lg leading-8 text-slate-700">{t('blog.intro')}</p>
        </motion.div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08, ease: EASE_OUT }}>
            <LeadArticle article={lead} headingLevel="h2" />
          </motion.div>
          <ul className="space-y-8">
            {rest.map((article, index) => (
              <motion.li
                key={article.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.16 + index * 0.07, ease: EASE_OUT }}
              >
                <ArticleRow article={article} headingLevel="h2" />
              </motion.li>
            ))}
          </ul>
        </div>
      </main>

      <SiteFooter />
      <ScrollToTopButton />
    </div>
  )
}
