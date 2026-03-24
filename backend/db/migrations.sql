-- RootCause AI — NeonDB Schema
-- All statements are idempotent (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS network_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id VARCHAR(50) NOT NULL,
    latency_ms FLOAT NOT NULL,
    packet_loss_pct FLOAT NOT NULL,
    throughput_mbps FLOAT NOT NULL,
    anomaly_score FLOAT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES network_events(id),
    agent_name VARCHAR(50) NOT NULL,
    input_state JSONB NOT NULL,
    output_state JSONB NOT NULL,
    latency_ms INTEGER NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS remediation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES network_events(id),
    thread_id VARCHAR(200),
    action_type VARCHAR(30) NOT NULL,
    target_node VARCHAR(50) NOT NULL,
    parameters JSONB NOT NULL,
    confidence FLOAT NOT NULL,
    requires_approval BOOLEAN DEFAULT FALSE,
    approved BOOLEAN DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    execution_result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    failure_type VARCHAR(100) NOT NULL,
    embedding FLOAT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS graph_checkpoints (
    thread_id VARCHAR(200) PRIMARY KEY,
    checkpoint_data JSONB NOT NULL,
    state_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
