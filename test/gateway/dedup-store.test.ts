import { describe, it, expect, beforeEach } from "bun:test";
import { DedupStore } from "../../src/gateway/dedup-store";

describe("DedupStore", () => {
  let store: DedupStore;

  beforeEach(() => {
    store = new DedupStore(60_000);
  });

  it("has returns false for never-seen key", () => {
    expect(store.has("s1", "m1")).toBe(false);
  });

  it("has/mark round-trip — mark then has is true", () => {
    store.mark("s1", "m1");
    expect(store.has("s1", "m1")).toBe(true);
  });

  it("entries are scoped per sessionId", () => {
    store.mark("s1", "m1");
    expect(store.has("s2", "m1")).toBe(false);
  });

  it("entry expires after TTL elapses", () => {
    const short = new DedupStore(10);
    short.mark("s1", "m1");
    expect(short.has("s1", "m1")).toBe(true);
    const future = Date.now() + 20;
    expect(short.has("s1", "m1", future)).toBe(false);
  });

  it("sweep removes expired entries", () => {
    const short = new DedupStore(10);
    short.mark("s1", "m1");
    short.mark("s1", "m2");
    short.mark("s2", "m3");
    const removed = short.sweep(Date.now() + 100);
    expect(removed).toBe(3);
    expect(short.size()).toBe(0);
  });

  it("re-marking a non-expired entry refreshes the TTL", () => {
    // mark() uses Date.now() internally, so we measure the effective TTL by
    // reading has() at successive now values.
    const ttl = 50;
    const short = new DedupStore(ttl);
    const before = Date.now();
    short.mark("s1", "m1");
    // The entry should be live from `before` to `before + ttl`
    expect(short.has("s1", "m1", before + ttl - 1)).toBe(true);
    // After the TTL elapses
    expect(short.has("s1", "m1", before + ttl + 1)).toBe(false);
    // Re-marking resets the window
    const reBefore = Date.now();
    short.mark("s1", "m1");
    expect(short.has("s1", "m1", reBefore + ttl - 1)).toBe(true);
    expect(short.has("s1", "m1", reBefore + ttl + 1)).toBe(false);
  });

  it("size reflects the total number of entries", () => {
    expect(store.size()).toBe(0);
    store.mark("s1", "m1");
    store.mark("s1", "m2");
    store.mark("s2", "m3");
    expect(store.size()).toBe(3);
  });

  it("clear empties the store", () => {
    store.mark("s1", "m1");
    store.mark("s2", "m2");
    store.clear();
    expect(store.size()).toBe(0);
    expect(store.has("s1", "m1")).toBe(false);
  });

  it("startSweep is idempotent", () => {
    const s = new DedupStore(60_000);
    s.startSweep(60_000);
    s.startSweep(60_000); // should not throw
    s.stopSweep();
  });
});
