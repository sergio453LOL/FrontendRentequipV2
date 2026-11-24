import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Lightbulb } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArticleMeta, ArticleRow } from '../components/blog/BlogCards'
import { ScrollToTopButton } from '../components/common/ScrollToTopButton'
import { SiteFooter, SiteHeader } from '../components/landing/SiteChrome'
import { BLOG_ARTICLES, blogImageUrl, findArticle, type BlogBlock } from '../content/blog'
import { PATHS } from '../routes/paths'
import { photoCredit } from '../utils/photoCredits'

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case 'h2':
      return <h2 className="mt-12 text-2xl leading-tight font-bold tracking-tight text-balance text-[#0f172a]">{block.text}</h2>
    case 'p':
      return <p className="mt-5 text-[17px] leading-8 text-ink">{block.text}</p>
    case 'list':
      return (
        <ul className="mt-5 space-y-3">
          {block.items.map((item) => (
            <li key={item} className="flex gap-3 text-[17px] leading-8 text-ink">
              <span className="mt-[13px] size-2 shrink-0 rounded-full bg-machine" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )
    case 'tip':
      return (
        <p className="mt-8 flex gap-3 rounded-xl bg-machine/20 px-5 py-4 text-[17px] leading-8 text-asphalt">
          <Lightbulb className="mt-1.5 size-5 shrink-0" aria-hidden="true" />
          <span>{block.text}</span>
        </p>
      )
  }
}

/** One guide: the title and its photo, the text at reading width, then the way to act on it. */
export default function BlogArticlePage() {
  const { t } = useTranslation()
  const { slug } = useParams<{ slug: string }>()
  const article = findArticle(slug)

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!article) return
    const previous = document.title
    document.title = `${article.title} · RentEquip`
    return () => {
      document.title = previous
    }
  }, [article])

  if (!article) return <Navigate to={PATHS.blog} replace />

  const imageUrl = blogImageUrl(article.image)
  const credit = photoCredit(imageUrl)
  const others = BLOG_ARTICLES.filter((other) => other.slug !== article.slug).slice(0, 3)

  return (
    <div className="theme-light flex min-h-screen flex-col bg-slate-50 text-ink">
      <SiteHeader
        nav={
          <>
            <Link to={PATHS.landing} className="transition-colors hover:text-ink">
              {t('blog.navHome')}
            </Link>
            <Link to={PATHS.blog} className="font-medium text-ink underline decoration-machine decoration-[3px] underline-offset-[6px]">
              {t('blog.nav')}
            </Link>
          </>
        }
      />

      <main className="flex-1">
        <article>
          <header className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 lg:pt-14">
            <Link
              to={PATHS.blog}
              className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-slate-600 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt"
            >
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" /> {t('blog.back')}
            </Link>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE_OUT }} className="mt-8 max-w-4xl">
              <h1 className="text-[34px] leading-[1.08] font-bold tracking-[-0.025em] text-balance text-[#0f172a] sm:text-5xl">{article.title}</h1>
              <p className="mt-5 max-w-[60ch] text-lg leading-8 text-slate-700">{article.excerpt}</p>
              <ArticleMeta article={article} className="mt-5" />
            </motion.div>
          </header>

          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
            className="mx-auto mt-10 max-w-6xl px-4 sm:px-6"
          >
            <div className="overflow-hidden rounded-2xl bg-slate-200">
              <img src={imageUrl} alt={article.imageAlt} decoding="async" className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]" />
            </div>
            {credit && <figcaption className="mt-2 text-xs text-slate-500">{credit}</figcaption>}
          </motion.figure>

          <div className="mx-auto max-w-[68ch] px-4 pt-6 pb-20 sm:px-0">
            {article.body.map((block, index) => (
              <Block key={index} block={block} />
            ))}
          </div>
        </article>

        <section className="bg-machine text-asphalt">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <h2 className="max-w-xl text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">{t('blog.ctaTitle')}</h2>
            <motion.span whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }} className="inline-flex">
              <Link
                to={article.cta.to}
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-asphalt px-6 text-base font-semibold whitespace-nowrap text-white transition-colors hover:bg-asphalt-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-asphalt"
              >
                {article.cta.label} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </motion.span>
          </div>
        </section>

        <section aria-labelledby="more-guides" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 id="more-guides" className="text-3xl font-bold tracking-tight text-[#0f172a]">
            {t('blog.more')}
          </h2>
          <ul className="mt-8 grid gap-8 lg:grid-cols-3">
            {others.map((other) => (
              <li key={other.slug}>
                <ArticleRow article={other} compact />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <SiteFooter />
      <ScrollToTopButton />
    </div>
  )
}
