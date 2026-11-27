export const PATHS = {
  landing: '/',
  home: '/panel',
  login: '/login',
  register: '/register',
  catalog: '/catalog',
  fleet: '/fleet',
  publishEquipment: '/equipment/new',
  equipmentDetail: '/equipment/:id',
  reservations: '/reservations',
  categories: '/categories',
  profile: '/profile',
  purchases: '/purchases',
  offers: '/offers',
  blog: '/blog',
  blogArticle: '/blog/:slug',
  admin: '/admin',
  adminCompanies: '/admin/empresas',
  adminMovements: '/admin/movimientos',
  adminCatalog: '/admin/catalogo',
  adminMarketing: '/admin/marketing',
  adminAi: '/admin/ia-analytics',
  adminFinance: '/admin/finanzas',
} as const

export const buildPath = {
  equipmentDetail: (id: number) => `/equipment/${id}`,
  blogArticle: (slug: string) => `/blog/${slug}`,
}
