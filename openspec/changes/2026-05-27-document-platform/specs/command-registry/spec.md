## ADDED Requirements

### Requirement: GitHub repo fetcher
The system SHALL fetch command source code from GitHub repositories.

#### Scenario: Fetch command source
- **GIVEN** a valid GitHub URL (e.g., `https://github.com/owner/repo`)
- **WHEN** `fetchCommandRepo(repoUrl, entryPoint)` is called
- **THEN** the system SHALL fetch the file from the GitHub API
- **THEN** the system SHALL decode base64-encoded content
- **THEN** the system SHALL return the source code as a string

#### Scenario: Invalid GitHub URL
- **GIVEN** an invalid GitHub URL
- **WHEN** `fetchCommandRepo()` is called
- **THEN** the system SHALL throw an error with "Invalid GitHub URL" message

#### Scenario: Entry point not found
- **GIVEN** a valid repo but the entry point file does not exist
- **WHEN** `fetchCommandRepo()` is called
- **THEN** the system SHALL throw an error with "Entry point not found" message

### Requirement: Manifest fetch and parse
The system SHALL fetch and parse `akka.yaml` manifests from repository roots.

#### Scenario: Fetch manifest
- **GIVEN** a valid GitHub repository with `akka.yaml` at root
- **WHEN** `fetchManifest(repoUrl)` is called
- **THEN** the system SHALL fetch the manifest file from GitHub
- **THEN** the system SHALL parse the YAML content
- **THEN** the system SHALL return an `AkkaManifest` object with version and commands array

#### Scenario: Manifest not found
- **GIVEN** a valid GitHub repository without `akka.yaml`
- **WHEN** `fetchManifest()` is called
- **THEN** the system SHALL throw an error with "Manifest file 'akka.yaml' not found" message

#### Scenario: Parse manifest format
- **GIVEN** a manifest with commands defined in YAML format
- **WHEN** `parseManifest(yamlContent)` is called
- **THEN** the system SHALL extract version, slug, name, description, usage, and entryPoint for each command

### Requirement: Command export validator
The system SHALL validate that command source code exports required fields.

#### Scenario: Valid command export
- **GIVEN** source code that exports `name`, `description`, `usage`, and `handle`
- **WHEN** `validateCommandExport(source)` is called
- **THEN** the system SHALL return `{ name, description, usage }` with extracted values

#### Scenario: Missing name export
- **GIVEN** source code without a `name` export
- **WHEN** `validateCommandExport(source)` is called
- **THEN** the system SHALL throw an error listing "Missing 'name' export"

#### Scenario: Missing handle function
- **GIVEN** source code without a `handle` function
- **WHEN** `validateCommandExport(source)` is called
- **THEN** the system SHALL throw an error listing "Missing 'handle' function"

### Requirement: Local code caching
The system SHALL cache fetched command source code with a per-developer/slug key.

#### Scenario: Cache set
- **GIVEN** a command source has been fetched
- **WHEN** `setCached("devId/slug", source)` is called
- **THEN** the system SHALL store the source in an in-memory Map with timestamp

#### Scenario: Cache get hit
- **GIVEN** a command source is cached
- **WHEN** `getCached("devId/slug")` is called
- **THEN** the system SHALL return the cached source

#### Scenario: Cache get miss
- **GIVEN** a command source is not cached
- **WHEN** `getCached("devId/slug")` is called
- **THEN** the system SHALL return `null`

#### Scenario: Cache refresh
- **GIVEN** a cached command exists
- **WHEN** `refresh(developerId, slug, repoUrl, entryPoint)` is called
- **THEN** the system SHALL fetch fresh source from GitHub
- **THEN** the system SHALL overwrite the cached entry

### Requirement: Slug uniqueness check per developer
The system SHALL enforce that slugs are unique within a developer's command set.

#### Scenario: Unique slug accepted
- **GIVEN** a developer has no command with slug "weather"
- **WHEN** `registerCommand(devId, "weather", ...)` is called
- **THEN** the system SHALL accept the registration

#### Scenario: Duplicate slug rejected
- **GIVEN** a developer already has a command with slug "weather"
- **WHEN** `registerCommand(devId, "weather", ...)` is called
- **THEN** the system SHALL throw an error: "Command with slug 'weather' already exists for this developer"

