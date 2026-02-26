# ADR 001: Clean Architecture for AI Core

## Status
Accepted

## Context
We need a foundation that can support multiple AI domains (chat, agents, RAG) without requiring a total refactor for each new project.

## Decision
We will use Clean Architecture with four distinct layers:
1. **Domain**: Pure business logic and interfaces.
2. **Application**: Use cases and orchestration.
3. **Infrastructure**: External adapters and persistence.
4. **Presentation**: API and delivery mechanisms.

## Consequences
- **Pros**: High testability, framework independence, easy to swap AI providers.
- **Cons**: Initial boilerplate overhead.

---

# ADR 002: Multi-tenancy via Supabase RLS

## Status
Accepted

## Context
Isolation between workspaces is critical for a SaaS product.

## Decision
We will use Postgres Row Level Security (RLS) instead of application-level filtering. The tenant ID will be extracted from the JWT provided by Supabase Auth.

## Consequences
- **Pros**: Security is enforced at the database layer (bulletproof), simpler application code.
- **Cons**: Tied to Postgres-compatible databases.

---

# ADR 003: Intent-based Orchestration

## Status
Accepted

## Context
A single LLM call is often insufficient. We need to route queries to RAG, Plugins, or direct LLM.

## Decision
Implement an `Orchestrator` service that acts as an intent router. It determines the best path for a request based on metadata and query content.

## Consequences
- **Pros**: Unified interface for the frontend, easy to add "agentic" behavior later.
- **Cons**: Adds a layer of complexity to the request pipeline.
