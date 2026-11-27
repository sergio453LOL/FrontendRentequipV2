import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { FullPageSpinner } from '../components/common/Spinner'
import { AppLayout } from '../components/layout/AppLayout'
import { PATHS } from './paths'
import { GuestRoute, PlatformAdminRoute, PrivateRoute } from './PrivateRoute'
import { ADMIN_ROLES, PUBLISHER_ROLES } from './roles'

const LandingPage = lazy(() => import('../pages/LandingPage'))
const BlogPage = lazy(() => import('../pages/BlogPage'))
const BlogArticlePage = lazy(() => import('../pages/BlogArticlePage'))
const OffersPage = lazy(() => import('../pages/OffersPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const CatalogPage = lazy(() => import('../pages/CatalogPage'))
const FleetPage = lazy(() => import('../pages/FleetPage'))
const EquipmentDetailPage = lazy(() => import('../pages/EquipmentDetailPage'))
const MyReservationsPage = lazy(() => import('../pages/MyReservationsPage'))
const PublishEquipmentPage = lazy(() => import('../pages/PublishEquipmentPage'))
const CategoriesPage = lazy(() => import('../pages/CategoriesPage'))
const PurchasesPage = lazy(() => import('../pages/PurchasesPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))
// The platform panel's shell and screens load only for its operators.
const AdminLayout = lazy(() => import('../components/admin/AdminLayout').then((module) => ({ default: module.AdminLayout })))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminCompaniesPage = lazy(() => import('../pages/admin/AdminCompaniesPage'))
const AdminMovementsPage = lazy(() => import('../pages/admin/AdminMovementsPage'))
const AdminCatalogPage = lazy(() => import('../pages/admin/AdminCatalogPage'))
const AdminMarketingPage = lazy(() => import('../pages/admin/AdminMarketingPage'))
const AdminAiPage = lazy(() => import('../pages/admin/AdminAiPage'))
const AdminFinancePage = lazy(() => import('../pages/admin/AdminFinancePage'))

export function AppRoutes() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path={PATHS.landing} element={<LandingPage />} />
        <Route path={PATHS.blog} element={<BlogPage />} />
        <Route path={PATHS.blogArticle} element={<BlogArticlePage />} />
        <Route element={<GuestRoute />}>
          <Route path={PATHS.login} element={<LoginPage />} />
          <Route path={PATHS.register} element={<RegisterPage />} />
        </Route>

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path={PATHS.home} element={<DashboardPage />} />
            <Route path={PATHS.catalog} element={<CatalogPage />} />
            <Route path={PATHS.fleet} element={<FleetPage />} />
            <Route path={PATHS.equipmentDetail} element={<EquipmentDetailPage />} />
            <Route path={PATHS.reservations} element={<MyReservationsPage />} />
            <Route path={PATHS.profile} element={<ProfilePage />} />
            <Route path={PATHS.purchases} element={<PurchasesPage />} />
            <Route path={PATHS.offers} element={<OffersPage />} />
            <Route element={<PrivateRoute allowedRoles={PUBLISHER_ROLES} />}>
              <Route path={PATHS.publishEquipment} element={<PublishEquipmentPage />} />
            </Route>
            <Route element={<PrivateRoute allowedRoles={ADMIN_ROLES} />}>
              <Route path={PATHS.categories} element={<CategoriesPage />} />
            </Route>
          </Route>
          {/* Platform panel: its own shell, only for the marketplace's operators. */}
          <Route element={<PlatformAdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path={PATHS.admin} element={<AdminDashboardPage />} />
              <Route path={PATHS.adminCompanies} element={<AdminCompaniesPage />} />
              <Route path={PATHS.adminMovements} element={<AdminMovementsPage />} />
              <Route path={PATHS.adminCatalog} element={<AdminCatalogPage />} />
              <Route path={PATHS.adminMarketing} element={<AdminMarketingPage />} />
              <Route path={PATHS.adminAi} element={<AdminAiPage />} />
              <Route path={PATHS.adminFinance} element={<AdminFinancePage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
