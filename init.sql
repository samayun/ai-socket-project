-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Create tables
CREATE TABLE IF NOT EXISTS vector_embeddings (
    id SERIAL PRIMARY KEY,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS algorithm_results (
    id SERIAL PRIMARY KEY,
    algorithm_type VARCHAR(50),
    input_data JSONB,
    result JSONB,
    execution_time FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predictions (
    id SERIAL PRIMARY KEY,
    model_type VARCHAR(50),
    input_data JSONB,
    prediction JSONB,
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vector_embeddings_created_at ON vector_embeddings(created_at);
CREATE INDEX IF NOT EXISTS idx_algorithm_results_algorithm_type ON algorithm_results(algorithm_type);
CREATE INDEX IF NOT EXISTS idx_predictions_model_type ON predictions(model_type); 