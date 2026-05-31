import { build } from "esbuild";
import type { CommandContext } from "../types";

interface ExecutionResult {
	success: boolean;
	result?: unknown;
	error?: string;
}

/**
 * 7.1-7.6 Command executor
 * Transpiles TypeScript command source via esbuild, then evaluates
 * and calls the handler matching the requested slug.
 *
 * Note: vm2 sandboxing is NOT available — vm2 3.x is incompatible with Bun.
 * Commands run in the host context. Add worker/isolate sandboxing later.
 */
export class CommandExecutor {
	private defaultTimeoutMs: number;
	private esbuildInitialized = false;

	constructor(timeoutMs: number = 5000) {
		this.defaultTimeoutMs = timeoutMs;
	}

	/**
	 * 7.2 Create execution context injected into sandbox
	 */
	createExecutionContext(
		send: (text: string) => Promise<void>,
		react: (emoji: string) => Promise<void>,
		schedule: (
			duration: string,
			callback: () => Promise<void>,
		) => Promise<void>,
		userId: string,
		args: string[],
		message: string,
		contactId: number,
	): CommandContext {
		return {
			send: async (text: string) => {
				await send(text);
			},
			react: async (emoji: string) => {
				await react(emoji);
			},
			schedule: async (duration: string, callback: () => Promise<void>) => {
				await schedule(duration, callback);
			},
			fetch: async (url: string, options?: RequestInit) => {
				return fetch(url, options);
			},
			userId,
			args,
			message,
			contactId,
		};
	}

	/**
	 * Transpile command source to CJS and find the matching command handle.
	 */
	async executeCommand(
		source: string,
		slug: string,
		ctx: CommandContext,
		timeoutMs?: number,
	): Promise<ExecutionResult> {
		const effectiveTimeout = timeoutMs || this.defaultTimeoutMs;

		try {
			// Transpile TypeScript → CJS JavaScript
			const result = await build({
				stdin: {
					contents: source,
					loader: "ts",
					sourcefile: "command.ts",
				},
				write: false,
				bundle: false,
				format: "cjs",
				platform: "neutral",
			});

			const js = result.outputFiles[0].text;

			// Evaluate the CJS module
			const mod = { exports: {} };
			const fn = new Function(
				"require",
				"module",
				"exports",
				"console",
				"ctx",
				js,
			);

			// Stub require — type-only imports are stripped by esbuild,
			// but runtime imports (e.g. @akka/sdk) get an empty stub
			const stubRequire = (id: string) => {
				console.warn(`[Executor] Stub require('${id}') — no-op`);
				return {};
			};

			// Run with timeout guard
			await Promise.race([
				(async () => {
					fn(stubRequire, mod, mod.exports, console, ctx);
				})(),
				this.timeoutPromise(effectiveTimeout),
			]);

			// Find the command definition matching the slug
			const handler = this.resolveHandler(mod.exports, slug);
			if (!handler) {
				return {
					success: false,
					error: `Command must export a handle(ctx) function ${slug}`,
				};
			}

			// Call the handler
			await Promise.race([
				handler(ctx),
				this.timeoutPromise(effectiveTimeout),
			]);

			return { success: true };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			console.error("[Executor] Command execution failed:", message);
			return { success: false, error: message };
		}
	}

	/**
	 * Walk module exports to find the command definition matching slug.
	 *
	 * Resolution order:
	 *   1. `demoCommands[slug]` or `commands[slug]` hash
	 *   2. Direct `handle` export
	 *   3. `{slug}Command` named export (convention: echo → echoCommand)
	 *   4. First export with a `handle` function
	 */
	private resolveHandler(
		exports: Record<string, unknown>,
		slug: string,
	): ((ctx: CommandContext) => Promise<void>) | null {
		if (!exports || typeof exports !== "object") return null;

		// 1. Hash map: demoCommands or commands
		const cmdMap =
			(exports as any).demoCommands || (exports as any).commands;
		if (cmdMap && typeof cmdMap === "object") {
			const entry = cmdMap[slug];
			if (entry && typeof (entry as any).handle === "function") {
				return (entry as any).handle.bind(entry);
			}
		}

		// Try all exports — any could be the hash map
		for (const key of Object.keys(exports)) {
			const val = (exports as any)[key];
			if (val && typeof val === "object" && typeof val.handle === "function") {
				// Check if this is a hash map containing our slug
				if (val[slug] && typeof val[slug].handle === "function") {
					return val[slug].handle.bind(val[slug]);
				}
			}
		}

		// 2. Direct handle on exports or module.exports
		if (typeof (exports as any).handle === "function") {
			return (exports as any).handle.bind(exports);
		}

		// 3. {slug}Command convention
		const camelKey = `${slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Command`;
		const camelEntry = (exports as any)[camelKey];
		if (camelEntry && typeof camelEntry.handle === "function") {
			return camelEntry.handle.bind(camelEntry);
		}

		// Also try key matching slug
		const directEntry = (exports as any)[slug];
		if (directEntry && typeof directEntry.handle === "function") {
			return directEntry.handle.bind(directEntry);
		}

		// 4. First export with a handle function
		for (const key of Object.keys(exports)) {
			const val = (exports as any)[key];
			if (val && typeof val.handle === "function") {
				return val.handle.bind(val);
			}
		}

		return null;
	}

	/**
	 * 7.3 Timeout promise
	 */
	private timeoutPromise(ms: number): Promise<never> {
		return new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`Command execution timed out after ${ms}ms`)),
				ms,
			),
		);
	}
}

// Singleton
export const commandExecutor = new CommandExecutor(5000);
