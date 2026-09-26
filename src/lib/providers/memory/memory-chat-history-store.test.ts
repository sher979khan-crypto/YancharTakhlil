import { describe, expect, it } from "vitest";

import { chatConfig } from "@/config/chat";

import type { ChatMessage } from "../chat-history-store";

import { createMemoryChatHistoryStore } from "./memory-chat-history-store";

const message = (n: number, role: ChatMessage["role"] = "user"): ChatMessage => ({
  id: `m${n}`,
  role,
  content: `message ${n}`,
  createdAt: "2026-09-26T12:00:00Z",
});

describe("createMemoryChatHistoryStore", () => {
  it("loads an empty history for an unknown session", async () => {
    await expect(createMemoryChatHistoryStore().load("nobody")).resolves.toEqual([]);
  });

  it("appends in order", async () => {
    const store = createMemoryChatHistoryStore();
    await store.append("s1", message(1));
    await store.append("s1", message(2, "assistant"));
    expect(await store.load("s1")).toEqual([message(1), message(2, "assistant")]);
  });

  it("keeps sessions isolated", async () => {
    const store = createMemoryChatHistoryStore();
    await store.append("s1", message(1));
    await store.append("s2", message(2));
    expect((await store.load("s1")).map((m) => m.id)).toEqual(["m1"]);
    expect((await store.load("s2")).map((m) => m.id)).toEqual(["m2"]);
  });

  it("drops the oldest messages beyond the cap", async () => {
    const store = createMemoryChatHistoryStore({ maxMessagesPerSession: 3 });
    for (let n = 1; n <= 5; n++) await store.append("s1", message(n));
    expect((await store.load("s1")).map((m) => m.id)).toEqual(["m3", "m4", "m5"]);
  });

  it("caps at the configured default of 50", async () => {
    expect(chatConfig.maxMessagesPerSession).toBe(50);
    const store = createMemoryChatHistoryStore();
    for (let n = 1; n <= 55; n++) await store.append("s1", message(n));
    const history = await store.load("s1");
    expect(history).toHaveLength(50);
    expect(history[0]?.id).toBe("m6");
  });

  it("clears one session only", async () => {
    const store = createMemoryChatHistoryStore();
    await store.append("s1", message(1));
    await store.append("s2", message(2));
    await store.clear("s1");
    expect(await store.load("s1")).toEqual([]);
    expect(await store.load("s2")).toHaveLength(1);
  });

  it("does not share objects with callers", async () => {
    const store = createMemoryChatHistoryStore();
    const original = message(1);
    await store.append("s1", original);
    original.content = "changed after append";
    const [loaded] = await store.load("s1");
    if (loaded) loaded.content = "changed after load";
    expect((await store.load("s1"))[0]?.content).toBe("message 1");
  });

  it("rejects invalid messages and caps", async () => {
    const store = createMemoryChatHistoryStore();
    await expect(
      store.append("s1", { ...message(1), role: "system" } as unknown as ChatMessage),
    ).rejects.toThrow();
    expect(() => createMemoryChatHistoryStore({ maxMessagesPerSession: 0 })).toThrow(RangeError);
  });
});
