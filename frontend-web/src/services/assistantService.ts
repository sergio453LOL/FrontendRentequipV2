import type { AssistantChatRequest, AssistantChatResponse, ChatTurn } from '../types'
import { api } from './api'
import { ENDPOINTS } from './endpoints'

/** The backend only passes the last 6 turns to the model; sending more just makes the request bigger. */
const MAX_HISTORY_TURNS = 6
/** The language model can take a while on the first question; give it more room than a normal request. */
const ASSISTANT_TIMEOUT_MS = 60_000
/** Internal ids the model sometimes echoes from its catalogue ("JCB 3CX (id 3)", "id: 3"): never shown. */
const INTERNAL_IDS = /\s*[([]\s*id\s*[:#]?\s*\d+\s*[)\]]|,?\s*\bid\s*[:#]\s*\d+/gi

/** The reply as the user should read it, without internal ids. */
export function cleanReply(text: string): string {
  return text.replace(INTERNAL_IDS, '').replace(/\s+([.,;:])/g, '$1')
}

export const assistantService = {
  async chat(history: ChatTurn[]): Promise<AssistantChatResponse> {
    const body: AssistantChatRequest = { messages: history.slice(-MAX_HISTORY_TURNS) }
    const { data } = await api.post<AssistantChatResponse>(ENDPOINTS.assistantChat, body, {
      timeout: ASSISTANT_TIMEOUT_MS,
    })
    return { ...data, reply: cleanReply(data.reply) }
  },
}