### Requirement: Repository-based registration
The system SHALL support registering multiple commands from a single GitHub repository manifest.

#### Scenario: Register repository
- **GIVEN** a valid GitHub repo with `akka.yaml` containing 3 commands
- **WHEN** `registerRepository(devId, repoUrl)` is called
- **THEN** the system SHALL fetch and parse the manifest
- **THEN** the system SHALL validate all commands (all-or-nothing)
- **THEN** the system SHALL insert all 3 commands into the database
- **THEN** the system SHALL return all inserted command records

#### Scenario: Duplicate slug within manifest rejected
- **GIVEN** a manifest with two commands having the same slug
- **WHEN** `registerRepository()` is called
- **THEN** the system SHALL throw an error: "Duplicate slug '...' in manifest"

#### Scenario: All-or-nothing validation
- **GIVEN** a manifest with 3 commands where one has invalid source
- **WHEN** `registerRepository()` is called
- **THEN** the system SHALL reject ALL commands if any single command fails validation

#### Scenario: Repository refresh
- **GIVEN** a registered repository with 2 commands
- **WHEN** `refreshRepository(devId, repoUrl)` is called and the manifest now has 3 commands
- **THEN** the system SHALL detect 1 new command and add it
- **THEN** the system SHALL detect 1 changed command and update it
- **THEN** the system SHALL detect 0 removed commands
- **THEN** the system SHALL return `{ added: 1, updated: 0, disabled: 0 }`

#### Scenario: Repository refresh detects removed commands
- **GIVEN** a registered repository with 3 commands
- **WHEN** `refreshRepository()` is called and the manifest now has 2 commands
- **THEN** the system SHALL detect 1 removed command and disable it (status: "disabled")
- **THEN** the system SHALL return `{ added: 0, updated: 0, disabled: 1 }`

#### Scenario: Delete repository
- **GIVEN** a registered repository with 3 commands
- **WHEN** `deleteRepository(devId, repoUrl)` is called
- **THEN** the system SHALL delete all 3 command records
- **THEN** the system SHALL return the count of deleted commands (3)

### Requirement: Developer-username/slug ID model
The system SHALL identify commands using the format `developer-username/slug`.

#### Scenario: Build full ID
- **WHEN** `buildFullId("alice", "weather")` is called
- **THEN** the system SHALL return `"alice/weather"`

#### Scenario: Parse full ID
- **WHEN** `parseFullId("alice/weather")` is called
- **THEN** the system SHALL return `["alice", "weather"]`

#### Scenario: Get command by full ID
- **GIVEN** a command registered as `alice/weather`
- **WHEN** `getCommandByFullId("alice/weather")` is called
- **THEN** the system SHALL return the command record with the matching developer username and slug

### Requirement: Marketplace listing
The system SHALL provide a list of all active commands for the marketplace.

#### Scenario: Get all active commands
- **GIVEN** 5 active commands and 2 disabled commands in the database
- **WHEN** `getAllActiveCommands()` is called
- **THEN** the system SHALL return only the 5 active commands
- **THEN** each command SHALL include `developerUsername` and `repositoryName`

#### Scenario: Search commands
- **GIVEN** commands with names, slugs, and repo URLs
- **WHEN** `searchCommands("weather")` is called
- **THEN** the system SHALL match against name, slug, and repo URL
- **THEN** the system SHALL return all matching commands

### Requirement: Periodic cache refresh
The system SHALL periodically refresh cached command sources.

#### Scenario: Start refresh loop
- **GIVEN** no refresh timer is active
- **WHEN** `startRefreshLoop()` is called
- **THEN** the system SHALL start an interval timer (every 3600000ms = 1 hour)
- **THEN** the system SHALL refresh all active commands

#### Scenario: Stop refresh loop
- **GIVEN** a refresh loop is running
- **WHEN** `stopRefreshLoop()` is called
- **THEN** the system SHALL clear the interval timer

#### Scenario: Refresh all active commands
- **WHEN** the refresh loop fires
- **THEN** the system SHALL fetch all active commands from the database
- **THEN** the system SHALL refresh each command's source from GitHub
- **THEN** the system SHALL log errors for any failed refreshes without stopping
