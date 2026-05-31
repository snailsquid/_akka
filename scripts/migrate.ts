import { Database } from "bun:sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mkdirSync } from "fs";

mkdirSync("./data", { recursive: true });

const sqlite = new Database("./data/akka.db");
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

const db = drizzle(sqlite);

console.log("[migrate] Running database migrations...");
migrate(db, { migrationsFolder: "./drizzle" });
console.log("[migrate] Migrations complete.");
