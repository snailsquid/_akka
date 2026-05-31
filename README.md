# Akka

<p align="center">
  <img src="https://img.shields.io/badge/runtime-Bun-%23F9F9F9?logo=bun" alt="Bun">
  <img src="https://img.shields.io/badge/server-Hono-%23E36002?logo=hono" alt="Hono">
  <img src="https://img.shields.io/badge/database-SQLite_%2B_Drizzle-%2341B883" alt="Drizzle">
  <img src="https://img.shields.io/badge/whatsapp-WAHA-%2325D366?logo=whatsapp" alt="WAHA">
</p>

<p align="center">
  <strong>WhatsApp automation with a community command marketplace.</strong><br>
  Install commands via WhatsApp chat. Build and publish your own with the SDK.
</p>

<p align="center">
  <a href="#-for-users">For Users</a> •
  <a href="#-for-developers">For Developers</a> •
  <a href="#-documentation">SDK Docs</a> •
  <a href="#-self-hosting">Self-Hosting</a>
</p>

---

## 🧑‍💻 For Users

Akka turns a WhatsApp number into an extensible automation platform. You interact with it by sending messages — commands start with a dot (`.`).

### Quick Start

1. Someone sets up an Akka instance and shares the WhatsApp number with you.
2. Send `.help` to see your installed commands.
3. Send `.marketplace` to browse the command marketplace.
4. Pick a command by number to install it.
5. Run it by typing its name: `.weather tokyo`, `.remind 10m check email`.

### Example Commands

| Command | What it does |
|---|---|
| `.help` | List all installed commands with usage |
| `.marketplace` | Browse, search, and install community commands |
| `.uninstall <name>` | Remove a command you no longer need |
| `.rename <old> <new>` | Give a command a custom name |

> Commands come from the marketplace — every developer publishes their own.  
> New commands appear as developers register them. Install only what you need.

### Example Marketplace Flow

```
You:    .marketplace
Akka:   🛒 Marketplace (Page 1/2)
        1. *@john/weather* — Get weather for any city
           _john/akka-commands_
        2. *@jane/remind* — Set reminders with natural durations
           _jane/akka-commands_
        3. *@dev/translate* — Translate text between languages
           _dev/akka-commands_

        Reply a number to install • "n" for next page

You:    1
Akka:   ✅ *@john/weather* installed! Usage: .weather <city>

You:    .weather tokyo
Akka:   🌤️ Weather in Tokyo: 22°C, partly cloudy
```

---

## 🛠️ For Developers

Akka has a simple, open SDK for building WhatsApp commands. Developers publish commands via GitHub repositories — the community marketplace makes them available to all users.

### Use Cases

- **Reminders & Scheduling** — `.remind 30m call mom`, `.remind tomorrow 9am standup`
- **External API integrations** — `.weather tokyo`, `.btc price`, `.define serendipity`
- **Productivity** — `.todo add buy milk`, `.notes show`, `.translate hello ja`
- **Custom business logic** — `.order status 12345`, `.track package ABC`
- **Interactive flows** — `.quiz start`, `.poll create "best framework?"`
- **Anything you can code in TypeScript** — built-in HTTP, scheduling, reactions

### How Publishing Works

1. You create a GitHub repository with an `akka.yaml` manifest and your command code.
2. In the Akka Developer Dashboard, link your repo.
3. Akka fetches the manifest, validates all commands, and publishes them to the marketplace.
4. Users discover and install your commands via `.marketplace`.

**Manifest format** (`akka.yaml`):

```yaml
version: "1"
commands:
  - slug: weather
    name: Weather
    description: Get current weather for any city
    usage: ".weather <city>"
    entryPoint: weather.ts

  - slug: remind
    name: Remind Me
    description: Set a delayed reminder
    usage: ".remind <duration> <message>"
    entryPoint: reminder.ts
```

### Developer Portal

Access the Developer Dashboard at `/developer` on your running Akka instance:

- **Auth**: Generate a registration token, then send `.login <token>` via WhatsApp to authenticate.
- **Repos**: Link GitHub repositories — Akka reads `akka.yaml` and registers all commands.
- **Refresh**: Sync changes when you update your repository.
- **Analytics**: See how many users have installed your commands.

---

## 📖 Documentation

### SDK Reference — `@akka/sdk`

The SDK lives at [`src/commands/sdk/`](src/commands/sdk/). It's a lightweight TypeScript package for building Akka commands.

#### Installation

```bash
npm install @akka/sdk
# or
bun add @akka/sdk
```

