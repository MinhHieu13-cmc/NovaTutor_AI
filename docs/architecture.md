# Core Architecture Concepts

## Domain Layer
- Entities: Workspace, Tenant, User, UsageRecord, Document, Plugin.
- Interfaces: LLMProvider, EmbeddingProvider, VectorStore, PluginBase.

## Application Layer
- Use Cases: OrchestrateChat, IngestDocument, ExecutePlugin, TrackUsage.
- Services: Orchestrator, RAGEngine, PluginRegistry.

## Infrastructure Layer
- Persistence: Supabase (Postgres + pgvector), Redis (Rate limiting).
- External: OpenAI, Anthropic, HuggingFace.
- Authentication: Supabase Auth (JWT).

## Presentation Layer
- API: FastAPI routes, WebSocket/SSE for streaming.
- Middlewares: Auth, RateLimiting, Logging.
