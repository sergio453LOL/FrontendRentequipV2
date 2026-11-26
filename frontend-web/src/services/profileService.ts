import type {
  Company,
  CompanyUpdateRequest,
  PasswordChangeRequest,
  ProfileUpdateRequest,
  TwoFactorChallenge,
  TwoFactorChannel,
  TwoFactorDisableRequest,
  TwoFactorVerifyRequest,
  UploadedImage,
  User,
  WithLinks,
} from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

const UPLOAD_TIMEOUT_MS = 60_000

/** The signed-in user's own account and, for administrators, their company. */
export const profileService = {
  async updateMe(request: ProfileUpdateRequest): Promise<User> {
    const { data } = await api.patch<User>(ENDPOINTS.me, request)
    return data
  },

  async changePassword(request: PasswordChangeRequest): Promise<void> {
    await api.post(ENDPOINTS.myPassword, request)
  },

  /** Sends a code to the chosen channel; the protection turns on only when that code comes back. */
  async startTwoFactor(channel: TwoFactorChannel): Promise<TwoFactorChallenge> {
    const { data } = await api.post<TwoFactorChallenge>(ENDPOINTS.twoFactorSetup, { channel })
    return data
  },

  async confirmTwoFactor(request: TwoFactorVerifyRequest): Promise<User> {
    const { data } = await api.post<User>(ENDPOINTS.twoFactorConfirm, request)
    return data
  },

  async disableTwoFactor(request: TwoFactorDisableRequest): Promise<User> {
    const { data } = await api.post<User>(ENDPOINTS.twoFactorDisable, request)
    return data
  },

  /** Accounts without a password (created with Google): a code to their email confirms a security change. */
  async sendAccountCode(): Promise<TwoFactorChallenge> {
    const { data } = await api.post<TwoFactorChallenge>(ENDPOINTS.accountCode)
    return data
  },

  async updateCompany(id: number, request: CompanyUpdateRequest): Promise<WithLinks<Company>> {
    const { data } = await api.patch<WithLinks<Company>>(ENDPOINTS.company(id), request)
    return data
  },

  /** Profile photo or company logo; resolves with its public URL. */
  async uploadImage(file: File): Promise<string> {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<UploadedImage>(ENDPOINTS.profileImageUploads, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    })
    return data.url
  },
}
