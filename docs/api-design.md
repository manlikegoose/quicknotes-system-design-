# QuickNotes REST API Design

This document describes the **real QuickNotes backend API**, not the JSONPlaceholder practice service used by the browser demo.

## Base URL and conventions

- Base URL: `https://api.quicknotes.example/v1`
- Requests and responses use JSON unless a response is `204 No Content`.
- Protected endpoints require `Authorization: Bearer <access-token>`.
- A note belongs to the authenticated user; the server must enforce ownership.

## Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| `GET` | `/notes` | List the authenticated user's notes; supports `limit`, `cursor`, and `tag` query parameters. | `200 OK` |
| `GET` | `/notes/{noteId}` | Retrieve one note owned by the authenticated user. | `200 OK` |
| `POST` | `/notes` | Create a note for the authenticated user. | `201 Created` |
| `PATCH` | `/notes/{noteId}` | Update selected fields of an existing note. | `200 OK` |
| `PUT` | `/notes/{noteId}` | Replace the editable fields of an existing note. | `200 OK` |
| `DELETE` | `/notes/{noteId}` | Delete a note owned by the authenticated user. | `204 No Content` |
| `GET` | `/tags` | List the authenticated user's tags. | `200 OK` |
| `POST` | `/notes/{noteId}/tags` | Attach an existing tag to a note. | `201 Created` |

## Create a note

### Request

`POST /v1/notes`

```json
{
  "title": "Meeting notes",
  "body": "Prepare the project update.",
  "tagIds": ["tag_123"]
}
```

The title is required and must contain 1–100 characters after trimming. The body is optional. The server derives the user from the access token rather than trusting a client-supplied `userId`.

### Response

Status: `201 Created`

```json
{
  "id": "note_456",
  "userId": "user_123",
  "title": "Meeting notes",
  "body": "Prepare the project update.",
  "createdAt": "2026-10-27T10:30:00Z",
  "updatedAt": "2026-10-27T10:30:00Z",
  "tags": [
    {
      "id": "tag_123",
      "name": "work"
    }
  ]
}
```

## List notes

### Request

`GET /v1/notes?limit=2`

### Response

Status: `200 OK`

```json
{
  "data": [
    {
      "id": "note_456",
      "title": "Meeting notes",
      "body": "Prepare the project update.",
      "createdAt": "2026-10-27T10:30:00Z",
      "updatedAt": "2026-10-27T10:30:00Z"
    },
    {
      "id": "note_457",
      "title": "Reading list",
      "body": "Finish chapter three.",
      "createdAt": "2026-10-26T14:00:00Z",
      "updatedAt": "2026-10-26T14:00:00Z"
    }
  ],
  "pagination": {
    "limit": 2,
    "nextCursor": "cursor_example"
  }
}
```

An empty collection returns `200 OK` with `"data": []`. Pagination limits large responses.

## Error status codes

Errors use a consistent JSON body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title must contain between 1 and 100 characters."
  },
  "requestId": "req_abc123"
}
```

| Status | Meaning | Example |
|---|---|---|
| `400 Bad Request` | The request is malformed or fails validation. | A note title is missing or exceeds 100 characters. |
| `401 Unauthorized` | Authentication is missing or invalid. | The access token is expired. |
| `403 Forbidden` | The user is authenticated but not allowed to perform the action. | A policy explicitly denies an operation. |
| `404 Not Found` | The requested resource does not exist or is not visible to the caller. | The note ID cannot be found. |
| `500 Internal Server Error` | An unexpected server failure occurred. | An unhandled backend error occurs. |

The API should avoid revealing another user's private note through different error messages. It should log internal details securely and return a request ID to help support teams investigate failures.
