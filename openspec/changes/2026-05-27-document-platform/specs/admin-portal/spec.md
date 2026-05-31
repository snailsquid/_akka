## ADDED Requirements

### Requirement: Admin authentication
The system SHALL authenticate _akka admins via a simple token-based mechanism.

#### Scenario: Admin login
- **WHEN** `POST /admin/login` is called with the configured admin credentials
- **THEN** the system SHALL return a bearer token for authenticated requests

#### Scenario: Admin login failure
- **WHEN** `POST /admin/login` is called with wrong credentials
- **THEN** the system SHALL return `{ error: "Invalid credentials" }` with status 401

#### Scenario: Authenticated request validation
- **GIVEN** an admin has a bearer token
- **WHEN** a request with `Authorization: Bearer <token>` is made to protected endpoints
- **THEN** the system SHALL validate the token matches the expected admin token
- **THEN** the system SHALL return 401 if invalid

### Requirement: Contact management
The system SHALL provide CRUD operations for WhatsApp contacts via the admin portal.

#### Scenario: List contacts
- **GIVEN** contacts exist in the database
- **WHEN** `GET /admin/contacts` is called with admin auth
- **THEN** the system SHALL return all contacts

#### Scenario: Add contact
- **GIVEN** an authenticated admin
- **WHEN** `POST /admin/contacts` is called with name, phoneNumber, wahaSessionId
- **THEN** the system SHALL create a new contact record
- **THEN** the system SHALL register the Waha session via the session manager
- **THEN** the system SHALL return the created contact with status 201

#### Scenario: Add contact with existing session
- **GIVEN** a contact with the same wahaSessionId already exists
- **WHEN** `POST /admin/contacts` is called with the same wahaSessionId
- **THEN** the system SHALL return 409 with "Session already configured" error

#### Scenario: Remove contact
- **GIVEN** an authenticated admin
- **WHEN** `DELETE /admin/contacts/:id` is called
- **THEN** the system SHALL delete the contact record
- **THEN** the system SHALL remove the Waha session via the session manager

#### Scenario: Remove non-existent contact
- **GIVEN** an authenticated admin
- **WHEN** `DELETE /admin/contacts/:id` is called for a non-existent ID
- **THEN** the system SHALL return 404 with "Contact not found" error

### Requirement: Session status dashboard
The system SHALL provide a dashboard showing Waha session health status.

#### Scenario: View session status
- **GIVEN** an authenticated admin
- **WHEN** `GET /admin/sessions` is called
- **THEN** the system SHALL return all sessions with contactId, sessionId, and isHealthy status

#### Scenario: Session manager not initialized
- **GIVEN** the session manager has not been initialized
- **WHEN** `GET /admin/sessions` is called
- **THEN** the system SHALL return `{ sessions: [], message: "Session manager not initialized" }`
