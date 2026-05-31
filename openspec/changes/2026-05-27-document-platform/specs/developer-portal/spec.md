## ADDED Requirements

### Requirement: Developer authentication via session tokens
The system SHALL authenticate developers via session tokens stored in the database.

#### Scenario: Bearer token validation
- **GIVEN** a developer has a session token
- **WHEN** a request with `Authorization: Bearer <token>` is made to `/developer/*`
- **THEN** the system SHALL look up the token in the sessions table
- **THEN** the system SHALL resolve the developer ID and username from the session
- **THEN** the system SHALL set the developer context on the request
- **THEN** the system SHALL return 401 if the token is invalid

#### Scenario: Session token not found
- **GIVEN** an invalid session token
- **WHEN** a protected request is made
- **THEN** the system SHALL return 401 with "Unauthorized" error

#### Scenario: Developer not found for session
- **GIVEN** a session references a non-existent developer
- **WHEN** the session is validated
- **THEN** the system SHALL return 401 with "Unauthorized" error

### Requirement: Legacy endpoint deprecation
The system SHALL return 410 (Gone) for deprecated endpoints.

#### Scenario: Legacy command registration
- **WHEN** `POST /developer/commands` is called
- **THEN** the system SHALL return 410 with "Endpoint removed. Use POST /developer/repos instead."

#### Scenario: Legacy command listing
- **WHEN** `GET /developer/commands` is called
- **THEN** the system SHALL return 410 with "Endpoint removed. Use GET /developer/repos instead."

#### Scenario: Legacy command update
- **WHEN** `PUT /developer/commands/:id` is called
- **THEN** the system SHALL return 410 with "Endpoint removed. Use POST /developer/repos/:repoUrl/refresh instead."

### Requirement: Repository-based command management
The system SHALL manage commands through GitHub repository registration.

#### Scenario: Register repository
- **GIVEN** an authenticated developer
- **WHEN** `POST /developer/repos` is called with a GitHub repo URL
- **THEN** the system SHALL fetch the manifest from the repository
- **THEN** the system SHALL validate all commands (all-or-nothing)
- **THEN** the system SHALL insert all valid commands
- **THEN** the system SHALL return the created command records with status 201

#### Scenario: List repositories
- **GIVEN** an authenticated developer
- **WHEN** `GET /developer/repos` is called
- **THEN** the system SHALL return all repositories with their commands grouped by repoUrl

#### Scenario: Refresh repository
- **GIVEN** an authenticated developer
- **WHEN** `POST /developer/repos/:repoUrl/refresh` is called
- **THEN** the system SHALL fetch the updated manifest
- **THEN** the system SHALL detect added, updated, and disabled commands
- **THEN** the system SHALL return `{ added: N, updated: N, disabled: N }`

#### Scenario: Delete repository
- **GIVEN** an authenticated developer
- **WHEN** `DELETE /developer/repos/:repoUrl` is called
- **THEN** the system SHALL delete all commands from that repository
- **THEN** the system SHALL return the count of deleted commands

### Requirement: Command analytics
The system SHALL provide analytics for developer commands.

#### Scenario: View command analytics
- **GIVEN** an authenticated developer
- **WHEN** `GET /developer/commands/:id/analytics` is called
- **THEN** the system SHALL return install count, unique contacts, usage count, and error count
- **THEN** the system SHALL return 404 if the command does not exist or does not belong to the developer

### Requirement: WhatsApp registration flow
The system SHALL support developer registration via WhatsApp token.

#### Scenario: Initiate registration
- **GIVEN** a username is provided
- **WHEN** `POST /developer/auth/init` is called
- **THEN** the system SHALL create or find the developer account
- **THEN** the system SHALL generate a registration token with 10-minute expiry
- **THEN** the system SHALL return the token, a WhatsApp URL, and the phone number to message

#### Scenario: Poll registration status
- **GIVEN** a registration token was created
- **WHEN** `GET /developer/auth/status?token=<token>` is called
- **THEN** the system SHALL return "pending" while the token is unused
- **THEN** the system SHALL return "complete" with session token once the token is used
- **THEN** the system SHALL return "expired" if the token has expired

#### Scenario: Username taken
- **GIVEN** a developer with the same username already has a linked WhatsApp JID
- **WHEN** `POST /developer/auth/init` is called with that username
- **THEN** the system SHALL return 409 with "Username is already taken"
