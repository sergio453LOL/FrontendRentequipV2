import type { AppNotification, PageResponse } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** The bell: the company's notifications and the inbox actions. */
export const notificationService = {
  async unreadCount(): Promise<number> {
    const { data } = await api.get<{ unread: number }>(ENDPOINTS.notificationsUnread)
    return data.unread
  },

  async list(size: number): Promise<PageResponse<AppNotification>> {
    const { data } = await api.get<PageResponse<AppNotification>>(ENDPOINTS.notifications, { params: { page: 0, size } })
    return data
  },

  async markRead(id: number): Promise<void> {
    await api.patch(ENDPOINTS.notificationRead(id))
  },

  async markAllRead(): Promise<void> {
    await api.post(ENDPOINTS.notificationsReadAll)
  },

  async deleteAll(): Promise<void> {
    await api.delete(ENDPOINTS.notifications)
  },
}
