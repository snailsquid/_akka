## ADDED Requirements

### Requirement: Sandboxed VM creation
The system SHALL create an isolated VM for command execution with restricted globals.

#### Scenario: VM blocks dangerous globals
- **GIVEN** a VM is created via `createVM(source, ctx)`
- **WHEN** the sandboxed code attempts to access `process`
- **THEN** `process` SHALL be `undefined`
- **WHEN** the sandboxed code attempts to access `require`
- **THEN** `require` SHALL be `undefined`
- **WHEN** the sandboxed code attempts to access `global`
- **THEN** `global` SHALL be `undefined`
- **WHEN** the sandboxed code attempts to access `__dirname`
- **THEN** `__dirname` SHALL be `undefined`
- **WHEN** the sandboxed code attempts to access `__filename`
- **THEN** `__filename` SHALL be `undefined`

#### Scenario: VM blocks eval
- **GIVEN** a VM is created with `eval: false`
- **WHEN** the sandboxed code attempts `eval()`
- **THEN** the system SHALL throw an error

#### Scenario: VM blocks wasm
- **GIVEN** a VM is created with `wasm: false`
- **WHEN** the sandboxed code attempts to use WebAssembly
- **THEN** the system SHALL throw an error

### Requirement: Context injection
The system SHALL inject a controlled context object into the sandbox.

#### Scenario: Context provides send
- **GIVEN** a CommandContext is created
- **WHEN** the command calls `ctx.send("hello")`
- **THEN** the system SHALL forward the text to the WhatsApp user via Waha

#### Scenario: Context provides react
- **GIVEN** a CommandContext is created
- **WHEN** the command calls `ctx.react("👍")`
- **THEN** the system SHALL add the reaction to the user's message

#### Scenario: Context provides schedule
- **GIVEN** a CommandContext is created
- **WHEN** the command calls `ctx.schedule("10m", callback)`
- **THEN** the system SHALL queue the callback for delayed execution (stub — not yet wired to scheduler)

#### Scenario: Context provides fetch
- **GIVEN** a CommandContext is created
- **WHEN** the command calls `ctx.fetch("https://api.example.com/data")`
- **THEN** the system SHALL forward the request via Bun's native `fetch()` (outside sandbox)
- **THEN** the system SHALL return the Response object to the command

#### Scenario: Context provides userId
- **GIVEN** a CommandContext is created
- **WHEN** the command accesses `ctx.userId`
- **THEN** the system SHALL return the anonymized user ID (not the phone number)

#### Scenario: Context provides args
- **GIVEN** a CommandContext is created with args `["Tokyo", "weather"]`
- **WHEN** the command accesses `ctx.args`
- **THEN** the system SHALL return the array `["Tokyo", "weather"]`

#### Scenario: Context is frozen
- **GIVEN** a CommandContext is created
- **WHEN** the command attempts to modify `ctx.send`
- **THEN** the system SHALL throw (Object.freeze prevents modification)

### Requirement: Execution with timeout
The system SHALL enforce a maximum execution time for commands.

#### Scenario: Command completes within timeout
- **GIVEN** a command that executes in 2 seconds
- **WHEN** `executeCommand(source, ctx)` is called with default 5000ms timeout
- **THEN** the system SHALL return `{ success: true, result: ... }`

#### Scenario: Command exceeds timeout
- **GIVEN** a command that hangs indefinitely
- **WHEN** `executeCommand(source, ctx)` is called with default 5000ms timeout
- **THEN** the system SHALL reject after 5000ms
- **THEN** the system SHALL return `{ success: false, error: "Command execution timed out after 5000ms" }`

#### Scenario: Custom timeout
- **GIVEN** a command that needs a different timeout
- **WHEN** `executeCommand(source, ctx, 10000)` is called with 10000ms
- **THEN** the system SHALL enforce the 10000ms timeout

### Requirement: Error catching and logging
The system SHALL catch and log command execution errors.

#### Scenario: Command throws error
- **GIVEN** a command that throws an error during execution
- **WHEN** `executeCommand()` is called
- **THEN** the system SHALL catch the error
- **THEN** the system SHALL log "[Executor] Command execution failed: ..." to the console
- **THEN** the system SHALL return `{ success: false, error: "<error message>" }`

#### Scenario: Non-error thrown value
- **GIVEN** a command returns a non-Error value
- **WHEN** `executeCommand()` is called
- **THEN** the system SHALL convert the value to a string
- **THEN** the system SHALL return `{ success: false, error: "<stringified value>" }`

### Requirement: Sandbox isolation verification
The system SHALL provide a verification method to test sandbox isolation.

#### Scenario: Verify sandbox isolation
- **GIVEN** the `verifySandboxIsolation()` method is called
- **WHEN** it tests for `process`, `require`, `global`, `__dirname`, `__filename`
- **THEN** the system SHALL return `{ passed: true, issues: [] }` if all are blocked
- **THEN** the system SHALL return `{ passed: false, issues: [...] }` listing any that leaked
