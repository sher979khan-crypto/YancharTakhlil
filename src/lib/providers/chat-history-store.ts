import * as z from "zod";

export const ChatMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  createdAt: z.iso.datetime({ offset: true }),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

/** Chat history per session. Async so a backend can replace the in-memory version unchanged. */
export interface ChatHistoryStore {
  /** Oldest first; empty for an unknown session. */
  load(sessionId: string): Promise<ChatMessage[]>;
  append(sessionId: string, message: ChatMessage): Promise<void>;
  clear(sessionId: string): Promise<void>;
}
