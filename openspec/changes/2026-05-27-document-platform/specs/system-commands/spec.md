## ADDED Requirements

### Requirement: .help command
The system SHALL list installed commands on the user's contact.

#### Scenario: Help with installed commands
- **GIVEN** a user has 3 commands installed
- **WHEN** the user sends `.help`
- **THEN** the system SHALL show a numbered list of installed commands
- **THEN** each command SHALL show: `*.{userSlug}* — {description}` and `_{usage}_`
- **THEN** the system SHALL show the count of installed commands

#### Scenario: Help with no installed commands
- **GIVEN** a user has no commands installed
- **WHEN** the user sends `.help`
- **THEN** the system SHALL show "You have no commands installed."
- **THEN** the system SHALL suggest sending `.marketplace` to browse

### Requirement: .marketplace command
The system SHALL open the marketplace flow for browsing and installing commands.

#### Scenario: Marketplace with flow starter
- **GIVEN** the marketplace flow starter is wired
- **WHEN** the user sends `.marketplace`
- **THEN** the system SHALL start the marketplace conversation flow
- **THEN** the system SHALL show the first page of commands

#### Scenario: Marketplace without flow starter
- **GIVEN** the marketplace flow starter is not yet wired
- **WHEN** the user sends `.marketplace`
- **THEN** the system SHALL show a placeholder message: "Marketplace\n\nBrowse and install commands from developers.\n\n_Coming soon!_"

### Requirement: .uninstall command
The system SHALL remove an installed command.

#### Scenario: Uninstall existing command
- **GIVEN** a user has `.weather` installed
- **WHEN** the user sends `.uninstall weather`
- **THEN** the system SHALL remove the installation
- **THEN** the system SHALL confirm: "✅ *.weather* has been uninstalled."

#### Scenario: Uninstall non-existent command
- **GIVEN** a user does NOT have `.weather` installed
- **WHEN** the user sends `.uninstall weather`
- **THEN** the system SHALL respond: "Command *.weather* is not installed."

#### Scenario: Uninstall without slug
- **WHEN** the user sends `.uninstall` without a slug
- **THEN** the system SHALL show usage: "Usage: .uninstall <command-name>\nExample: .uninstall remind"

### Requirement: .rename command
The system SHALL rename an installed command's user slug.

#### Scenario: Rename existing command
- **GIVEN** a user has `.remind` installed
- **WHEN** the user sends `.rename remind my-reminder`
- **THEN** the system SHALL update the user_slug from "remind" to "my-reminder"
- **THEN** the system SHALL confirm: "✅ Renamed *.remind* to *.my-reminder*"

#### Scenario: Rename non-existent command
- **GIVEN** a user does NOT have `.nonexistent` installed
- **WHEN** the user sends `.rename nonexistent newname`
- **THEN** the system SHALL respond: "Command *.nonexistent* is not installed."

#### Scenario: Rename to existing slug
- **GIVEN** a user has `.weather` and `.remind` installed
- **WHEN** the user sends `.rename remind weather`
- **THEN** the system SHALL respond: "You already have a command named *.weather*."

#### Scenario: Rename without arguments
- **WHEN** the user sends `.rename` without providing old and new names
- **THEN** the system SHALL show usage: "Usage: .rename <old-name> <new-name>\nExample: .rename remind my-reminder"

### Requirement: .login command
The system SHALL authenticate a developer via WhatsApp token.

#### Scenario: Login with valid token
- **GIVEN** a valid, unused, non-expired registration token exists
- **WHEN** the user sends `.login tk_<token>`
- **THEN** the system SHALL link the WhatsApp JID to the developer account
- **THEN** the system SHALL mark the token as used
- **THEN** the system SHALL create a session token
- **THEN** the system SHALL confirm: "✅ Login successful! Welcome, @{username}."

#### Scenario: Login without token
- **WHEN** the user sends `.login` without a token
- **THEN** the system SHALL show usage: "Usage: .login <token>\n\nGet your token from the developer dashboard."

#### Scenario: Login with invalid token
- **GIVEN** an invalid token
- **WHEN** the user sends `.login <invalid-token>`
- **THEN** the system SHALL respond: "❌ Invalid token."

#### Scenario: Login with expired token
- **GIVEN** a token has expired
- **WHEN** the user sends `.login <expired-token>`
- **THEN** the system SHALL respond: "❌ Token expired."

#### Scenario: Login with used token
- **GIVEN** a token has already been used
- **WHEN** the user sends `.login <used-token>`
- **THEN** the system SHALL respond: "❌ This token has already been used."

### Requirement: Unknown system command error
The system SHALL handle unknown system commands gracefully.

#### Scenario: System command not recognized
- **GIVEN** a system command that doesn't match any handler
- **WHEN** `handleSystemCommand` is called with an unrecognized slug
- **THEN** the system SHALL return `{ handled: false, message: "Unknown system command" }`
