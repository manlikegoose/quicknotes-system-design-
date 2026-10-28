# QuickNotes Data Model

## Entities and columns

### `users`

- `id`: `INTEGER`, primary key.
- `email`: `TEXT`, required and unique.
- `display_name`: `TEXT`, required.
- `created_at`: `TEXT`, required ISO-8601 timestamp.

### `notes`

- `id`: `INTEGER`, primary key.
- `user_id`: `INTEGER`, required foreign key to `users.id`.
- `title`: `TEXT`, required, maximum 100 characters.
- `body`: `TEXT`, optional.
- `created_at`: `TEXT`, required ISO-8601 timestamp.
- `updated_at`: `TEXT`, required ISO-8601 timestamp.

### `tags`

- `id`: `INTEGER`, primary key.
- `user_id`: `INTEGER`, required foreign key to `users.id`.
- `name`: `TEXT`, required.
- `created_at`: `TEXT`, required ISO-8601 timestamp.
- `UNIQUE(user_id, name)` prevents a user from creating duplicate tag names.

### `note_tags`

- `note_id`: `INTEGER`, part of the composite primary key and foreign key to `notes.id`.
- `tag_id`: `INTEGER`, part of the composite primary key and foreign key to `tags.id`.
- `created_at`: `TEXT`, required ISO-8601 timestamp.
- `PRIMARY KEY(note_id, tag_id)` prevents attaching the same tag to a note more than once.

## Relationships

- **Users to notes — one-to-many:** one user can own many notes, while each note belongs to one user. The `notes.user_id` foreign key implements this relationship.
- **Users to tags — one-to-many:** one user can create many tags, while each tag belongs to one user. The `tags.user_id` foreign key implements this relationship.
- **Notes to tags — many-to-many:** a note can have several tags and a tag can be applied to several notes. The `note_tags` join table represents each association and can hold association-specific data such as when the tag was added.

## SQLite `CREATE TABLE` statements

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 100),
    body TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## Example SQL queries

### 1. List a user's notes

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 1
ORDER BY updated_at DESC;
```

### 2. Find notes and their tags (JOIN)

```sql
SELECT n.title, t.name AS tag
FROM notes AS n
JOIN note_tags AS nt ON nt.note_id = n.id
JOIN tags AS t ON t.id = nt.tag_id
WHERE n.user_id = 1
ORDER BY n.title;
```

### 3. Count notes per user

```sql
SELECT u.id, u.display_name, COUNT(n.id) AS note_count
FROM users AS u
LEFT JOIN notes AS n ON n.user_id = u.id
GROUP BY u.id, u.display_name
ORDER BY note_count DESC;
```

### 4. Find notes with no tags

```sql
SELECT n.id, n.title
FROM notes AS n
LEFT JOIN note_tags AS nt ON nt.note_id = n.id
WHERE nt.note_id IS NULL;
```

## Index

```sql
CREATE INDEX idx_notes_user_updated
ON notes(user_id, updated_at DESC);
```

This index supports the common operation of listing one user's notes ordered by most recently updated, reducing the amount of data the database must scan and sort. The unique email and tag constraints already create indexes for their respective uniqueness checks.

## SQL or NoSQL?

I would choose a relational SQL database such as PostgreSQL for QuickNotes. Users, notes, tags, and note-tag associations have clear relationships, and foreign keys and transactions help preserve data integrity. SQL joins support tag searches and reporting, while indexes and read replicas can help scale reads. NoSQL could be appropriate if future access patterns require highly flexible document storage, but it would make these relational constraints and joins less straightforward.
