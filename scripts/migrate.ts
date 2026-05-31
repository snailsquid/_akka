import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

mkdirSync("./data", { recursive: true });

const sqlite = new Database("./data/akka.db");
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

// Check if the migration tracking table exists
const hasMigrationTable = !!sqlite
	.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
	)
	.get();

if (hasMigrationTable) {
	console.log("[migrate] Migrations already applied, skipping.");
	process.exit(0);
}

// Check if data tables already exist (DB copied from previous deploy)
const hasDataTables = !!sqlite
	.prepare(
		"SELECT name FROM sqlite_master WHERE type='table' AND name='contacts'",
	)
	.get();

if (hasDataTables) {
	console.log(
		"[migrate] Data tables exist. Creating migration tracking table...",
	);
	// Create the tracking table, then mark all migrations as applied
	sqlite.exec(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      hash TEXT PRIMARY KEY NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

	// Read migration files and mark them as applied
	const migrationsDir = "./drizzle";
	const files = readdirSync(migrationsDir)
		.filter((f: string) => f.endsWith(".sql"))
		.sort();

	const stmt = sqlite.prepare(
		"INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, datetime('now'))",
	);
	for (const file of files) {
		const hash = file.replace(/\.sql$/, "");
		stmt.run(hash);
		console.log(`  ✓ ${file}`);
	}
	console.log(`[migrate] ${files.length} migration(s) recorded as applied.`);
} else {
	console.log("[migrate] Running fresh database migrations...");
	// Run SQL files directly
	const migrationsDir = "./drizzle";
	const files = readdirSync(migrationsDir)
		.filter((f: string) => f.endsWith(".sql"))
		.sort();

	sqlite.exec("BEGIN TRANSACTION");
	try {
		for (const file of files) {
			const sql = readFileSync(join(migrationsDir, file), "utf-8");
			sqlite.exec(sql);
			console.log(`  ✓ ${file}`);
		}
		sqlite.exec(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        hash TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
		const stmt = sqlite.prepare(
			"INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, datetime('now'))",
		);
		for (const file of files) {
			const hash = file.replace(/\.sql$/, "");
			stmt.run(hash);
		}
		sqlite.exec("COMMIT");
	} catch (err) {
		sqlite.exec("ROLLBACK");
		throw err;
	}
	console.log(`[migrate] ${files.length} migration(s) applied.`);
}
