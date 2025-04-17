const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'ai_project'
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('run_algorithm', async (data) => {
    try {
      const { algorithm, input } = data;
      let result;

      switch (algorithm) {
        case 'bfs':
          result = await runBFS(input);
          break;
        case 'dfs':
          result = await runDFS(input);
          break;
        case 'nqueens':
          result = await runNQueens(input);
          break;
        default:
          throw new Error('Unknown algorithm');
      }

      // Store result in database
      await pool.query(
        'INSERT INTO algorithm_results (algorithm_type, input_data, result, execution_time) VALUES ($1, $2, $3, $4)',
        [algorithm, input, result, result.executionTime]
      );

      socket.emit('algorithm_result', result);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Algorithm implementations
async function runBFS(input) {
  const startTime = Date.now();
  const { start, end, graph } = input;
  
  // Parse graph
  const edges = graph.split(',').map(edge => edge.trim().split('-'));
  const adjacencyList = {};
  
  edges.forEach(([from, to]) => {
    if (!adjacencyList[from]) adjacencyList[from] = [];
    if (!adjacencyList[to]) adjacencyList[to] = [];
    adjacencyList[from].push(to);
    adjacencyList[to].push(from);
  });

  // BFS implementation
  const queue = [start];
  const visited = new Set([start]);
  const parent = { [start]: null };
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (current === end) {
      // Reconstruct path
      const path = [];
      let node = end;
      while (node !== null) {
        path.unshift(node);
        node = parent[node];
      }
      return {
        path,
        visited: Array.from(visited),
        executionTime: Date.now() - startTime
      };
    }
    
    for (const neighbor of adjacencyList[current] || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        parent[neighbor] = current;
      }
    }
  }
  
  return {
    path: [],
    visited: Array.from(visited),
    executionTime: Date.now() - startTime
  };
}

async function runDFS(input) {
  const startTime = Date.now();
  const { start, end, graph } = input;
  
  // Parse graph
  const edges = graph.split(',').map(edge => edge.trim().split('-'));
  const adjacencyList = {};
  
  edges.forEach(([from, to]) => {
    if (!adjacencyList[from]) adjacencyList[from] = [];
    if (!adjacencyList[to]) adjacencyList[to] = [];
    adjacencyList[from].push(to);
    adjacencyList[to].push(from);
  });

  const visited = new Set();
  const path = [];
  
  function dfs(current, target) {
    visited.add(current);
    path.push(current);
    
    if (current === target) return true;
    
    for (const neighbor of adjacencyList[current] || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, target)) return true;
      }
    }
    
    path.pop();
    return false;
  }
  
  dfs(start, end);
  
  return {
    path,
    visited: Array.from(visited),
    executionTime: Date.now() - startTime
  };
}

async function runNQueens(input) {
  const startTime = Date.now();
  const n = input.n;
  const solutions = [];
  
  function isSafe(board, row, col) {
    // Check row
    for (let i = 0; i < col; i++) {
      if (board[i] === row) return false;
    }
    
    // Check diagonals
    for (let i = 0; i < col; i++) {
      if (Math.abs(board[i] - row) === Math.abs(i - col)) return false;
    }
    
    return true;
  }
  
  function solveNQueens(board, col) {
    if (col >= n) {
      solutions.push([...board]);
      return;
    }
    
    for (let row = 0; row < n; row++) {
      if (isSafe(board, row, col)) {
        board[col] = row;
        solveNQueens(board, col + 1);
      }
    }
  }
  
  solveNQueens(new Array(n), 0);
  
  return {
    solutions,
    executionTime: Date.now() - startTime
  };
}

// API routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
}); 