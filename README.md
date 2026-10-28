# QuickNotes System Design

QuickNotes is a small notes API client and system-design assignment. The browser client uses JSONPlaceholder as a practice API to demonstrate loading, creating, and deleting notes. The accompanying documents describe the real backend API, relational data model, and architecture for a service intended to scale to one million registered users.

## Features

- Load up to 10 sample notes with `GET /posts?_limit=10`.
- Create a note using `POST /posts` with title, body, and `userId: 1`.
- Delete a note using `DELETE /posts/{id}`.
- Show loading, success, error, and empty states.
- Validate that a title is required and is no longer than 100 characters.
- Responsive, accessible HTML and CSS.

**Practice API limitation:** JSONPlaceholder simulates writes; it does not permanently save created or deleted posts. The client reflects successful changes in the current page session only.

## How to run the API client

1. Clone or download this repository.
2. Open `index.html` in a modern browser, or serve the folder locally:

   ```bash
   python3 -m http.server 8000
   ```

3. Visit `http://localhost:8000/`.
4. Select **Load notes**, create a note using the form, or delete a note.
5. An internet connection is required to contact JSONPlaceholder.

No build step or package installation is required.

## Design documents

- [REST API design](docs/api-design.md) — endpoints, JSON examples, and error handling.
- [Data model](docs/data-model.md) — entities, relationships, SQLite schema, queries, and indexing.
- [Architecture and scaling](docs/architecture.md) — requirements, load estimates, components, request flows, and trade-offs.

## What I learned

- How to use `fetch`, `async/await`, and a reusable request helper to handle HTTP requests and errors.
- Why input validation, accessible status messages, and disabling buttons during requests improve the user experience.
- How REST endpoints use HTTP methods and status codes to communicate operations and outcomes.
- How primary keys, foreign keys, join tables, and indexes support a relational data model.
- How caching, read replicas, load balancing, and background queues can improve scalability while introducing trade-offs.
- Why practice APIs such as JSONPlaceholder are useful for front-end development but are not a substitute for a persistent production backend.
