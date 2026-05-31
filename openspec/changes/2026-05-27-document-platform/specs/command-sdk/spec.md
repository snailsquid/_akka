## ADDED Requirements

### Requirement: Command helper function
The system SHALL provide a `command()` helper for validating and creating command definitions.

#### Scenario: Valid command definition
- **GIVEN** an object with `name`, `description`, `usage`, and `handle` (async function)
- **WHEN** `command({ name, description, usage, handle })` is called
- **THEN** the system SHALL return the object unchanged

#### Scenario: Missing name
- **GIVEN** an object without `name`
- **WHEN** `command()` is called
- **THEN** the system SHALL throw an error: "Command must have a 'name' string"

#### Scenario: Missing description
- **GIVEN** an object without `description`
- **WHEN** `command()` is called
- **THEN** the system SHALL throw an error: "Command must have a 'description' string"

#### Scenario: Missing usage
- **GIVEN** an object without `usage`
- **WHEN** `command()` is called
- **THEN** the system SHALL throw an error: "Command must have a 'usage' string"

#### Scenario: Missing handle function
- **GIVEN** an object without `handle` or with `handle` as non-function
- **WHEN** `command()` is called
- **THEN** the system SHALL throw an error: "Command must have a 'handle' async function"

### Requirement: CommandContext interface
The system SHALL define a `CommandContext` interface with all platform APIs.

#### Scenario: Context has send method
- **GIVEN** a CommandContext is created
- **THEN** `ctx.send` SHALL be a `Promise<void>` function

#### Scenario: Context has react method
- **GIVEN** a CommandContext is created
- **THEN** `ctx.react` SHALL be a `Promise<void>` function

#### Scenario: Context has schedule method
- **GIVEN** a CommandContext is created
- **THEN** `ctx.schedule` SHALL be a `Promise<void>` function

#### Scenario: Context has fetch method
- **GIVEN** a CommandContext is created
- **THEN** `ctx.fetch` SHALL be a `Promise<Response>` function

#### Scenario: Context has readonly properties
- **GIVEN** a CommandContext is created
- **THEN** `ctx.userId` SHALL be a readonly string
- **THEN** `ctx.args` SHALL be a readonly string array
- **THEN** `ctx.message` SHALL be a readonly string
- **THEN** `ctx.contactId` SHALL be a readonly number

### Requirement: CommandDefinition interface
The system SHALL define a `CommandDefinition` interface with required fields.

#### Scenario: Definition has name
- **GIVEN** a CommandDefinition
- **THEN** `name` SHALL be a non-empty string

#### Scenario: Definition has description
- **GIVEN** a CommandDefinition
- **THEN** `description` SHALL be a non-empty string

#### Scenario: Definition has usage
- **GIVEN** a CommandDefinition
- **THEN** `usage` SHALL be a non-empty string

#### Scenario: Definition has handle
- **GIVEN** a CommandDefinition
- **THEN** `handle` SHALL be an async function accepting a CommandContext

### Requirement: SDK package structure
The system SHALL package the SDK as a distributable npm package.

#### Scenario: SDK package metadata
- **GIVEN** the SDK package at `src/commands/sdk/package.json`
- **THEN** it SHALL have a package name (`@akka/sdk`)
- **THEN** it SHALL export types and the `command()` helper

#### Scenario: SDK README
- **GIVEN** the SDK package at `src/commands/sdk/README.md`
- **THEN** it SHALL include a quick start example showing the command definition pattern
