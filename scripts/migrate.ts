import { Database } from "bun:sqlite";
import { createHash } from "crypto";
import { mkdirSync, readFileSync, readdirSync } from "fs";
import { join } from "path";

mkdirSync("./data", { recursive: true });

const sqlite = new Database("./data/akka.db");
sqlite.exec("PRAGMA journal_mode = WAL");
sqlite.exec("PRAGMA foreign_keys = ON");

const migrationsDir = "./drizzle";
const files = readdirSync(migrationsDir)
	.filter((f: string) => f.endsWith(".sql"))
	.sort();

if (files.length === 0) {
	console.log("[migrate] No migration files found in ./drizzle");
	process.exit(0);
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    hash TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL
  )
`);

// drizzle-kit stores SHA-256(content) as the hash; older versions of this
// script stored the filename. We accept both forms when deciding what's
// already applied.
const appliedRows = sqlite
	.prepare("SELECT hash FROM __drizzle_migrations")
	.all() as { hash: string }[];
const appliedSet = new Set(appliedRows.map((r) => r.hash));

const tagOf = (file: string) => file.replace(/\.sql$/, "");
const shaOf = (file: string) =>
	createHash("sha256")
		.update(readFileSync(join(migrationsDir, file)))
		.digest("hex");

const isApplied = (file: string) => {
	const tag = tagOf(file);
	const sha = shaOf(file);
	return appliedSet.has(tag) || appliedSet.has(sha);
};

const pending = files.filter((f) => !isApplied(f));

if (pending.length === 0) {
	console.log(`[migrate] All ${files.length} migration(s) already applied.`);
	process.exit(0);
}

console.log(`[migrate] ${pending.length} pending migration(s):`);

const insertStmt = sqlite.prepare(
	"INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, datetime('now'))",
);

// Errors that mean "this migration was already applied" (effect is present):
// - "table X already exists"
// - "duplicate column name X"
// - "index X already exists"
const isAlreadyAppliedError = (msg: string) =>
	/already exists/i.test(msg) || /duplicate column name/i.test(msg);

let appliedCount = 0;
for (const file of pending) {
	const sql = readFileSync(join(migrationsDir, file), "utf-8");
	const tag = tagOf(file);

	try {
		sqlite.exec(sql);
		insertStmt.run(tag);
		console.log(`  ✓ ${file}`);
		appliedCount++;
	} catch (err: any) {
		if (isAlreadyAppliedError(err?.message ?? "")) {
			insertStmt.run(tag);
			console.log(`  ↻ ${file} (already applied, marked)`);
			appliedCount++;
		} else {
			throw new Error(
				`Migration ${file} failed: ${err?.message ?? err}`,
			);
		}
	}
}

console.log(`[migrate] ${appliedCount} migration(s) applied.`);
