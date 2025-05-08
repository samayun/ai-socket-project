# AI-Powered Tic-Tac-Toe Game Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Setup Guide](#setup-guide)
4. [API Documentation](#api-documentation)
5. [Database Schema](#database-schema)
6. [AI Algorithms](#ai-algorithms)
7. [WebSocket Events](#websocket-events)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Prediction System](#prediction-system)

## Project Overview

The AI-Powered Tic-Tac-Toe game is a real-time multiplayer game that combines traditional Tic-Tac-Toe with advanced AI capabilities. The game features multiple AI algorithms, skill-based matchmaking, and real-time analytics.

### Key Features
- Real-time multiplayer gameplay
- Multiple AI algorithms (BFS, DFS, N-Queens)
- Skill-based matchmaking system
- League system (Bronze to Diamond)
- Game history and statistics
- Room-based matchmaking
- Real-time move predictions

## Architecture

### Tech Stack
- **Backend**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Database**: PostgreSQL with vector embeddings
- **Containerization**: Docker and Docker Compose
- **Frontend**: React with TypeScript

### System Components
```
AI Project
├── Backend (Node.js)
│   ├── Socket.IO server
│   ├── Algorithm implementations
│   ├── Data analytics & prediction
│   └── PostgreSQL interface
├── Database (PostgreSQL)
│   ├── Vector embeddings
│   └── Traditional relational data
├── Frontend
│   ├── Real-time UI
│   └── Socket.IO client
└── Infrastructure
    ├── Docker containers
    └── Docker Compose orchestration
```

## Setup Guide

### Prerequisites
- Docker and Docker Compose
- Node.js (v14 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### Installation Steps

1. Clone the repository:
```bash
git clone git@github.com:samayun/ai-socket-project.git
cd ai-project
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure environment variables:
```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5435
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=ai_project 

```

4. Start with Docker:
```bash
docker-compose up --build
```

5. Or run locally:
```bash
npm install
npm run dev
```

### Access Points
- Backend API: http://localhost:3000
- PostgreSQL: postgresql://postgres:postgres@localhost:5435/ai_project
- pgAdmin: http://localhost:5050

## API Documentation

### REST Endpoints

#### Authentication Endpoints

##### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "string",
  "password": "string",
  "display_name": "string",
  "age": number,
  "parent_email": "string"
}

Response:
{
  "success": boolean,
  "user": {
    "id": "string",
    "username": "string",
    "display_name": "string"
  }
}
```

##### Sign In
```http
POST /api/auth/signin
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response:
{
  "success": boolean,
  "user": {
    "id": "string",
    "username": "string",
    "display_name": "string"
  }
}
```

##### Check Authentication Status
```http
GET /api/auth/status

Response:
{
  "authenticated": boolean,
  "user": {
    "id": "string",
    "username": "string",
    "display_name": "string"
  }
}
```

##### Logout
```http
POST /api/auth/logout

Response:
{
  "success": boolean
}
```

#### Profile Endpoints

##### Get Player Profile
```http
GET /api/profile

Response:
{
  "id": "string",
  "username": "string",
  "display_name": "string",
  "skill_level": number,
  "parent_email": "string",
  "games_played": number,
  "wins": number,
  "losses": number,
  "draws": number,
  "game_history": [
    {
      "created_at": "timestamp",
      "result": "string",
      "score": "string",
      "algorithm": "string",
      "opponent_name": "string"
    }
  ]
}
```

#### Room Management Endpoints

##### Create Room
```http
POST /api/rooms/create
Content-Type: application/json

{
  "name": "string",
  "is_private": boolean
}

Response:
{
  "success": boolean,
  "room": {
    "id": "string",
    "name": "string",
    "status": "string",
    "player_count": number
  }
}
```

##### Join Room
```http
POST /api/rooms/join
Content-Type: application/json

{
  "roomId": "string"
}

Response:
{
  "success": boolean,
  "room": {
    "id": "string",
    "name": "string",
    "status": "string",
    "player_count": number,
    "board": array,
    "currentPlayer": "string"
  }
}
```

##### Leave Room
```http
POST /api/rooms/leave
Content-Type: application/json

{
  "roomId": "string"
}

Response:
{
  "success": boolean
}
```

#### Game Management Endpoints

##### Make Move
```http
POST /api/game/move
Content-Type: application/json

{
  "roomId": "string",
  "position": number,
  "player": "X" | "O"
}

Response:
{
  "success": boolean,
  "board": array,
  "currentPlayer": "string",
  "winner": "string" | null
}
```

##### Reset Game
```http
POST /api/game/reset
Content-Type: application/json

{
  "roomId": "string"
}

Response:
{
  "success": boolean,
  "board": array,
  "currentPlayer": "string"
}
```

### Error Responses

All endpoints may return the following error responses:

```http
400 Bad Request
{
  "success": false,
  "error": "Error message"
}

401 Unauthorized
{
  "success": false,
  "error": "Not authenticated"
}

404 Not Found
{
  "success": false,
  "error": "Resource not found"
}

500 Internal Server Error
{
  "success": false,
  "error": "Internal server error"
}
```

### Authentication

Most endpoints require authentication. Include the session cookie in your requests. The server uses session-based authentication.

### Rate Limiting

API endpoints are rate-limited to prevent abuse:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

## Database Schema

### Tables

#### Migration Schema
```sql

DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS game_states CASCADE;
DROP TABLE IF EXISTS player_sockets CASCADE;
DROP TABLE IF EXISTS player_profiles CASCADE;
DROP TABLE IF EXISTS room_invitations CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;


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


CREATE TABLE IF NOT EXISTS game_history (
    id SERIAL PRIMARY KEY,
    player_id VARCHAR(50) REFERENCES player_profiles(id) ON DELETE CASCADE,
    opponent_id VARCHAR(50) REFERENCES player_profiles(id) ON DELETE CASCADE,
    result VARCHAR(10) CHECK (result IN ('win', 'loss', 'draw')),
    score VARCHAR(10),
    algorithm VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
```

## AI Algorithms

### BFS (Breadth-First Search)
- Explores all possible moves
- Prioritizes winning moves
- Implements blocking strategy
- Best for early game positions

### DFS (Depth-First Search)
- Deep move exploration
- Strategic position evaluation
- End-game optimization
- Efficient for complex positions

### N-Queens Inspired
- Advanced strategic positioning
- Pattern recognition
- Long-term planning
- High-level gameplay

### Algorithm Selection
```javascript
const algorithm = skillLevel > 3000 ? "nQueens" : 
                 skillLevel > 2000 ? "bfs" : "dfs";
```

## WebSocket Events

### Room Events
```javascript
socket.emit('joinRoom', roomId);

socket.emit('leaveRoom', roomId);

socket.emit('resetBoard', roomId);

socket.emit('createRoom', {
    roomName,
    roomCode
});


```

### Game Events
```javascript
socket.emit('makeMove', {
    roomId: gameState.roomId,
    position,
    playerId: gameState.playerId
});

socket.emit('playerData', { id: authData.user.id });
```

### Miscellenious Events
```javascript
socket.emit("error", {  message: "Room is full. Maximum 2 players allowed." });

socket.emit('playerData', { id: authData.user.id });
```


## Deployment

### Docker Deployment
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: postgres
    ports:
      - "5435:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=ai_project
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database-init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - ai-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4
    container_name: ai-pgadmin
    environment:
      - PGADMIN_DEFAULT_EMAIL=admin@admin.com
      - PGADMIN_DEFAULT_PASSWORD=admin
      - PGADMIN_CONFIG_SERVER_MODE=False
      - PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED=False
    volumes:
      - ./docker/pgadmin/servers.json:/pgadmin4/servers.json
      - ./docker/pgadmin/pgpass:/pgpass
    ports:
      - "5050:80"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - ai-network
    user: root
    entrypoint: /bin/sh -c "chmod 600 /pgpass; /entrypoint.sh;"

networks:
  ai-network:
    driver: bridge

volumes:
  postgres_data:
```

### Environment Variables
- `DB_USER`: Database username
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host
- `DB_PORT`: Database port
- `DB_NAME`: Database name

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Check environment variables
   - Verify PostgreSQL is running
   - Check network connectivity

2. **WebSocket Connection Issues**
   - Verify Socket.IO server is running
   - Check client connection settings
   - Monitor network connectivity

3. **AI Prediction Issues**
   - Check algorithm selection
   - Verify player skill level
   - Monitor prediction confidence

### Debugging Tools
- Socket.IO debug mode
- PostgreSQL logs
- Application logs
- Network monitoring

### Support
For additional support:
- Check GitHub issues
- Contact development team
- Review documentation updates 

## Prediction System

### Overview
The prediction system uses a multi-layered approach combining historical data analysis, algorithm-based prediction, and fallback mechanisms to provide accurate move suggestions.

### Vector Similarity Search

#### Implementation
```sql
-- Vector similarity search query
SELECT board_state, next_move, result 
FROM game_states 
WHERE (player_x_id = $1 OR player_o_id = $1)
AND (player_x_id IN (
  SELECT id FROM player_profiles WHERE skill_level BETWEEN $2 AND $3
) OR player_o_id IN (
  SELECT id FROM player_profiles WHERE skill_level BETWEEN $2 AND $3
))
ORDER BY created_at DESC
LIMIT 5
```

#### Process
1. **Board State Vectorization**
   - Converts board state to 9-character string
   - Format: `board.map(cell => cell || ' ').join('')`
   - Example: "X O X   O  " for a partial board

2. **Skill Level Filtering**
   - Searches within ±200 skill points of player
   - Ensures relevant predictions for skill level
   - Maintains competitive balance

3. **Similarity Calculation**
   - Uses PostgreSQL vector similarity
   - Compares current board with historical states
   - Returns most similar configurations

### Prediction Process

#### Weight Calculation
```javascript
const predictions = similarStates.rows.map((row) => ({
  move: row.next_move,
  weight: row.result === "win" ? 1.5 : 1.0,
}));
```

- Winning moves: 1.5x weight
- Other moves: 1.0x weight
- Weights multiplied by similarity score

#### Move Selection
```javascript
const bestMove = predictions.reduce((best, current) =>
  current.weight > best.weight ? current : best
);
```

- Aggregates predictions from similar states
- Selects move with highest weighted score
- Returns prediction with confidence level

### Algorithm Fallback

#### Selection Criteria
```javascript
const algorithm = skillLevel > 3000 ? "nQueens" : 
                 skillLevel > 2000 ? "bfs" : "dfs";
```

- Diamond/Platinum (>3000): N-Queens algorithm
- Gold (>2000): BFS algorithm
- Silver/Bronze: DFS algorithm

### Confidence Levels

The system provides the following confidence levels:
- "win": Guaranteed winning move
- "block": Blocking opponent's winning move
- "center": Strategic center position
- "corner": Strategic corner position
- "strategic": Advanced strategic move
- "default": Basic move

### Real-time Updates

#### WebSocket Events
```javascript
socket.on('prediction', (data) => {
  if (data && typeof data.prediction === 'number') {
    updatePrediction(data);
  } else {
    updatePrediction(null);
  }
});
```

#### UI Updates
- Predicted move position
- Confidence level display
- Algorithm source
- Strategic recommendations

### Performance Considerations

1. **Database Optimization**
   - Indexed queries for vector similarity
   - Efficient board state storage
   - Cached predictions for common states

2. **Real-time Processing**
   - Asynchronous prediction calculation
   - Non-blocking move validation
   - Efficient state updates

3. **Memory Management**
   - Limited historical state storage
   - Regular cleanup of old predictions
   - Optimized vector calculations

### Error Handling

```javascript
try {
  const prediction = await predictNextMove(board, playerId);
  return {
    prediction: prediction.prediction,
    confidence: prediction.confidence,
    algorithm: prediction.algorithm,
    leagueTier: prediction.leagueTier
  };
} catch (error) {
  console.error("Error in prediction:", error);
  return {
    prediction: findRandomEmptyCell(board),
    confidence: 0.5,
    algorithm: "fallback",
    leagueTier: "BRONZE"
  };
}
```

### Future Enhancements

1. **Advanced Vector Similarity**
   - Implement custom similarity metrics
   - Add pattern recognition
   - Improve historical data analysis

2. **Machine Learning Integration**
   - Train models on historical data
   - Implement reinforcement learning
   - Add adaptive difficulty

3. **Performance Improvements**
   - Implement prediction caching
   - Optimize vector calculations
   - Add parallel processing

 