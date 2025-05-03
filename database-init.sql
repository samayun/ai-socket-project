-- Drop existing tables if they exist
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS game_states CASCADE;
DROP TABLE IF EXISTS player_sockets CASCADE;
DROP TABLE IF EXISTS player_profiles CASCADE;

-- Create player profiles table
CREATE TABLE IF NOT EXISTS player_profiles (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    password VARCHAR(255),
    age INTEGER,
    parent_email VARCHAR(255),
    phone VARCHAR(20),
    skill_level INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create player sockets table
CREATE TABLE IF NOT EXISTS player_sockets (
    socket_id VARCHAR(100) PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES player_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS game_states (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(50),
    player_x_id VARCHAR(50) REFERENCES player_profiles(id),
    player_o_id VARCHAR(50) REFERENCES player_profiles(id),
    board_state VARCHAR(9),
    next_move INTEGER,
    result VARCHAR(10) CHECK (result IN ('win', 'loss', 'draw')),
    winner VARCHAR(1) CHECK (winner IN ('X', 'O', 'D')),
    player_x_result VARCHAR(10) CHECK (player_x_result IN ('win', 'loss', 'draw')),
    player_o_result VARCHAR(10) CHECK (player_o_result IN ('win', 'loss', 'draw')),
    final_score VARCHAR(10),
    algorithm VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create game history table
CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES player_profiles(id) ON DELETE CASCADE,
    opponent_id VARCHAR(50) REFERENCES player_profiles(id) ON DELETE CASCADE,
    result VARCHAR(10) CHECK (result IN ('win', 'loss', 'draw')),
    score VARCHAR(10),
    algorithm VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_sockets_player_id ON player_sockets(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player_id ON game_history(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);
CREATE INDEX IF NOT EXISTS idx_game_states_player_id ON game_states(player_id);
CREATE INDEX IF NOT EXISTS idx_game_states_player_x_id ON game_states(player_x_id);
CREATE INDEX IF NOT EXISTS idx_game_states_player_o_id ON game_states(player_o_id);