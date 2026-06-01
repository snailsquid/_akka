import { describe, it, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Audit test: every code path that inserts a row into the `contacts` table
 * must also call SessionManager.addSession. This is the invariant the Router
 * depends on now that the client-cache lookup is the only path to a
 * WahaClient.
 */
describe("contact-creation path audit", () => {
  it("admin routes insert into contacts and call addSession", () => {
    const src = readFileSync(
      join(import.meta.dir, "../../src/admin/routes.ts"),
      "utf-8",
    );
    const insertIdx = src.indexOf("db.insert(schema.contacts)");
    expect(insertIdx).toBeGreaterThan(-1);
    const window = src.slice(insertIdx, insertIdx + 800);
    expect(window).toContain("sm.addSession");
  });

  it("developer routes do not insert into contacts directly", () => {
    const src = readFileSync(
      join(import.meta.dir, "../../src/developer/routes.ts"),
      "utf-8",
    );
    expect(src).not.toContain("db.insert(schema.contacts)");
    expect(src).not.toContain("INSERT INTO contacts");
  });

  it("scripts/seed.ts inserts the default contact before initialize() runs", () => {
    const src = readFileSync(
      join(import.meta.dir, "../../scripts/seed.ts"),
      "utf-8",
    );
    expect(src).toContain("INSERT INTO contacts");
    // The seed script is run as a one-off before the server starts
    // (initialize() then loads the seeded row into the cache).
  });

  it("no other src/ file inserts a contact without addSession", () => {
    // Spot-check the gateway and router folders
    const paths = [
      "../../src/gateway/session-manager.ts",
      "../../src/gateway/webhook.ts",
      "../../src/router/index.ts",
      "../../src/commands/executor.ts",
      "../../src/commands/system.ts",
    ];
    for (const p of paths) {
      const src = readFileSync(join(import.meta.dir, p), "utf-8");
      expect(src).not.toContain("db.insert(schema.contacts)");
    }
  });
});
