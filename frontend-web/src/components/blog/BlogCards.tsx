import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { blogImageUrl, type BlogArticle } from '../../content/blog'
import { buildPath } from '../../routes/paths'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/format'

/** "18 nov. 2026 · 6 min de lectura". */
export function ArticleMeta({ article, className }: { article: BlogArticle; className?: string }) {
  const { t } = useTranslation()
  return (
    <p className={cn('num text-sm text-slate-500', className)}>
      <time dateTime={article.date}>{formatDate(article.date)}</time> · {t('blog.readTime', { minutes: article.readMinutes })}
    </p>
  )
}

/** The article that leads a list: the large photo, the title at the second size, the excerpt in full. */
export function LeadArticle({ article, headingLevel = 'h3' }: { article: BlogArticle; headingLevel?: 'h2' | 'h3' }) {
  const { t } = useTranslation()
  const Heading = headingLevel
  return (
    <article className="group relative">
      <div className="overflow-hidden rounded-2xl bg-slate-200">
        <img
          src={blogImageUrl(article.image)}
          alt={article.imageAlt}
          loading="lazy"
          decoding="async"
          className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <ArticleMeta article={article} className="mt-5" />
      <Heading className="mt-2 text-2xl leading-tight font-bold tracking-tight text-balance text-[#0f172a] sm:text-[28px]">
        <Link
          to={buildPath.blogArticle(article.slug)}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-asphalt"
        >
          {article.title}
        </Link>
      </Heading>
      <p className="mt-3 max-w-[60ch] text-base leading-7 text-slate-700">{article.excerpt}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-machine decoration-2 underline-offset-4">
        {t('blog.read')} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </article>
  )
}

/** A shorter entry: a small photo beside the title, for the articles after the lead one. */
export function ArticleRow({
  article,
  headingLevel = 'h3',
  compact = false,
}: {
  article: BlogArticle
  headingLevel?: 'h2' | 'h3'
  /** Small photo at every width, for narrow columns. */
  compact?: boolean
}) {
  const Heading = headingLevel
  return (
    <article className={cn('group relative grid grid-cols-[112px_1fr] items-start gap-4', !compact && 'sm:grid-cols-[176px_1fr] sm:gap-5')}>
      <div className="overflow-hidden rounded-xl bg-slate-200">
        <img
          src={blogImageUrl(article.image)}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="min-w-0">
        <ArticleMeta article={article} />
        <Heading className="mt-1.5 text-lg leading-snug font-bold text-balance text-[#0f172a]">
          <Link
            to={buildPath.blogArticle(article.slug)}
            className="rounded-sm decoration-machine decoration-2 underline-offset-4 group-hover:underline after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-asphalt"
          >
            {article.title}
          </Link>
        </Heading>
        {!compact && <p className="mt-1.5 hidden text-sm leading-6 text-slate-700 sm:line-clamp-2">{article.excerpt}</p>}
      </div>
    </article>
  )
}
