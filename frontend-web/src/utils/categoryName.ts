import { currentLanguage, type Language } from '../i18n'

/** The catalogue's categories, which the backend stores (and owners create) in Spanish, in other languages. */
const TRANSLATED: Record<Exclude<Language, 'es'>, Record<string, string>> = {
  en: {
    Andamios: 'Scaffolding',
    Compactación: 'Compaction',
    Concreto: 'Concrete',
    Demolición: 'Demolition',
    Elevación: 'Lifting',
    Excavadoras: 'Excavators',
    Generadores: 'Generators',
    Herramientas: 'Tools',
    'Herramientas eléctricas': 'Power tools',
    Minicargadores: 'Skid steers',
    Retroexcavadoras: 'Backhoes',
  },
  zh: {
    Andamios: '脚手架',
    Compactación: '压实设备',
    Concreto: '混凝土设备',
    Demolición: '拆除设备',
    Elevación: '起重设备',
    Excavadoras: '挖掘机',
    Generadores: '发电机',
    Herramientas: '工具',
    'Herramientas eléctricas': '电动工具',
    Minicargadores: '滑移装载机',
    Retroexcavadoras: '挖掘装载机',
  },
}

/** A category name in the active language; categories without a translation keep their own name. */
export function categoryName(name: string): string {
  const language = currentLanguage()
  return language === 'es' ? name : (TRANSLATED[language][name] ?? name)
}
