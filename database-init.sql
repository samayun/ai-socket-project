
CREATE EXTENSION IF NOT EXISTS vector;


DROP TABLE IF EXISTS game_states CASCADE;
DROP TABLE IF EXISTS player_profiles CASCADE;
DROP TABLE IF EXISTS vector_embeddings CASCADE;


CREATE TABLE player_profiles (
    fingerprint VARCHAR(255) PRIMARY KEY,
    ip_address VARCHAR(45),
    skill_level INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_played TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE game_states (
    id SERIAL PRIMARY KEY,
    board_state vector(9),
    next_move vector(9),
    result VARCHAR(10),
    player_fingerprint VARCHAR(255),
    skill_level INTEGER,
    algorithm VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_fingerprint) REFERENCES player_profiles(fingerprint)
);


CREATE TABLE vector_embeddings (
    id SERIAL PRIMARY KEY,
    board_state vector(9),
    next_move vector(9),
    result VARCHAR(10),
    player_skill_level INTEGER,
    algorithm VARCHAR(50),
    confidence FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX idx_game_states_player_fingerprint ON game_states(player_fingerprint);
CREATE INDEX idx_game_states_skill_level ON game_states(skill_level);
CREATE INDEX idx_game_states_created_at ON game_states(created_at);
CREATE INDEX idx_vector_embeddings_skill_level ON vector_embeddings(player_skill_level);
CREATE INDEX idx_vector_embeddings_created_at ON vector_embeddings(created_at);
