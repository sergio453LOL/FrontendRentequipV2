import { MOCK_COMPANIES } from '../data/adminMockData'
import type { AdminCompany, Company, CompanyRepresentative, KybDocument, PageResponse, User } from '../types'
import { fetchCatalogPages } from './adminCatalogService'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

const PAGE_SIZE = 100
const MAX_PAGES = 10

export interface AdminCompanyDirectory {
  companies: AdminCompany[]
  /** Companies the backend reported; 0 when it could not be read. */
  apiCount: number
  apiFailed: boolean
}

async function fetchAllCompanies(): Promise<Company[]> {
  const companies: Company[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data } = await api.get<PageResponse<Company>>(ENDPOINTS.companies, { params: { page, size: PAGE_SIZE } })
    companies.push(...data.content)
    if (data.last) break
  }
  return companies
}

/** The backend keeps the SUNAT answer but no documents yet: the RUC record is the only one it can vouch for. */
function documentsOf(company: Company): KybDocument[] {
  return [
    { kind: 'RUC_RECORD', status: company.verified ? 'APPROVED' : company.taxStatus ? 'PENDING' : 'MISSING', uploadedAt: company.taxStatus ? (company.verifiedAt ?? company.createdAt).slice(0, 10) : null },
    { kind: 'POWER_OF_ATTORNEY', status: 'MISSING', uploadedAt: null },
    { kind: 'REPRESENTATIVE_ID', status: 'MISSING', uploadedAt: null },
    { kind: 'SCTR_POLICY', status: 'MISSING', uploadedAt: null },
  ]
}

function toAdminCompany(company: Company, equipmentCount: number): AdminCompany {
  return {
    key: `api-${company.id}`,
    backendId: company.id,
    source: 'api',
    name: company.name,
    ruc: company.taxId,
    city: company.city,
    side: equipmentCount > 0 ? 'OWNER' : 'RENTER',
    // The backend lists only active companies, so a real row is either verified or waiting for review.
    status: company.verified ? 'VERIFIED' : 'IN_REVIEW',
    taxStatus: company.taxStatus,
    representative: null,
    createdAt: company.createdAt.slice(0, 10),
    documents: documentsOf(company),
    history: [],
    rating: null,
    reviewCount: 0,
    equipmentCount,
  }
}

/**
 * Companies of the marketplace for the KYB screen: every active company in the backend, then the
 * demonstration directory. The badge is granted and withdrawn through the backend; asking for a correction
 * and suspending have no endpoint yet, so the screen applies them locally.
 */
export const adminCompanyService = {
  async list(): Promise<AdminCompanyDirectory> {
    const demo = MOCK_COMPANIES.map((company) => ({ ...company }))
    try {
      const [companies, fleet] = await Promise.all([fetchAllCompanies(), fetchCatalogPages().catch(() => [])])
      const units = new Map<number, number>()
      for (const item of fleet) units.set(item.ownerCompanyId, (units.get(item.ownerCompanyId) ?? 0) + 1)
      const real = companies.map((company) => toAdminCompany(company, units.get(company.id) ?? 0))
      return { companies: [...real, ...demo], apiCount: real.length, apiFailed: false }
    } catch {
      return { companies: demo, apiCount: 0, apiFailed: true }
    }
  },

  /** The company's first ADMIN, who signed it up. */
  async representative(companyId: number): Promise<CompanyRepresentative | null> {
    const { data } = await api.get<PageResponse<User>>(ENDPOINTS.companyUsers(companyId), { params: { role: 'ADMIN', size: 1 } })
    const user = data.content[0]
    return user ? { name: `${user.firstName} ${user.lastName}`, email: user.email, phone: user.phone } : null
  },

  /** Grants the verified badge; the backend asks SUNAT again first and refuses a bad standing. */
  async approve(companyId: number): Promise<Company> {
    const { data } = await api.post<Company>(ENDPOINTS.companyBadge(companyId))
    return data
  },

  async revoke(companyId: number): Promise<Company> {
    const { data } = await api.delete<Company>(ENDPOINTS.companyBadge(companyId))
    return data
  },
}
