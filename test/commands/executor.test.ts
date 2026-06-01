import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTestDb, closeTestDb } from "../utils/test-db";
import { Database } from "bun:sqlite";
import { CommandExecutor } from "../../src/commands/executor";

describe("CommandExecutor", () => {
  let sqlite: Database;

  beforeEach(() => {
    const testDb = createTestDb();
    sqlite = testDb.sqlite;
  });

  afterEach(() => {
    closeTestDb(sqlite);
  });

  describe("timeout handling", () => {
    it("should timeout long-running command", async () => {
      const executor = new CommandExecutor(100);
      
      const source = `
        export async function handle(ctx) {
          await new Promise(r => setTimeout(r, 1000));
          await ctx.send("should not reach");
        }
      `;

      const ctx = {
        send: async () => {},
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test",
        args: [],
        message: "test",
        contactId: 1,
      };

      const result = await executor.executeCommand(source, "test", ctx);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("timed out");
    });

    it("should clear timeout after successful execution", async () => {
      const executor = new CommandExecutor(100);
      
      const source = `
        export async function handle(ctx) {
          await ctx.send("done");
        }
      `;

      let sendCalled = false;
      const ctx = {
        send: async () => { sendCalled = true; },
        react: async () => {},
        schedule: async () => {},
        fetch: async () => new Response(),
        userId: "test",
        args: [],
        message: "test",
        contactId: 1,
      };

      const result = await executor.executeCommand(source, "test", ctx);
      
      expect(result.success).toBe(true);
      expect(sendCalled).toBe(true);
    });
  });
});
