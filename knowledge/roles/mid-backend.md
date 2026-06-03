# Mid Backend Engineer

A mid-level backend engineer with 2–4 years of production experience. They have moved beyond
basic CRUD — they design for scale, own their CI/CD pipeline, and think about failure modes.
Evidence of production work is visible: database indexing decisions, message queue integrations,
caching strategy, and container orchestration beyond a local docker-compose file.

## Required Concepts

- database query indexing orm | Database optimization (indexing strategy, query explain plans, N+1 detection, connection pooling)
- kafka bull queue event | Event-driven architecture (message queues or pub/sub — Kafka, RabbitMQ, Redis Streams, or SQS)
- Caching layers (Redis, Memcached, CDN cache, HTTP cache headers — not just in-memory maps)
- swagger openapi api versioning | API versioning and backwards compatibility (URL versioning, header negotiation, deprecation strategy)
- Rate limiting and throttling (token bucket or sliding window, per-user vs per-IP, backpressure)
- docker kubernetes container | Container orchestration (Docker Compose for local, Kubernetes or ECS for production workloads)
- github actions pipeline deploy | CI/CD pipeline ownership (GitHub Actions or equivalent — build, test, lint, deploy stages)
- retry circuit distributed | Distributed systems basics (idempotency, retry with backoff, circuit breakers, at-least-once delivery)
- Structured error handling and API error contracts (RFC 7807 problem details or equivalent, error taxonomy, no stack traces in responses)

## Bonus Concepts

- Database migrations at scale (zero-downtime migrations, backwards-compatible schema changes)
- Observability and tracing (OpenTelemetry, distributed tracing, structured logging with correlation IDs)
- Service mesh or API gateway patterns (Kong, AWS API Gateway, Envoy sidecar)
- gRPC or GraphQL as an alternative to REST
- Infrastructure as code (Terraform, Pulumi, or AWS CDK)
- Secret management (Vault, AWS Secrets Manager, environment-specific secret rotation)
- Performance profiling and heap analysis (language-specific profilers, pprof, async flamegraphs)
- Multi-tenant data isolation strategies (row-level security, schema-per-tenant)
- Security hardening (OWASP top 10 awareness, dependency auditing, secrets scanning in CI)

## Complexity Threshold

minimum_complexity_score: 50
