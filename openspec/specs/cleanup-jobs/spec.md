## ADDED Requirements

### Requirement: Cleanup job removes expired conversation flows
The system SHALL periodically remove conversation flows that have expired.

#### Scenario: Expired flow is deleted
- **WHEN** a conversation flow's `expiresAt` timestamp is in the past
- **THEN** the cleanup job SHALL delete that flow record

#### Scenario: Active flow is preserved
- **WHEN** a conversation flow's `expiresAt` timestamp is in the future
- **THEN** the cleanup job SHALL NOT delete that flow record

### Requirement: Cleanup job removes expired registration tokens
The system SHALL periodically remove registration tokens that have expired and are unused.

#### Scenario: Expired unused token is deleted
- **WHEN** a registration token's `expiresAt` timestamp is in the past AND `used` is false
- **THEN** the cleanup job SHALL delete that token record

#### Scenario: Used token is preserved
- **WHEN** a registration token has `used` = true
- **THEN** the cleanup job SHALL NOT delete that token record

#### Scenario: Active token is preserved
- **WHEN** a registration token's `expiresAt` timestamp is in the future
- **THEN** the cleanup job SHALL NOT delete that token record

### Requirement: Cleanup job runs periodically
The system SHALL run the cleanup job on a configurable interval.

#### Scenario: Cleanup runs hourly by default
- **WHEN** the scheduler is started
- **THEN** the cleanup job SHALL run every 60 minutes by default

#### Scenario: Cleanup interval is configurable
- **WHEN** the `CLEANUP_INTERVAL_MS` environment variable is set
- **THEN** the cleanup job SHALL run at that interval

### Requirement: Uninstall command deletes installation
The `uninstallCommand` method SHALL remove the installation record from the database.

#### Scenario: Uninstall removes record
- **WHEN** a user uninstalls a command
- **THEN** the installation record SHALL be deleted from the database

#### Scenario: Uninstall returns true when deleted
- **WHEN** an installation exists and is successfully deleted
- **THEN** the method SHALL return true

#### Scenario: Uninstall returns false when not found
- **WHEN** no installation matches the criteria
- **THEN** the method SHALL return false

### Requirement: Rename command updates installation
The `renameInstallation` method SHALL update the userSlug of an installation record.

#### Scenario: Rename updates userSlug
- **WHEN** a user renames an installed command
- **THEN** the installation's `userSlug` SHALL be updated in the database

#### Scenario: Rename returns true when updated
- **WHEN** an installation exists and is successfully renamed
- **THEN** the method SHALL return true

#### Scenario: Rename returns false when not found
- **WHEN** no installation matches the old slug
- **THEN** the method SHALL return false

### Requirement: Install command returns created record
The `installCommand` method SHALL return the newly created installation without race conditions.

#### Scenario: Install returns created installation
- **WHEN** a new installation is created
- **THEN** the method SHALL return the installation record using `.returning().get()`

#### Scenario: Install returns existing installation
- **WHEN** the command is already installed for that user/contact combination
- **THEN** the method SHALL return the existing installation without creating a duplicate

### Requirement: Marketplace shows correct installed status
The marketplace SHALL correctly indicate whether a command is installed for the current user.

#### Scenario: Installed command shows checkmark
- **WHEN** a user has installed a command (regardless of userSlug)
- **THEN** the marketplace SHALL display that command as installed

#### Scenario: Renamed command shows as installed
- **WHEN** a user has installed a command and renamed it (e.g., "remind" → "myremind")
- **THEN** the marketplace SHALL still show that command as installed
