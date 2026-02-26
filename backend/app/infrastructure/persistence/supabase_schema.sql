-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workspaces table (Multi-tenant)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    settings JSONB DEFAULT '{"enable_rag": true, "enable_plugins": true, "rate_limit_rpm": 60, "feature_flags": {}}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table with Vector support
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- Assuming OpenAI embeddings
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID,
    feature TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Workspace policy: User can only access workspaces they belong to
-- (This assumes a join table or a claim in JWT for workspace_ids)
CREATE POLICY workspace_isolation_policy ON workspaces
    USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Document policy: Strict isolation by workspace_id
CREATE POLICY document_isolation_policy ON documents
    FOR ALL
    USING (workspace_id IN (
        SELECT id FROM workspaces WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    ));

CREATE POLICY usage_log_isolation_policy ON usage_logs
    FOR ALL
    USING (workspace_id IN (
        SELECT id FROM workspaces WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    ));
