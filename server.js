const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static('public'));

// PostgreSQL connection with pgvector
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ai_project',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5434,
});

// Game rooms storage
const gameRooms = new Map();

// Initialize pgvector extension
async function initializeDatabase() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    
    // Drop existing table if it exists
    await pool.query('DROP TABLE IF EXISTS vector_embeddings;');
    
    // Create the table with the correct structure
    await pool.query(`
      CREATE TABLE vector_embeddings (
        id SERIAL PRIMARY KEY,
        board_state vector(9),
        next_move vector(9),
        result TEXT,
        algorithm_used TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Convert board state to vector
function boardToVector(board) {
  // Ensure board is an array
  const boardArray = Array.isArray(board) ? board : [];
  
  // Convert to vector format for PostgreSQL
  const vectorValues = boardArray.map(cell => {
    if (cell === 'X' || cell === 1) return 1;
    if (cell === 'O' || cell === -1) return -1;
    return 0;
  });
  
  // Return as a properly formatted vector string
  return `[${vectorValues.join(',')}]`;
}

// Algorithm-based prediction functions
function bfsPredictNextMove(board) {
  // BFS to find the best move
  const queue = [];
  const visited = new Set();
  
  // Find all empty cells
  const emptyCells = board.reduce((acc, cell, index) => {
    if (cell === null) acc.push(index);
    return acc;
  }, []);
  
  // Try each empty cell
  for (const cell of emptyCells) {
    const newBoard = [...board];
    newBoard[cell] = getCurrentPlayer(board);
    
    // Check if this move leads to a win
    if (checkWinner(newBoard) === getCurrentPlayer(board)) {
      return {
        prediction: cell,
        confidence: 'win'
      };
    }
    
    queue.push(newBoard);
    visited.add(newBoard.join(','));
  }
  
  // If no winning move, find the best defensive move
  for (const cell of emptyCells) {
    const newBoard = [...board];
    newBoard[cell] = getOpponentPlayer(board);
    
    // Check if this move blocks opponent's win
    if (checkWinner(newBoard) === getOpponentPlayer(board)) {
      return {
        prediction: cell,
        confidence: 'block'
      };
    }
  }
  
  // If no winning or blocking move, choose center or corners
  if (board[4] === null) {
    return {
      prediction: 4,
      confidence: 'center'
    };
  }
  
  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter(i => board[i] === null);
  
  if (availableCorners.length > 0) {
    return {
      prediction: availableCorners[0],
      confidence: 'corner'
    };
  }
  
  // Default to first available move
  return {
    prediction: emptyCells[0],
    confidence: 'default'
  };
}

function dfsPredictNextMove(board) {
  // DFS to find the best move
  const emptyCells = board.reduce((acc, cell, index) => {
    if (cell === null) acc.push(index);
    return acc;
  }, []);
  
  // Try each empty cell
  for (const cell of emptyCells) {
    const newBoard = [...board];
    newBoard[cell] = getCurrentPlayer(board);
    
    // Check if this move leads to a win
    if (checkWinner(newBoard) === getCurrentPlayer(board)) {
      return {
        prediction: cell,
        confidence: 'win'
      };
    }
  }
  
  // If no winning move, find the best defensive move
  for (const cell of emptyCells) {
    const newBoard = [...board];
    newBoard[cell] = getOpponentPlayer(board);
    
    // Check if this move blocks opponent's win
    if (checkWinner(newBoard) === getOpponentPlayer(board)) {
      return {
        prediction: cell,
        confidence: 'block'
      };
    }
  }
  
  // If no winning or blocking move, choose center or corners
  if (board[4] === null) {
    return {
      prediction: 4,
      confidence: 'center'
    };
  }
  
  const corners = [0, 2, 6, 8];
  const availableCorners = corners.filter(i => board[i] === null);
  
  if (availableCorners.length > 0) {
    return {
      prediction: availableCorners[0],
      confidence: 'corner'
    };
  }
  
  // Default to first available move
  return {
    prediction: emptyCells[0],
    confidence: 'default'
  };
}

function nQueensPredictNextMove(board) {
  // N-Queens inspired approach - find the most "protected" position
  const emptyCells = board.reduce((acc, cell, index) => {
    if (cell === null) acc.push(index);
    return acc;
  }, []);
  
  // Score each empty cell based on "protection" (similar to N-Queens)
  const scores = emptyCells.map(cell => {
    let score = 0;
    
    // Check rows, columns, and diagonals
    const row = Math.floor(cell / 3);
    const col = cell % 3;
    
    // Row protection
    for (let i = 0; i < 9; i++) {
      if (i !== cell && Math.floor(i / 3) === row && board[i] === getCurrentPlayer(board)) {
        score += 2;
      }
    }
    
    // Column protection
    for (let i = 0; i < 9; i++) {
      if (i !== cell && i % 3 === col && board[i] === getCurrentPlayer(board)) {
        score += 2;
      }
    }
    
    // Diagonal protection
    if (cell % 4 === 0) { // Main diagonal
      for (let i = 0; i < 9; i += 4) {
        if (i !== cell && board[i] === getCurrentPlayer(board)) {
          score += 2;
        }
      }
    }
    
    if (cell % 2 === 0 && cell !== 0 && cell !== 8) { // Other diagonal
      for (let i = 2; i < 7; i += 2) {
        if (i !== cell && board[i] === getCurrentPlayer(board)) {
          score += 2;
        }
      }
    }
    
    // Prefer center and corners
    if (cell === 4) score += 3;
    if ([0, 2, 6, 8].includes(cell)) score += 2;
    
    return { cell, score };
  });
  
  // Sort by score and return the best move
  scores.sort((a, b) => b.score - a.score);
  
  return {
    prediction: scores[0].cell,
    confidence: scores[0].score > 5 ? 'strategic' : 'default'
  };
}

// Helper functions for algorithm predictions
function getCurrentPlayer(board) {
  const xCount = board.filter(cell => cell === 'X').length;
  const oCount = board.filter(cell => cell === 'O').length;
  return xCount <= oCount ? 'X' : 'O';
}

function getOpponentPlayer(board) {
  return getCurrentPlayer(board) === 'X' ? 'O' : 'X';
}

// AI prediction using algorithms and pgvector
async function predictNextMove(board) {
  try {
    // First try to find a similar game state in the database
    const boardVector = boardToVector(board);
    const result = await pool.query(
      `SELECT next_move, result, algorithm_used 
       FROM vector_embeddings 
       ORDER BY board_state <-> $1::vector 
       LIMIT 1`,
      [boardVector]
    );
    
    if (result.rows.length > 0) {
      // Convert the vector string back to an array
      const nextMoveStr = result.rows[0].next_move;
      const nextMoveArray = nextMoveStr
        .replace(/[\[\]]/g, '')
        .split(',')
        .map(Number);
      
      // Find the suggested move (index of 1 in the prediction vector)
      const suggestedMove = nextMoveArray.indexOf(1);
      
      if (suggestedMove !== -1) {
        return {
          prediction: suggestedMove,
          confidence: result.rows[0].result,
          source: result.rows[0].algorithm_used || 'database'
        };
      }
    }
    
    // If no database prediction, use algorithm-based prediction
    const algorithms = [
      { name: 'BFS', fn: bfsPredictNextMove },
      { name: 'DFS', fn: dfsPredictNextMove },
      { name: 'N-Queens', fn: nQueensPredictNextMove }
    ];
    
    // Choose a random algorithm for variety
    const selectedAlgorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
    const algorithmPrediction = selectedAlgorithm.fn(board);
    
    // Ensure we have a valid prediction before returning
    if (algorithmPrediction && typeof algorithmPrediction.prediction === 'number') {
      return {
        prediction: algorithmPrediction.prediction,
        confidence: algorithmPrediction.confidence || 'default',
        source: selectedAlgorithm.name
      };
    }
    
    // If no valid prediction, return null
    return null;
  } catch (error) {
    console.error('Prediction error:', error);
    return null;
  }
}

// Store game state in database
async function storeGameState(board, prediction, result) {
  try {
    // Create a prediction vector for the next move
    const predictionVector = Array(9).fill(0);
    if (prediction && typeof prediction.prediction === 'number') {
      predictionVector[prediction.prediction] = 1;
    }
    
    await pool.query(
      `INSERT INTO vector_embeddings (board_state, next_move, result, algorithm_used) 
       VALUES ($1::vector, $2::vector, $3, $4)`,
      [
        boardToVector(board),
        boardToVector(predictionVector),
        result || 'draw',
        prediction?.source || 'unknown'
      ]
    );
  } catch (error) {
    console.error('Error storing game state:', error);
  }
}

// Create a new game room
function createGameRoom(roomId) {
  return {
    id: roomId,
    board: Array(9).fill(null),
    currentPlayer: 'X',
    players: new Set(),
    scores: { X: 0, O: 0 },
    moveHistory: []
  };
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join game room
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    
    // Create room if it doesn't exist
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, createGameRoom(roomId));
    }
    
    const room = gameRooms.get(roomId);
    room.players.add(socket.id);
    
    // Notify room of new player
    io.to(roomId).emit('playerJoined', {
      playerId: socket.id,
      playerCount: room.players.size,
      currentPlayer: room.currentPlayer,
      board: room.board,
      scores: room.scores
    });
  });

  // Make a move
  socket.on('makeMove', async (data) => {
    const { roomId, position } = data;
    const room = gameRooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Validate move
    if (room.board[position] || isGameOver(room.board)) {
      socket.emit('invalidMove', { message: 'Invalid move' });
      return;
    }
    
    // Make the move
    room.board[position] = room.currentPlayer;
    room.moveHistory.push({
      position,
      player: room.currentPlayer,
      timestamp: new Date()
    });
    
    // Get AI prediction
    const prediction = await predictNextMove(room.board);
    
    // Broadcast the move and prediction
    io.to(roomId).emit('moveMade', {
      position,
      player: room.currentPlayer,
      board: room.board,
      moveHistory: room.moveHistory
    });
    
    if (prediction) {
      io.to(roomId).emit('prediction', {
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        source: prediction.source
      });
    }
    
    // Check for game over
    if (isGameOver(room.board)) {
      const winner = checkWinner(room.board);
      if (winner) {
        room.scores[winner]++;
      }
      
      io.to(roomId).emit('gameOver', { 
        winner,
        scores: room.scores
      });
      
      // Store game state in database
      await storeGameState(room.board, prediction, winner);
    } else {
      // Switch players
      room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';
      io.to(roomId).emit('playerTurn', {
        currentPlayer: room.currentPlayer
      });
    }
  });

  // Reset board
  socket.on('resetBoard', (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.board = Array(9).fill(null);
      room.currentPlayer = 'X';
      room.moveHistory = [];
      io.to(roomId).emit('boardReset', {
        board: room.board,
        currentPlayer: room.currentPlayer
      });
    }
  });

  // New game
  socket.on('newGame', (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.board = Array(9).fill(null);
      room.currentPlayer = 'X';
      room.moveHistory = [];
      io.to(roomId).emit('gameStarted', {
        board: room.board,
        currentPlayer: room.currentPlayer,
        scores: room.scores
      });
    }
  });

  // Leave room
  socket.on('leaveRoom', (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.players.delete(socket.id);
      if (room.players.size === 0) {
        gameRooms.delete(roomId);
      } else {
        io.to(roomId).emit('playerLeft', {
          playerId: socket.id,
          playerCount: room.players.size
        });
      }
    }
    socket.leave(roomId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove player from all rooms
    for (const [roomId, room] of gameRooms.entries()) {
      if (room.players.has(socket.id)) {
        room.players.delete(socket.id);
        if (room.players.size === 0) {
          gameRooms.delete(roomId);
        } else {
          io.to(roomId).emit('playerLeft', {
            playerId: socket.id,
            playerCount: room.players.size
          });
        }
      }
    }
  });
});

// Helper functions
function isGameOver(board) {
  return checkWinner(board) || board.every(cell => cell !== null);
}

function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Initialize database and start server
const PORT = process.env.PORT || 3001;
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running : http://localhost:${PORT}`);
  });
}); 