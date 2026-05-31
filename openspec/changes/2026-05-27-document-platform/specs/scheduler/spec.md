## ADDED Requirements

### Requirement: SQLite-backed task storage
The system SHALL store scheduled tasks in the `scheduled_tasks` table.

#### Scenario: Task record structure
- **GIVEN** a scheduled_tasks table exists
- **THEN** it SHALL have columns: `id`, `userId`, `contactId`, `commandSlug`, `payload`, `executeAt`, `status`
- **THEN** `status` SHALL support values `"pending"`, `"executed"`, `"failed"`

### Requirement: Duration parser
The system SHALL parse human-readable duration strings.

#### Scenario: Parse minutes
- **GIVEN** a duration string "10m"
- **WHEN** the duration parser processes it
- **THEN** the system SHALL return the equivalent in milliseconds (10 * 60,000 = 600,000ms)

#### Scenario: Parse hours
- **GIVEN** a duration string "2h"
- **WHEN** the duration parser processes it
- **THEN** the system SHALL return the equivalent in milliseconds (2 * 3,600,000 = 7,200,000ms)

#### Scenario: Parse seconds
- **GIVEN** a duration string "30s"
- **WHEN** the duration parser processes it
- **THEN** the system SHALL return the equivalent in milliseconds (30 * 1,000 = 30,000ms)

#### Scenario: Parse invalid format
- **GIVEN** a duration string "abc"
- **WHEN** the duration parser processes it
- **THEN** the system SHALL throw an error

### Requirement: Scheduler poll loop
The system SHALL periodically poll for due tasks.

#### Scenario: Poll interval
- **GIVEN** the scheduler is started
- **WHEN** the poll loop is active
- **THEN** the system SHALL query for tasks with `executeAt <= now` and `status = "pending"` every 30 seconds

#### Scenario: Execute due task
- **GIVEN** a task is due for execution
- **WHEN** the scheduler poll fires
- **THEN** the system SHALL execute the task
- **THEN** the system SHALL update the task status to "executed"

### Requirement: Restart recovery
The system SHALL resume pending scheduled tasks after a server restart.

#### Scenario: Resume pending tasks
- **GIVEN** the server restarts and there are tasks with `status = "pending"` and `executeAt` in the past
- **WHEN** the scheduler starts
- **THEN** the system SHALL execute all past-due pending tasks immediately

### Requirement: Task failure handling
The system SHALL handle task execution failures gracefully.

#### Scenario: Failed task
- **GIVEN** a task execution throws an error
- **WHEN** the scheduler handles the failure
- **THEN** the system SHALL set task status to "failed"
- **THEN** the system SHALL log the error
- **THEN** the system SHALL continue polling for other tasks
