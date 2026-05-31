## ADDED Requirements

### Requirement: Waha session management
The system SHALL maintain one or more Waha WhatsApp sessions, one per contact number.

#### Scenario: Session starts successfully
- **GIVEN** the platform starts with configured Waha endpoints
- **THEN** all configured Waha sessions connect and report "connected" status

#### Scenario: Session disconnects
- **GIVEN** a Waha session disconnects unexpectedly
- **THEN** the system SHALL attempt automatic reconnection within 60 seconds

### Requirement: Inbound webhook processing
The system SHALL receive incoming WhatsApp messages via Waha webhook and route them to the message router.

#### Scenario: Message received from user
- **GIVEN** Waha delivers a webhook for an incoming message
- **WHEN** `POST /webhook` is called with the WAHA payload format
- **THEN** the system SHALL extract sender JID, contact JID, message body, and message ID
- **THEN** the system SHALL pass this data to the message router
- **THEN** the system SHALL return 200 immediately (fire-and-forget processing)

#### Scenario: Non-message events filtered
- **GIVEN** Waha sends events other than "message"
- **THEN** the system SHALL ignore non-message events

#### Scenario: Status messages filtered
- **GIVEN** the message type is "status"
- **THEN** the system SHALL skip processing

### Requirement: Outbound message sending
The system SHALL send text messages to users via the Waha REST API.

#### Scenario: Send text message
- **GIVEN** a command handler calls `ctx.send("hello")`
- **WHEN** `sendMessage(chatId, text)` is invoked on the WahaClient
- **THEN** the system SHALL send the message via Waha to the user's WhatsApp JID
- **THEN** the system SHALL return the message ID from the response

### Requirement: Reaction support
The system SHALL support adding and removing emoji reactions to messages via Waha.

#### Scenario: Add reaction
- **GIVEN** the platform needs to show processing state
- **WHEN** `sendReaction(messageId, chatId, emoji)` is invoked
- **THEN** the reaction SHALL appear on the user's message within 2 seconds

#### Scenario: Remove reaction
- **GIVEN** a reaction was previously added
- **WHEN** `removeReaction(messageId, chatId, emoji)` is invoked
- **THEN** the reaction SHALL disappear from the user's message

#### Scenario: Reaction failure tolerance
- **GIVEN** a reaction send fails
- **THEN** the system SHALL log the error but NOT throw (reactions are non-critical)

### Requirement: Multi-contact support
The system SHALL support multiple WhatsApp contacts (numbers), each with its own Waha session.

#### Scenario: Admin adds new contact
- **GIVEN** an _akka admin has access to the admin portal
- **WHEN** a new contact is added with phone number and Waha session ID
- **THEN** the system SHALL create a new Waha session and register its webhook mapping

### Requirement: Session health checking
The system SHALL periodically check Waha session health.

#### Scenario: Health check returns working
- **GIVEN** a Waha session is active
- **WHEN** `checkHealth()` is called
- **THEN** the system SHALL return `true` when the session status is "WORKING"

#### Scenario: Health check returns down
- **GIVEN** a Waha session is inactive
- **WHEN** `checkHealth()` is called
- **THEN** the system SHALL return `false`

### Requirement: _akka admin portal
The system SHALL provide a web portal for _akka admins to manage WhatsApp contacts and sessions.

#### Scenario: Admin login
- **GIVEN** an _akka admin has credentials
- **WHEN** `POST /admin/login` is called with username/password
- **THEN** the system SHALL return a bearer token for authenticated requests

#### Scenario: Add contact
- **GIVEN** an authenticated admin
- **WHEN** `POST /admin/contacts` is called with name, phoneNumber, wahaSessionId
- **THEN** the system SHALL create the contact record and register the Waha session

#### Scenario: Remove contact
- **GIVEN** an authenticated admin
- **WHEN** `DELETE /admin/contacts/:id` is called
- **THEN** the system SHALL delete the contact and remove the Waha session

#### Scenario: View session status
- **GIVEN** an authenticated admin
- **WHEN** `GET /admin/sessions` is called
- **THEN** the system SHALL show all contacts with their session status (connected/disconnected)
