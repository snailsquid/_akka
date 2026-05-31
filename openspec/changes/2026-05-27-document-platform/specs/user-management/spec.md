## ADDED Requirements

### Requirement: User lookup by WhatsApp JID
The system SHALL identify users by their WhatsApp JID.

#### Scenario: Find existing user
- **GIVEN** a user with JID "1234567890@c.us" exists in the database
- **WHEN** `findByJid("1234567890@c.us")` is called
- **THEN** the system SHALL return the existing UserRecord

#### Scenario: Create new user
- **GIVEN** a user with JID "1234567890@c.us" does NOT exist
- **WHEN** `getOrCreateUser("1234567890@c.us")` is called
- **THEN** the system SHALL create a new user record
- **THEN** the system SHALL generate an anonymized ID from the JID
- **THEN** the system SHALL return the new UserRecord

### Requirement: Anonymized ID generation
The system SHALL generate anonymized IDs from phone JIDs for privacy.

#### Scenario: Generate anonymized ID
- **GIVEN** a phone JID "1234567890@c.us"
- **WHEN** `generateAnonymizedId()` is called
- **THEN** the system SHALL produce a deterministic hash of the JID
- **THEN** the system SHALL append a random suffix for uniqueness
- **THEN** the resulting ID SHALL NOT contain the phone number

### Requirement: Installation CRUD
The system SHALL manage command installations with user-defined slugs and collision handling.

#### Scenario: Install command
- **GIVEN** a user and contact exist
- **WHEN** `installCommand(userId, contactId, commandId, userSlug)` is called
- **THEN** the system SHALL check for existing installation (same user, contact, command)
- **THEN** if already installed, return the existing record
- **THEN** if not installed, create a new installation record
- **THEN** the system SHALL store the user-defined slug

#### Scenario: Check installation by user slug
- **GIVEN** a user has installed a command with user slug "my-weather"
- **WHEN** `getInstallationByUserSlug(userId, contactId, "my-weather")` is called
- **THEN** the system SHALL return the installation record

#### Scenario: Check installation by command slug
- **GIVEN** a command with slug "weather" is installed
- **WHEN** `isInstalled(userId, contactId, "weather")` is called
- **THEN** the system SHALL check both by user slug AND by command slug
- **THEN** the system SHALL return `true` if found either way

#### Scenario: Uninstall command
- **GIVEN** a user has installed a command
- **WHEN** `uninstallCommand(userId, contactId, userSlug)` is called
- **THEN** the system SHALL delete the installation record
- **THEN** the system SHALL return `true`

#### Scenario: Rename installation
- **GIVEN** a user has installed a command with slug "old-name"
- **WHEN** `renameInstallation(userId, contactId, "old-name", "new-name")` is called
- **THEN** the system SHALL update the user_slug in the installation record
- **THEN** the system SHALL return `true`

#### Scenario: Get all user installations
- **GIVEN** a user has 3 installed commands on a contact
- **WHEN** `getUserInstallations(userId, contactId)` is called
- **THEN** the system SHALL return all 3 installations with full command details

#### Scenario: Get user slugs
- **GIVEN** a user has 3 installations on a contact
- **WHEN** `getUserSlugs(userId, contactId)` is called
- **THEN** the system SHALL return all user-defined slugs as a string array

### Requirement: Developer registration
The system SHALL support developer registration via WhatsApp tokens.

#### Scenario: Create registration token
- **GIVEN** a developer account exists
- **WHEN** a registration token is generated via the developer portal
- **THEN** the system SHALL create a `registrationTokens` record with a UUID token
- **THEN** the system SHALL link the token to the developer ID
- **THEN** the system SHALL set a 10-minute expiry

#### Scenario: Validate registration token
- **GIVEN** a valid, unused registration token
- **WHEN** `handleLogin()` processes `.login <token>`
- **THEN** the system SHALL verify the token exists
- **THEN** the system SHALL verify the token is not expired
- **THEN** the system SHALL verify the token has not been used
- **THEN** the system SHALL verify the developer ID exists

#### Scenario: Link developer to WhatsApp JID
- **GIVEN** a valid registration token
- **WHEN** the token is used via `.login`
- **THEN** the system SHALL link the developer's WhatsApp JID to their account
- **THEN** the system SHALL mark the token as used
- **THEN** the system SHALL create a session token for web portal access

#### Scenario: Token already used
- **GIVEN** a registration token has been used
- **WHEN** `.login <token>` is called again
- **THEN** the system SHALL reject with "This token has already been used"

#### Scenario: Token expired
- **GIVEN** a registration token has expired
- **WHEN** `.login <token>` is called
- **THEN** the system SHALL reject with "Token expired"

#### Scenario: Duplicate WhatsApp JID check
- **GIVEN** a developer already has a different WhatsApp JID linked
- **WHEN** `.login` is attempted from a different number
- **THEN** the system SHALL reject with "This account is already linked to a different WhatsApp number"

#### Scenario: Duplicate developer JID check
- **GIVEN** a WhatsApp JID is already linked to a different developer
- **WHEN** `.login` is attempted
- **THEN** the system SHALL reject with "This WhatsApp number is already linked to @<username>"
