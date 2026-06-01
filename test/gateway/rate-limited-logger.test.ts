import { describe, it, expect, beforeEach } from "bun:test";
import {
  rateLimitedLog,
  _resetRateLimitedLogForTests,
} from "../../src/gateway/rate-limited-logger";

describe("rateLimitedLog", () => {
  beforeEach(() => {
    _resetRateLimitedLogForTests();
  });

  it("emits the first time a key is seen", () => {
    const lines: string[] = [];
    const emitted = rateLimitedLog("k1", "hello", 10_000, (l) => lines.push(l));
    expect(emitted).toBe(true);
    expect(lines).toEqual(["hello"]);
  });

  it("suppresses subsequent emits within the window", () => {
    const lines: string[] = [];
    const emit = (l: string) => lines.push(l);
    expect(rateLimitedLog("k1", "first", 10_000, emit)).toBe(true);
    expect(rateLimitedLog("k1", "second", 10_000, emit)).toBe(false);
    expect(rateLimitedLog("k1", "third", 10_000, emit)).toBe(false);
    expect(lines).toEqual(["first"]);
  });

  it("keys are independent", () => {
    const lines: string[] = [];
    const emit = (l: string) => lines.push(l);
    expect(rateLimitedLog("k1", "a", 10_000, emit)).toBe(true);
    expect(rateLimitedLog("k2", "b", 10_000, emit)).toBe(true);
    expect(lines).toEqual(["a", "b"]);
  });

  it("emits again after the window elapses", async () => {
    const lines: string[] = [];
    const emit = (l: string) => lines.push(l);
    const window = 20;
    expect(rateLimitedLog("k1", "first", window, emit)).toBe(true);
    // Wait past the window
    await new Promise((r) => setTimeout(r, window + 10));
    expect(rateLimitedLog("k1", "second", window, emit)).toBe(true);
    expect(lines).toEqual(["first", "second"]);
  });

  it("uses console.log by default", () => {
    // We don't assert on console output here, just that the call returns true.
    expect(rateLimitedLog("default-key", "line")).toBe(true);
  });
});
