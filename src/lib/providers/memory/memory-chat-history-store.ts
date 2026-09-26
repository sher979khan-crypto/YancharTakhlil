import { chatConfig } from "@/config/chat";

import { ChatMessageSchema, type ChatHistoryStore, type ChatMessage } from "../chat-history-store";

type MemoryChatHistoryStoreOptions = {
  maxMessagesPerSession?: number;
};

export function createMemoryChatHistoryStore({
  maxMessagesPerSession = chatConfig.maxMessagesPerSession,
}: MemoryChatHistoryStoreOptions = {}): ChatHistoryStore {
  if (!Number.isInteger(maxMessagesPerSession) || maxMessagesPerSession < 1) {
    throw new RangeError(
      `maxMessagesPerSession must be a positive integer, got ${maxMessagesPerSession}`,
    );
  }
  const sessions = new Map<string, ChatMessage[]>();

  return {
    async load(sessionId) {
      return (sessions.get(sessionId) ?? []).map((message) => ({ ...message }));
    },
    async append(sessionId, message) {
      // Parsing also copies, so later changes to the caller's object do not leak into the store.
      const stored = ChatMessageSchema.parse(message);
      const messages = sessions.get(sessionId) ?? [];
      messages.push(stored);
      if (messages.length > maxMessagesPerSession) {
        messages.splice(0, messages.length - maxMessagesPerSession);
      }
      sessions.set(sessionId, messages);
    },
    async clear(sessionId) {
      sessions.delete(sessionId);
    },
  };
}
