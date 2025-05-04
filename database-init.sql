-- Drop existing tables if they exist
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS game_states CASCADE;
DROP TABLE IF EXISTS player_sockets CASCADE;
DROP TABLE IF EXISTS player_profiles CASCADE;
DROP TABLE IF EXISTS room_invitations CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

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

-- Create game states table
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

-- Create rooms table
CREATE TABLE rooms (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    created_by VARCHAR(50) REFERENCES player_profiles(id),
    status VARCHAR(20) DEFAULT 'waiting',
    player_count INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 2,
    is_private BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create room_invitations table
CREATE TABLE room_invitations (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(50) REFERENCES rooms(id),
    created_by VARCHAR(50) REFERENCES player_profiles(id),
    invited_username VARCHAR(50),
    invited_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (room_id, invited_username) WHERE invited_username IS NOT NULL,
    UNIQUE (room_id, invited_email) WHERE invited_email IS NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_sockets_player_id ON player_sockets(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_player_id ON game_history(player_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created_at ON game_history(created_at);
CREATE INDEX IF NOT EXISTS idx_game_states_player_id ON game_states(player_id);
CREATE INDEX IF NOT EXISTS idx_game_states_player_x_id ON game_states(player_x_id);
CREATE INDEX IF NOT EXISTS idx_game_states_player_o_id ON game_states(player_o_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_created_by ON rooms(created_by);
CREATE INDEX idx_room_invitations_room_id ON room_invitations(room_id);
CREATE INDEX idx_room_invitations_status ON room_invitations(status);
CREATE INDEX idx_room_invitations_invited ON room_invitations(invited_username, invited_email);