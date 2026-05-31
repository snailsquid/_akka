## ADDED Requirements

### Requirement: Paginated marketplace listing
The system SHALL display commands in paginated format (5 commands per page) with text-based navigation.

#### Scenario: Show first page
- **GIVEN** 12 active commands exist on the platform
- **WHEN** `showPage(userId, contactId, 1)` is called
- **THEN** the system SHALL return a formatted text response showing 5 commands
- **THEN** the response SHALL include page number "1/3" in the header
- **THEN** each command SHALL show: `{number}. *{developer}/{slug}* — {description}`
- **THEN** each command SHALL show the repository name on the next line
- **THEN** already-installed commands SHALL show a "✅" prefix
- **THEN** the footer SHALL show navigation hints ('n' for next, 'p' for previous)

#### Scenario: Page with no commands
- **GIVEN** no commands are registered on the platform
- **WHEN** `showPage(userId, contactId, 1)` is called
- **THEN** the system SHALL display "Page 1/1" with empty command list

#### Scenario: Navigate to next page
- **GIVEN** the user is on page 1
- **WHEN** the user responds "n" and there are more pages
- **THEN** the system SHALL show page 2

#### Scenario: Navigate to previous page
- **GIVEN** the user is on page 3
- **WHEN** the user responds "p" and there are previous pages
- **THEN** the system SHALL show page 2

#### Scenario: Attempt navigate past last page
- **GIVEN** the user is on the last page
- **WHEN** the user responds "n"
- **THEN** the system SHALL stay on current page
- **THEN** the system SHALL show "You're on the last page."

#### Scenario: Attempt navigate before first page
- **GIVEN** the user is on page 1
- **WHEN** the user responds "p"
- **THEN** the system SHALL stay on current page
- **THEN** the system SHALL show "You're on the first page."

### Requirement: Text-based command selection
The system SHALL support selecting commands by number for installation.

#### Scenario: Select valid command number
- **GIVEN** the marketplace shows items 1-5
- **WHEN** the user responds "3"
- **THEN** the system SHALL identify the third command in the list

#### Scenario: Select invalid command number
- **GIVEN** the marketplace shows 5 items
- **WHEN** the user responds "10"
- **THEN** the system SHALL return "Invalid selection. Please reply with a valid number."

### Requirement: Already installed indication
The system SHALL show whether a command is already installed for the user.

#### Scenario: Already installed
- **GIVEN** a user has command "alice/weather" already installed
- **WHEN** the marketplace listing is generated
- **THEN** "alice/weather" SHALL be shown with a ✅ prefix in the listing

#### Scenario: Not installed
- **GIVEN** a user does NOT have "bob/weather" installed
- **WHEN** the marketplace listing is generated
- **THEN** "bob/weather" SHALL be shown without a ✅ prefix

### Requirement: Install with confirmation
The system SHALL install a selected command and show usage confirmation.

#### Scenario: Install command
- **GIVEN** a user selects an uninstalled command
- **WHEN** the number is processed
- **THEN** the system SHALL create an installation record
- **THEN** the system SHALL confirm with "✅ *{fullId}* installed! Usage: _{usage}_"

#### Scenario: Attempt to install already-installed
- **GIVEN** a user selects a command that is already installed
- **WHEN** the number is processed
- **THEN** the system SHALL return "*{fullId}* is already installed. Send .help to see your commands."

### Requirement: Slug collision handling
The system SHALL handle slug collisions when installing commands with conflicting user slugs.

#### Scenario: Replace existing slug
- **GIVEN** a user has `.weather` installed and tries to install another `.weather`
- **WHEN** the user responds "replace" to the collision prompt
- **THEN** the system SHALL overwrite the existing installation with the new one
- **THEN** the system SHALL confirm installation

#### Scenario: Create new slug with postfix
- **GIVEN** a user has `.weather` installed and tries to install another `.weather`
- **WHEN** the user responds "new" to the collision prompt
- **THEN** the system SHALL install as `.weather1` (incremented postfix)
- **THEN** the system SHALL confirm installation with the new slug name

#### Scenario: Collision prompt
- **GIVEN** a slug collision is detected
- **WHEN** install confirmation is needed
- **THEN** the system SHALL show "You already have *.{slug}* installed"
- **THEN** the system SHALL ask "Replace with *{fullId}*, or install as *.{slug}1*?"
- **THEN** the system SHALL prompt "Reply 'replace' or 'new'"
- **THEN** the system SHALL create a collision state (awaitingCollision)

#### Scenario: Invalid collision response
- **GIVEN** the system is awaiting collision resolution
- **WHEN** the user responds with something other than "replace" or "new"
- **THEN** the system SHALL repeat the prompt: "Please reply 'replace' or 'new'."

### Requirement: Flow state management
The system SHALL maintain marketplace conversation state across multiple messages.

#### Scenario: Build initial state
- **GIVEN** a user opens marketplace for the first time
- **WHEN** `buildInitialState(userId, contactId)` is called
- **THEN** the system SHALL return a `MarketplaceState` with page=1, totalPages, and first page commands

#### Scenario: Handle response with flow completion
- **GIVEN** the user is in a marketplace flow
- **WHEN** the user selects a valid installation option
- **THEN** `handleResponse()` SHALL return `{ completed: true, message: "..." }`
- **THEN** the router SHALL end the flow

#### Scenario: Handle response with continued state
- **GIVEN** the user is in a marketplace flow
- **WHEN** the user navigates to a different page
- **THEN** `handleResponse()` SHALL return `{ completed: false, newState: ... }`
- **THEN** the router SHALL update the flow state with the new page
