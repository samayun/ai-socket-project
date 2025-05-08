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

#### player_profiles
```sql
CREATE TABLE player_profiles (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    skill_level INTEGER DEFAULT 1000,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0
);
```

#### game_states
```sql
CREATE TABLE game_states (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(50),
    player_x_id VARCHAR(50),
    player_o_id VARCHAR(50),
    board_state VARCHAR(9),
    next_move INTEGER,
    result VARCHAR(10),
    winner VARCHAR(1),
    algorithm VARCHAR(50)
);
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
// Join room
socket.emit('joinRoom', roomId);

// Leave room
socket.emit('leaveRoom', roomId);

// Reset board
socket.emit('resetBoard', roomId);
```

### Game Events
```javascript
// Make move
socket.emit('makeMove', {
  roomId: string,
  position: number,
  player: 'X' | 'O'
});

// New game
socket.emit('newGame', roomId);
```

## Deployment

### Docker Deployment
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_HOST=db
      - DB_PORT=5432
    depends_on:
      - db

  db:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
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