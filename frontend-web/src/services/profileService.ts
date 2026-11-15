import type {
  Company,
  CompanyUpdateRequest,
  PasswordChangeRequest,
  ProfileUpdateRequest,
  TwoFactorChallenge,
  TwoFactorChannel,
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

  async disableTwoFactor(password: string): Promise<User> {
    const { data } = await api.post<User>(ENDPOINTS.twoFactorDisable, { password })
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