#### `command(definition)`

The main entry point. Wraps a command definition with validation.

```typescript
import { command } from "@akka/sdk";

export default command({
  name: "Echo",
  description: "Echoes back whatever you send",
  usage: ".echo [text]",
  async handle(ctx) {
    await ctx.send(ctx.args.join(" ") || "Hello from Akka!");
  },
});
```

#### `CommandContext`

Injected into your `handle(ctx)` function at runtime.

| Property / Method | Type | Description |
|---|---|---|
| `send(text)` | `(text: string) => Promise<void>` | Send a WhatsApp message back to the user |
| `react(emoji)` | `(emoji: string) => Promise<void>` | React to the user's message with an emoji |
| `schedule(duration, callback)` | `(duration: string, callback: () => Promise<void>) => Promise<void>` | Schedule a callback for later execution |
| `fetch(url, options?)` | `(url: string, options?: RequestInit) => Promise<Response>` | Make HTTP requests to external APIs |
| `userId` | `string` | Anonymized user ID (not the phone number) |
| `args` | `string[]` | Parsed arguments from the user's message |
| `message` | `string` | The full message text |
| `contactId` | `number` | The contact (Akka phone number) that received the command |

#### Duration Format

The `schedule()` method accepts human-readable duration strings:

| Input | Meaning |
|---|---|
| `"30s"` | 30 seconds |
| `"10m"` | 10 minutes |
| `"2h"` | 2 hours |
| `"1d"` | 1 day |
| `"90m"` | 90 minutes |

### Examples

#### Basic HTTP Command

```typescript
import { command } from "@akka/sdk";

export default command({
  name: "BTC Price",
  description: "Get the current Bitcoin price",
  usage: ".btc",
  async handle(ctx) {
    const res = await ctx.fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
    const data = await res.json();
    const price = data.bitcoin.usd;
    await ctx.send(`₿ Bitcoin: $${price.toLocaleString()}`);
  },
});
```

#### Reminder with Scheduling

```typescript
import { command } from "@akka/sdk";

export default command({
  name: "Remind Me",
  description: "Set a delayed reminder",
  usage: ".remind <duration> <message>",
  async handle(ctx) {
    const [duration, ...msgParts] = ctx.args;
    if (!duration || msgParts.length === 0) {
      await ctx.send("Usage: .remind 10m check the oven");
      return;
    }
    const message = msgParts.join(" ");

    await ctx.schedule(duration, async () => {
      await ctx.send(`⏰ Reminder: ${message}`);
    });

    await ctx.send(`✅ I'll remind you in ${duration}`);
  },
});
```

#### Interactive Command

```typescript
import { command } from "@akka/sdk";

export default command({
  name: "Hello",
  description: "Greets the user",
  usage: ".hello",
  async handle(ctx) {
    await ctx.react("👋");
    await ctx.send(`Hello! You said: "${ctx.message}"`);
  },
});
```

### Command Resolution Rules

When Akka executes a command, it resolves the handler in this order:

1. **Hash map**: `demoCommands[slug]` or `commands[slug]`
2. **Direct export**: a `handle` function on the default export
3. **Convention**: `{slug}Command` named export (e.g., `echoCommand`)
4. **Named object**: any export with a `handle` method matching the slug
5. **First handle**: the first export found with a `handle` method

### System Commands (built-in)

These are always available to every user — no installation needed:

| Command | Description |
|---|---|
| `.help` | List all installed commands with descriptions and usage |
| `.marketplace` | Browse available commands from all developers |
| `.uninstall <slug>` | Remove an installed command |
| `.rename <old> <new>` | Rename an installed command |
| `.login <token>` | Authenticate as a developer (get token from dashboard) |

---

## 🚀 Self-Hosting

### Prerequisites

- [Bun](https://bun.sh/) v1.3.14+
- [Docker](https://docker.com/) (for WAHA)
- A WhatsApp account (for the WAHA gateway)

### Architecture

```
┌──────────┐     WhatsApp API      ┌──────────┐     Webhook      ┌──────────┐
│   User   │ ◄──────────────────► │   WAHA   │ ────────────────► │   Akka   │
│ (Phone)  │                       │ (Docker) │                   │ (Bun)    │
└──────────┘                       └──────────┘                   └──────────┘
                                                                   │     │
                                                           ┌───────┘     └───────┐
                                                           ▼                     ▼
                                                     ┌──────────┐       ┌──────────────┐
                                                     │  Admin   │       │  Developer   │
                                                     │Dashboard │       │  Dashboard   │
                                                     └──────────┘       └──────────────┘
