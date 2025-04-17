# AI Project with Socket.IO and PostgreSQL

This project implements a real-time AI system with the following features:
- Socket.IO for real-time communication
- PostgreSQL with vector embeddings and pg_cron
- BFS/DFS/N-Queens algorithm implementations
- Data analytics and prediction capabilities
- Docker containerization

## Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- PostgreSQL (for local development)

## Setup

1. Clone the repository
2. Create a `.env` file based on the example
3. Run the application:

```bash
# Using Docker
docker-compose up --build

# Local development
npm install
npm run dev
```

## Services

- Backend API: http://localhost:3000
- PostgreSQL: localhost:5434
- pgAdmin: http://localhost:5050

## Features

### Real-time Algorithms
- BFS (Breadth-First Search)
- DFS (Depth-First Search)
- N-Queens Problem Solver

### Data Analytics
- Vector embeddings storage
- Scheduled data cleanup
- Performance metrics

### Socket.IO Events

#### Client to Server
- `run_algorithm`: Execute an algorithm with input data
  ```javascript
  socket.emit('run_algorithm', {
    algorithm: 'bfs|dfs|nqueens',
    input: {...}
  });
  ```

#### Server to Client
- `algorithm_result`: Receive algorithm execution results
- `error`: Receive error messages

## Database Schema

### Tables
- `vector_embeddings`: Store vector data
- `algorithm_results`: Store algorithm execution results
- `predictions`: Store prediction data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 