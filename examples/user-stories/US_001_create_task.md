# US-001 — Create a Task

**As a** registered user,  
**I want** to create a new task with a title, optional due date, and priority,  
**So that** I can track what I need to do and when.

---

## Acceptance Criteria

- **AC1:** The user can create a task by entering a title and clicking "Add Task"
- **AC2:** The new task appears immediately in the task list, marked as active
- **AC3:** The user can optionally set a due date (today or in the future only)
- **AC4:** The user can set a priority: low, medium (default), or high
- **AC5:** If the title is empty or blank, a validation error is shown and no task is created
- **AC6:** If the due date is in the past, a validation error is shown and no task is created
- **AC7:** The active task counter increments by 1 after a successful creation

---

## API Endpoint

`POST /api/tasks`

**Request:**
```json
{
  "title": "Buy groceries",
  "dueDate": "2026-06-10",
  "priority": "medium"
}
```

**Success (201):**
```json
{
  "id": "uuid-...",
  "title": "Buy groceries",
  "completed": false,
  "dueDate": "2026-06-10",
  "priority": "medium",
  "createdAt": "2026-06-05T10:00:00Z"
}
```

**Error (400):**
```json
{
  "error": "Validation failed",
  "details": ["title is required"]
}
```

---

## Notes

- Title: 1–100 characters
- Priority defaults to "medium" if omitted
- Due date is optional