## ADDED Requirements

### Requirement: Command parsing
The system SHALL parse incoming message bodies to extract command slugs and arguments.

#### Scenario: Parse system command
- **GIVEN** a message body of ".help"
- **WHEN** `parseCommand(".help", userId, contactId)` is called
- **THEN** the system SHALL return `{ slug: "help", args: [], userSlug: "help" }`

#### Scenario: Parse installed command
- **GIVEN** a user has installed a command with slug "weather"
- **WHEN** `parseCommand(".weather Tokyo", userId, contactId)` is called
- **THEN** the system SHALL return `{ slug: "weather", args: ["Tokyo"], userSlug: "weather" }`

#### Scenario: Parse command with spaces in slug
- **GIVEN** a user has installed a command with slug "remind me"
- **WHEN** `parseCommand(".remind me 10m check email", userId, contactId)` is called
- **THEN** the system SHALL perform longest-prefix matching
- **THEN** the system SHALL return `{ slug: "remind me", args: ["10m", "check", "email"], userSlug: "remind me" }`

#### Scenario: Non-command message ignored
- **GIVEN** a message body of "hello there" (no leading dot)
- **WHEN** `parseCommand("hello there", userId, contactId)` is called
- **THEN** the system SHALL return `null` (no command detected)

#### Scenario: Marketplace special case
- **GIVEN** a message body of "marketplace" (no leading dot)
- **WHEN** `parseCommand("marketplace", userId, contactId)` is called
- **THEN** the system SHALL return `{ slug: "marketplace", args: [], userSlug: "marketplace" }`

#### Scenario: Empty message ignored
- **GIVEN** a message body of "" or "   "
- **WHEN** `parseCommand("", userId, contactId)` is called
- **THEN** the system SHALL return `null`

### Requirement: Reaction on command receipt
The system SHALL show a loading indicator when processing commands.

#### Scenario: Send loading reaction
- **GIVEN** a command has been parsed successfully
- **WHEN** the router begins processing
- **THEN** the system SHALL send a ⏳ (hourglass) reaction to the user's message

#### Scenario: Remove loading reaction on success
- **GIVEN** a command is processing
- **WHEN** command execution completes successfully
- **THEN** the system SHALL remove the ⏳ reaction
- **THEN** the system SHALL add a ✅ (check mark) reaction

#### Scenario: Remove loading reaction on error
- **GIVEN** a command is processing
- **WHEN** command execution throws an error
- **THEN** the system SHALL remove the ⏳ reaction
- **THEN** the system SHALL add an ❌ (cross mark) reaction

### Requirement: Installation check
The system SHALL verify that a command is installed before executing it.

#### Scenario: Installed command executes
- **GIVEN** a command is installed for the user on the contact
- **WHEN** the command is invoked
- **THEN** the system SHALL execute the command

#### Scenario: Uninstalled command rejected
- **GIVEN** a command is NOT installed for the user on the contact
- **WHEN** the command is invoked
- **THEN** the system SHALL send "❌ Command not installed. Use .marketplace to browse."

#### Scenario: System command bypasses install check
- **GIVEN** a command is a system command (.help, .marketplace, .uninstall, .rename, .login)
- **WHEN** the command is invoked
- **THEN** the system SHALL execute it without checking installation

### Requirement: Error handling
The system SHALL handle command execution errors gracefully.

#### Scenario: Execution error
- **GIVEN** a command throws an error during execution
- **WHEN** the error is caught by the router
- **THEN** the system SHALL send "❌ Something went wrong. The command may have an error." to the user
- **THEN** the system SHALL log the error to the console

### Requirement: Conversation flow state machine
The system SHALL manage multi-turn conversation flows and protect them from command interruption.

#### Scenario: Flow active blocks commands
- **GIVEN** a user is in an active conversation flow (e.g., marketplace selection)
- **WHEN** the user sends a command (e.g., ".weather")
- **THEN** the system SHALL route the message to the flow handler instead of the command handler
- **THEN** the flow handler processes the message as a response

#### Scenario: Flow timeout
- **GIVEN** a conversation flow was created
- **WHEN** the flow's `expiresAt` timestamp has passed
- **THEN** the system SHALL treat the flow as inactive
- **THEN** the system SHALL route new messages as regular commands

#### Scenario: Flow completion
- **GIVEN** a conversation flow completes (e.g., marketplace installation)
- **WHEN** the flow handler returns `completed: true`
- **THEN** the system SHALL end (delete) the flow
- **THEN** subsequent messages SHALL be routed as regular commands

#### Scenario: Unknown flow type
- **GIVEN** a flow has an unrecognized flow type
- **WHEN** the flow is encountered
- **THEN** the system SHALL end the flow
- **THEN** the system SHALL send "Flow ended. Send a command to continue."

### Requirement: Flow management API
The system SHALL provide methods for managing conversation flow state.

#### Scenario: Start a flow
- **GIVEN** a user needs a multi-turn conversation
- **WHEN** `startFlow(userId, contactId, flowType, data)` is called
- **THEN** the system SHALL create a conversation flow record with 60-second expiry
- **THEN** the system SHALL return the flow object

#### Scenario: Update flow state
- **GIVEN** an active flow exists
- **WHEN** `updateFlow(flowId, state, data)` is called
- **THEN** the system SHALL update the flow's state and data
- **THEN** the system SHALL extend the flow's expiry by the specified seconds

#### Scenario: End a flow
- **GIVEN** an active flow exists
- **WHEN** `endFlow(flowId)` is called
- **THEN** the system SHALL delete the flow record

#### Scenario: Check flow state
- **GIVEN** a user has or has not an active flow
- **WHEN** `isInFlow(userId, contactId)` is called
- **THEN** the system SHALL return `true` if an active flow exists, `false` otherwise
