# QuickNotes Architecture and Scaling Plan

## 1. Functional requirements

- Users can register, authenticate, and access only their own notes.
- Users can create, list, read, update, and delete notes.
- A note has a required title of at most 100 characters and an optional body.
- Users can create tags and associate tags with notes.
- The API returns consistent JSON responses and meaningful HTTP status codes.
- Users can paginate their notes and search or filter by supported fields.

## 2. Non-functional requirements

- **Availability:** deploy multiple application instances across failure domains and avoid a single application-server failure taking the service offline.
- **Performance:** keep common note-list requests responsive with caching, pagination, and indexed queries.
- **Scalability:** scale application servers horizontally and scale storage independently from compute.
- **Security:** use HTTPS, authenticated requests, authorization checks, input validation, rate limits, and secure secret management.
- **Durability:** use database backups, point-in-time recovery where supported, and durable object storage for attachments if introduced.
- **Observability:** collect request metrics, structured logs, traces, error rates, and queue-depth alerts.
- **Consistency:** use the primary database for writes and route sensitive read-after-write operations to the primary when replica lag could be visible.

## 3. Load estimates for 1 million users

### Assumptions

- 1,000,000 registered users.
- 10% are daily active users: 100,000 DAU.
- Each active user makes 20 note-read requests per day.
- Each active user makes 1 note-write request per day, counting creates, updates, and deletes.
- Requests are averaged across 86,400 seconds per day.
- Peak traffic is five times the average.
- Each stored note and its metadata average 2 KB, excluding database indexes, replicas, logs, and backups.
- Each active user creates one new note per day, giving a simple estimate of net new notes; updates and deletes affect actual retained storage.
- One year has 365 days.

### Reads per second

Daily reads:

100,000 active users × 20 reads = 2,000,000 reads/day.

Average reads per second:

2,000,000 ÷ 86,400 = approximately 23.15 reads/second.

Peak estimate at 5× average:

23.15 × 5 = approximately 115.74 reads/second.

### Writes per second

Daily writes:

100,000 active users × 1 write = 100,000 writes/day.

Average writes per second:

100,000 ÷ 86,400 = approximately 1.16 writes/second.

Peak estimate at 5× average:

1.16 × 5 = approximately 5.79 writes/second.

### Storage per year

Assuming one new 2 KB note per active user per day:

100,000 notes/day × 365 = 36,500,000 new notes/year.

36,500,000 × 2 KB = 73,000,000 KB, or approximately 73 GB per year using decimal units.

This is an illustrative estimate. Actual storage will be higher after indexes, replicas, audit data, backups, and any attachments are included; deleted notes and retention rules also affect net growth.

## 4. Architecture diagram

```text
                          +------------------+
                          |      Client      |
                          | Browser / Mobile |
                          +------------------+
                                    |
                                    v
                          +------------------+
                          |       DNS        |
                          | Domain resolution|
                          +------------------+
                                    |
                                    v
                          +------------------+
                          |       CDN        |
                          | Static assets    |
                          +------------------+
                                    |
                                    v
                          +------------------+
                          |  Load Balancer   |
                          +------------------+
                             /            \
                            v              v
                   +----------------+ +----------------+
                   |  App Server 1  | |  App Server 2  |
                   | API instance   | | API instance   |
                   +----------------+ +----------------+
                          |    \          /    |
                          |     \        /     |
                          v      v      v      v
                   +-----------+  +------------------+
                   |   Cache   |  | Primary Database |
                   | Hot reads |  | Authoritative    |
                   +-----------+  | writes           |
                                  +------------------+
                                           |
                                           v
                                  +------------------+
                                  |  Read Replica    |
                                  | Read-only queries|
                                  +------------------+

            Background tasks:
              App Server(s)
                    |
                    v
             +----------------+
             | Message Queue  |
             +----------------+
                    |
                    v
             +----------------+
             | Worker         |
             | Async jobs     |
             +----------------+

  The API servers read/write note data through the cache and database.
  The queue/worker path handles tasks such as email notifications,
  exports, or attachment processing without blocking the request.
```