```

### Quick Start

```bash
# 1. Clone and install
git clone <your-repo>
cd akka
bun install

# 2. Start WAHA (WhatsApp gateway)
docker compose up -d waha

# 3. (Optional) Open WAHA dashboard to scan QR code
# Visit http://localhost:3001/dashboard
# Session: "default"

# 4. Configure environment
cp .env.example .env
# Edit .env if needed (defaults work for local setup)

# 5. Set up database
bun run db:generate
bun run db:migrate

# 6. Start Akka
bun run dev
```

> **Initial Setup**: You'll need to scan the WAHA QR code to connect your WhatsApp account.  
> Open `http://localhost:3001/dashboard` and scan the code with WhatsApp on your phone.

### Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Akka server port |
| `WAHA_BASE_URL` | `http://localhost:3001` | WAHA HTTP API URL |
| `WAHA_API_KEY` | `waha-api-key-2024` | WAHA API key |
| `WAHA_WEBHOOK_URL` | `http://localhost:3001/api/sessions/{session}/webhook` | Webhook URL template |

### Admin Dashboard

> Port 3000 → [`/admin`](http://localhost:3000/admin)

Manage WhatsApp sessions, add contacts, and monitor system health.

### Developer Dashboard

> Port 3000 → [`/developer`](http://localhost:3000/developer)

Link GitHub repos, register commands, manage your published commands.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/webhook` | WAHA webhook receiver |
| `GET` | `/api/commands` | List all marketplace commands |
| `GET` | `/api/commands/search?q=` | Search commands |
| `GET` | `/api/commands/:id` | Get command by full ID (`username/slug`) |
| `POST` | `/api/commands/register` | Register a command from a GitHub repo |
| `GET`  | `/developer/sessions` | [Auth] Check developer session |
| `POST` | `/developer/repos` | [Auth] Register a GitHub repository |
| `GET`  | `/developer/repos` | [Auth] List linked repositories |
| `POST` | `/developer/repos/:url/refresh` | [Auth] Refresh repository commands |
| `DELETE` | `/developer/repos/:url` | [Auth] Remove a repository |
| `GET`  | `/developer/commands/:id/analytics` | [Auth] Command usage stats |
| `GET`  | `/admin/sessions` | [Auth] List all sessions with health status |
| `GET`  | `/admin/contacts` | [Auth] List contacts |
| `POST` | `/admin/contacts` | [Auth] Add a contact (WhatsApp number) |

---

## 🏗️ Project Structure

```
akka/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hono server setup, route mounting, static serving
│   ├── types.ts              # Core TypeScript types
│   ├── db/
│   │   ├── index.ts          # Database client
│   │   └── schema.ts         # Drizzle schema (contacts, users, commands, etc.)
│   ├── gateway/
│   │   ├── waha-client.ts    # WAHA HTTP API client
│   │   ├── session-manager.ts # Session health monitoring
│   │   └── webhook.ts        # Incoming webhook handler
│   ├── commands/
│   │   ├── routes.ts         # Command API routes
│   │   ├── marketplace.ts    # Marketplace flow handler
│   │   ├── registry.ts       # GitHub repo registry + manifest parsing
│   │   ├── executor.ts       # TypeScript sandbox execution
│   │   ├── system.ts         # Built-in system commands (.help, .marketplace, etc.)
│   │   └── sdk/              # @akka/sdk package
│   │       ├── index.ts      # SDK types + command() helper
│   │       ├── package.json  # npm package manifest
│   │       └── README.md     # SDK docs
│   ├── router/
│   │   ├── index.ts          # Message router (command parsing, flow management)
│   │   └── user-service.ts   # User + installation management
│   ├── scheduler/
│   │   ├── index.ts          # SQLite-backed task scheduler
│   │   └── parser.ts         # Duration string parser
│   ├── admin/
│   │   ├── routes.ts         # Admin API routes
│   │   └── static/           # Built admin dashboard assets
│   └── developer/
│       ├── routes.ts         # Developer API routes
│       └── static/           # Built developer dashboard assets
├── admin-ui/                 # Admin dashboard (React + Vite)
├── developer-ui/             # Developer dashboard (React + Vite)
├── drizzle/                  # Database migrations
├── e2e/                      # Playwright end-to-end tests
└── docker-compose.yml        # WAHA service
```

---

## 🧪 Running Tests

```bash
# Unit tests
bun test

# E2E tests (requires running server)
bunx playwright test
```

---

## 📄 License

MIT
