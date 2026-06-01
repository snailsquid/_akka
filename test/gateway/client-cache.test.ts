import { describe, it, expect, beforeEach } from "bun:test";
import { clientCache } from "../../src/gateway/client-cache";
import { MockWahaClient } from "../utils/mocks";

describe("clientCache", () => {
  beforeEach(() => {
    clientCache.clear();
  });

  it("setClient/getClient round-trips", () => {
    const client = new MockWahaClient();
    clientCache.setClient("session-a", client);
    expect(clientCache.getClient("session-a")).toBe(client);
  });

  it("getClient returns undefined for unknown session", () => {
    expect(clientCache.getClient("nope")).toBeUndefined();
  });

  it("removeClient evicts the entry", () => {
    const client = new MockWahaClient();
    clientCache.setClient("session-b", client);
    const removed = clientCache.removeClient("session-b");
    expect(removed).toBe(true);
    expect(clientCache.getClient("session-b")).toBeUndefined();
  });

  it("removeClient returns false for missing session", () => {
    expect(clientCache.removeClient("never-set")).toBe(false);
  });

  it("clear empties the cache", () => {
    clientCache.setClient("a", new MockWahaClient());
    clientCache.setClient("b", new MockWahaClient());
    expect(clientCache.size()).toBe(2);
    clientCache.clear();
    expect(clientCache.size()).toBe(0);
  });

  it("concurrent getClient for the same key returns the same instance", () => {
    const client = new MockWahaClient();
    clientCache.setClient("shared", client);
    const results = Array.from({ length: 50 }, () =>
      clientCache.getClient("shared"),
    );
    for (const r of results) {
      expect(r).toBe(client);
    }
  });

  it("setClient overwrites a previous entry for the same key", () => {
    const a = new MockWahaClient();
    const b = new MockWahaClient();
    clientCache.setClient("dup", a);
    clientCache.setClient("dup", b);
    expect(clientCache.getClient("dup")).toBe(b);
  });
});