## 5. What each component solves

- **Client:** provides the interface users interact with to create, browse, and edit notes.
- **DNS:** maps the service domain to the correct public endpoint so clients do not need a fixed server IP.
- **CDN:** caches static assets near users, reducing latency and origin traffic.
- **Load balancer:** distributes requests across healthy application instances and removes unhealthy instances from rotation.
- **App Server 1:** runs the API application and handles requests as one horizontally scalable instance.
- **App Server 2:** provides additional request capacity and allows service to continue if one application instance fails.
- **Cache:** stores frequently requested note lists or other safe-to-cache data to reduce database load and latency; user-specific keys and invalidation rules prevent cross-user data leaks.
- **Primary database:** stores authoritative user, note, tag, and relationship records and processes writes transactionally.
- **Read replica:** serves eligible read queries to reduce pressure on the primary database, with the trade-off that replication may lag.
- **Message queue:** buffers background jobs, separates them from user-facing requests, and enables retry after temporary worker failures.
- **Worker:** processes asynchronous work such as notifications, exports, or attachment tasks without keeping the original HTTP request waiting.

The CDN is primarily for static assets in this architecture; private note data should not be publicly cached. Any private API caching must be explicitly configured with safe user-specific keys and authorization-aware cache behavior.

## 6. GET `/notes` request flow

1. The user opens QuickNotes and requests their notes.
2. DNS resolves the service hostname, and the request reaches the load balancer over HTTPS.
3. The load balancer forwards the request to a healthy application server.
4. The application server validates the access token and checks the user's permissions.
5. The server checks the cache using a key scoped to the authenticated user and the requested pagination or filter parameters.
6. If a valid cache entry exists, the server returns the cached notes; otherwise, it queries the read replica when replica freshness is acceptable, or the primary for a read-after-write request.
7. The server returns a paginated JSON response to the client and may cache the result for a short, defined period.
8. Cache invalidation or versioning ensures changes to notes do not leave stale results indefinitely.

## 7. POST `/notes` request flow

1. The client sends `POST /notes` with a JSON title and optional body over HTTPS.
2. The load balancer routes the request to a healthy application server.
3. The application server authenticates the user, validates the title length and body, checks rate limits, and derives the owner from the authenticated identity.
4. The application server writes the new note to the primary database in a transaction.
5. The database commits the record and returns its generated ID and timestamps.
6. The server invalidates or updates relevant cached note lists for that user.
7. The server responds with `201 Created` and the created note as JSON.
8. If follow-up work is needed, such as a notification, the application enqueues a job for a worker instead of delaying the API response.

## 8. Trade-offs

### Cache speed versus freshness

Caching improves repeated reads and reduces database work, but it can return stale note lists after a write. Short TTLs, explicit invalidation, and versioned keys reduce this risk; sensitive operations can bypass the cache.

### Read replicas versus consistency

A read replica increases read capacity, but replication lag can mean a just-created note is temporarily missing from a subsequent read. Route read-after-write requests to the primary or use a consistency-aware strategy for those requests.

### More app servers versus operational complexity

Multiple app servers improve capacity and availability, but deployment, monitoring, and configuration become more complex. Automated deployments, health checks, centralized logs, and consistent configuration help manage the added complexity.

### Asynchronous jobs versus immediate completion

A queue prevents nonessential work from slowing API responses and supports retries, but jobs may be delayed or processed more than once. Workers should be idempotent, queue depth should be monitored, and failed jobs should have a retry and dead-letter strategy.

## 9. Avoiding single points of failure

Run at least two application instances across separate failure domains behind a health-checking load balancer, and avoid storing sessions or essential files only on one app server. Use a highly available database setup with automated backups and a tested promotion/failover process for the read replica or standby; a read replica alone is not automatically a failover solution. Deploy the cache and message queue with supported replication or managed high-availability configurations, and configure workers to recover from retries. DNS, CDN, object storage, and load-balancer availability should use resilient managed configurations where possible. Regularly test recovery procedures because redundancy without tested failover does not guarantee availability.
