import type { ChatTurn } from '../types'
import { api } from './api'
import { cleanReply } from './assistantService'
import { ENDPOINTS } from './endpoints'

/** The backend hands the model the last 8 turns; sending more only makes the request bigger. */
const MAX_HISTORY_TURNS = 8
/** Reading the figures and asking the model can take a while; more room than a normal request. */
const COPILOT_TIMEOUT_MS = 60_000

export type CopilotSource = 'gemini' | 'claude' | 'summary'

export interface AdminCopilotAnswer {
  reply: string
  source: CopilotSource
  /** When the figures behind the answer were read (ISO instant). */
  asOf: string
}

/** Platform panel copilot: questions about the platform, answered from live figures (platform admins only). */
export const adminAssistantService = {
  async chat(history: ChatTurn[]): Promise<AdminCopilotAnswer> {
    const { data } = await api.post<AdminCopilotAnswer>(
      ENDPOINTS.adminAssistantChat,
      { messages: history.slice(-MAX_HISTORY_TURNS) },
      { timeout: COPILOT_TIMEOUT_MS },
    )
    return { ...data, reply: cleanReply(data.reply) }
  },
}
