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

// Player data storage
const playerData = new Map();

// League tiers
const LEAGUE_TIERS = {
  BRONZE: { min: 0, max: 1000 },
  SILVER: { min: 1001, max: 2000 },
  GOLD: { min: 2001, max: 3000 },
  PLATINUM: { min: 3001, max: 4000 },
  DIAMOND: { min: 4001, max: 5000 }
};

// Helper function to find a random empty cell
function findRandomEmptyCell(board) {
    const emptyCells = board.reduce((acc, cell, index) => {
        if (cell === '') acc.push(index);
        return acc;
    }, []);
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

// Initialize database tables
async function initializeDatabase() {
    try {
        // Drop all existing tables
        await pool.query(`
            DROP TABLE IF EXISTS game_states CASCADE;
            DROP TABLE IF EXISTS player_profiles CASCADE;
        `);
        
        // Create player_profiles table
        await pool.query(`
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
        `);

        // Create game_states table for storing board states and moves
        await pool.query(`
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
        `);

        // Create indexes for better query performance
        await pool.query(`
            CREATE INDEX idx_game_states_player_fingerprint ON game_states(player_fingerprint);
            CREATE INDEX idx_game_states_skill_level ON game_states(skill_level);
            CREATE INDEX idx_game_states_created_at ON game_states(created_at);
        `);

        // Ensure system player exists
        await pool.query(`
            INSERT INTO player_profiles (fingerprint, ip_address, skill_level)
            VALUES ('system', '127.0.0.1', 1000)
            ON CONFLICT (fingerprint) DO NOTHING;
        `);

        console.log('Database tables initialized successfully');
        
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Generate synthetic game history for AI predictions
async function generateSyntheticGameHistory() {
    try {
        console.log('Generating synthetic game history...');
        
        // Create synthetic players with different skill levels
        const players = [];
        const skillLevels = [800, 1000, 1200, 1500, 1800, 2000, 2200, 2500];
        
        for (let i = 0; i < 20; i++) {
            const fingerprint = `player_${i}`;
            const skillLevel = skillLevels[Math.floor(Math.random() * skillLevels.length)];
            
            // Insert player profile
            await pool.query(
                `INSERT INTO player_profiles (fingerprint, ip_address, skill_level)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (fingerprint) DO NOTHING`,
                [fingerprint, `192.168.1.${i}`, skillLevel]
            );
            
            players.push({ fingerprint, skillLevel });
        }
        
        // Generate 1000+ synthetic games
        const numGames = 1000;
        const algorithms = ['minimax', 'historical', 'random'];
        
        for (let gameId = 0; gameId < numGames; gameId++) {
            // Select random players
            const player1 = players[Math.floor(Math.random() * players.length)];
            const player2 = players[Math.floor(Math.random() * players.length)];
            
            // Skip if players are not properly defined
            if (!player1 || !player2) {
                console.error('Invalid player selection, skipping game');
                continue;
            }
            
            // Simulate a game
            let board = Array(9).fill('');
            let currentPlayer = 'X';
            let moveNumber = 0;
            let winner = null;
            
            while (!isGameOver(board) && moveNumber < 9) {
                const playerFingerprint = currentPlayer === 'X' ? player1.fingerprint : player2.fingerprint;
                const playerSkillLevel = currentPlayer === 'X' ? player1.skillLevel : player2.skillLevel;
                
                // Choose an algorithm based on player skill
                const algorithm = algorithms[Math.floor(Math.random() * algorithms.length)];
                
                // Get prediction based on algorithm
                let prediction;
                if (algorithm === 'minimax') {
                    prediction = GameAlgorithms.minimax([...board], playerSkillLevel);
                } else if (algorithm === 'historical') {
                    prediction = { prediction: findRandomEmptyCell(board), confidence: 0.7, source: 'historical' };
                } else {
                    prediction = { prediction: findRandomEmptyCell(board), confidence: 0.3, source: 'random' };
                }
                
                // Make the move
                const position = prediction.prediction;
                if (position >= 0 && position < 9 && board[position] === '') {
                    board[position] = currentPlayer;
                    
                    // Store the move
                    await storeGameState(
                        board, 
                        prediction, 
                        null, 
                        playerFingerprint, 
                        `192.168.1.${Math.floor(Math.random() * 255)}`, 
                        playerSkillLevel, 
                        moveNumber, 
                        `synthetic_${gameId}`
                    );
                    
                    // Check for winner
                    if (checkWinner(board) === currentPlayer) {
                        winner = currentPlayer;
                        break;
                    }
                    
                    // Switch players
                    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                    moveNumber++;
                } else {
                    // Invalid move, try again with a random empty cell
                    const randomPosition = findRandomEmptyCell(board);
                    if (randomPosition >= 0) {
                        board[randomPosition] = currentPlayer;
                        
                        // Store the move
                        await storeGameState(
                            board, 
                            { prediction: randomPosition, confidence: 0.1, source: 'fallback' }, 
                            null, 
                            playerFingerprint, 
                            `192.168.1.${Math.floor(Math.random() * 255)}`, 
                            playerSkillLevel, 
                            moveNumber, 
                            `synthetic_${gameId}`
                        );
                        
                        // Check for winner
                        if (checkWinner(board) === currentPlayer) {
                            winner = currentPlayer;
                            break;
                        }
                        
                        // Switch players
                        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                        moveNumber++;
                    } else {
                        // No empty cells, game is a draw
                        break;
                    }
                }
            }
            
            // Store final game result
            if (winner) {
                const winnerFingerprint = winner === 'X' ? player1.fingerprint : player2.fingerprint;
                const winnerSkillLevel = winner === 'X' ? player1.skillLevel : player2.skillLevel;
                
                await storeGameState(
                    board, 
                    null, 
                    'win', 
                    winnerFingerprint, 
                    `192.168.1.${Math.floor(Math.random() * 255)}`, 
                    winnerSkillLevel, 
                    moveNumber, 
                    `synthetic_${gameId}`
                );
                
                // Update player stats
                await updatePlayerStats(winnerFingerprint, 'win');
                
                const loserFingerprint = winner === 'X' ? player2.fingerprint : player1.fingerprint;
                await updatePlayerStats(loserFingerprint, 'lose');
            } else {
                // Game is a draw
                await storeGameState(
                    board, 
                    null, 
                    'draw', 
                    player1.fingerprint, 
                    `192.168.1.${Math.floor(Math.random() * 255)}`, 
                    player1.skillLevel, 
                    moveNumber, 
                    `synthetic_${gameId}`
                );
                
                // Update player stats
                await updatePlayerStats(player1.fingerprint, 'draw');
                await updatePlayerStats(player2.fingerprint, 'draw');
            }
            
            // Log progress
            if (gameId % 100 === 0) {
                console.log(`Generated ${gameId} synthetic games`);
            }
        }
        
        console.log(`Generated ${numGames} synthetic games successfully`);
    } catch (error) {
        console.error('Error generating synthetic game history:', error);
    }
}

// Convert board state to vector format
function boardToVector(board) {
    return board.map(cell => {
        if (cell === 'X') return 1;
        if (cell === 'O') return -1;
        return 0;  // Convert null or empty cells to 0
    });
}

// Algorithm-based prediction functions
function bfsPredictNextMove(board) {
  try {
    // BFS to find the best move
    const queue = [];
    const visited = new Set();
    
    // Find all empty cells
    const emptyCells = board.reduce((acc, cell, index) => {
      if (cell === null) acc.push(index);
      return acc;
    }, []);
    
    if (emptyCells.length === 0) {
      return { prediction: -1, confidence: 'default' };
    }
    
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
  } catch (error) {
    console.error('BFS prediction error:', error);
    return { prediction: -1, confidence: 'default' };
  }
}

function dfsPredictNextMove(board) {
  try {
    // DFS to find the best move
    const emptyCells = board.reduce((acc, cell, index) => {
      if (cell === null) acc.push(index);
      return acc;
    }, []);
    
    if (emptyCells.length === 0) {
      return { prediction: -1, confidence: 'default' };
    }
    
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
  } catch (error) {
    console.error('DFS prediction error:', error);
    return { prediction: -1, confidence: 'default' };
  }
}

function nQueensPredictNextMove(board) {
  try {
    // N-Queens inspired approach - find the most "protected" position
    const emptyCells = board.reduce((acc, cell, index) => {
      if (cell === null) acc.push(index);
      return acc;
    }, []);
    
    if (emptyCells.length === 0) {
      return { prediction: -1, confidence: 'default' };
    }
    
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
  } catch (error) {
    console.error('N-Queens prediction error:', error);
    return { prediction: -1, confidence: 'default' };
  }
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

// Handle player data
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
    const prediction = await predictNextMove(room.board, null, null);
    
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
      await storeGameState(room.board, prediction, winner, null, null, null, null, null);
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

  // Handle player data
  socket.on('playerData', async (data) => {
    const { fingerprint, ipAddress } = data;
    
    try {
      // Check if player exists in database
      const result = await pool.query(
        'SELECT * FROM player_profiles WHERE fingerprint = $1',
        [fingerprint]
      );
      
      if (result.rows.length === 0) {
        // Create new player profile
        await pool.query(
          `INSERT INTO player_profiles 
           (fingerprint, ip_address, skill_level, games_played, wins, losses, draws)
           VALUES ($1, $2, 1000, 0, 0, 0, 0)`,
          [fingerprint, ipAddress]
        );
      }
      
      // Store player data in memory
      playerData.set(socket.id, { fingerprint, ipAddress });
      
    } catch (error) {
      console.error('Error handling player data:', error);
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

// Update player stats in database
async function updatePlayerStats(fingerprint, result) {
    try {
        // Skip if fingerprint is not provided
        if (!fingerprint || fingerprint === 'unknown') {
            console.log('Skipping player stats update: Invalid fingerprint');
            return;
        }

        const resultMap = {
            'win': { wins: 1, losses: 0, draws: 0 },
            'lose': { wins: 0, losses: 1, draws: 0 },
            'draw': { wins: 0, losses: 0, draws: 1 }
        };

        const stats = resultMap[result] || { wins: 0, losses: 0, draws: 0 };

        // Calculate new skill level based on result
        const skillChange = result === 'win' ? 25 : result === 'lose' ? -25 : 0;

        // First check if player exists
        const playerCheck = await pool.query(
            'SELECT fingerprint FROM player_profiles WHERE fingerprint = $1',
            [fingerprint]
        );

        if (playerCheck.rows.length === 0) {
            // Create player if doesn't exist
            await pool.query(
                `INSERT INTO player_profiles (fingerprint, ip_address, skill_level)
                 VALUES ($1, $2, $3)`,
                [fingerprint, 'unknown', 1000]
            );
            console.log(`Created new player profile for ${fingerprint}`);
        }

        // Now update the stats
        await pool.query(
            `UPDATE player_profiles 
             SET games_played = games_played + 1,
                 wins = wins + $1,
                 losses = losses + $2,
                 draws = draws + $3,
                 skill_level = skill_level + $4,
                 last_played = CURRENT_TIMESTAMP
             WHERE fingerprint = $5
             RETURNING skill_level`,
            [stats.wins, stats.losses, stats.draws, skillChange, fingerprint]
        );

        console.log(`Updated player stats for ${fingerprint}: ${result}`);
    } catch (error) {
        console.error('Error updating player stats:', error);
    }
}

// Get player's league tier
function getLeagueTier(skillLevel) {
  for (const [tier, range] of Object.entries(LEAGUE_TIERS)) {
    if (skillLevel >= range.min && skillLevel <= range.max) {
      return tier;
    }
  }
  return 'BRONZE'; // Default tier
}

// Enhanced prediction function
async function predictNextMove(board, playerFingerprint) {
  try {
    // Get player's skill level
    const playerResult = await pool.query(
      'SELECT skill_level FROM player_profiles WHERE fingerprint = $1',
      [playerFingerprint]
    );
    
    const skillLevel = playerResult.rows[0]?.skill_level || 1000;
    const leagueTier = getLeagueTier(skillLevel);
    
    // Convert board state to vector format and join as a string
    const boardVector = board.map(cell => {
      if (cell === 'X') return 1;
      if (cell === 'O') return -1;
      return 0;
    }).join(',');

    // Find similar game states from players in the same league
    const similarStates = await pool.query(
      `SELECT board_state, next_move, result 
       FROM vector_embeddings 
       WHERE player_skill_level BETWEEN $1 AND $2
       ORDER BY similarity(board_state, $3::vector) DESC
       LIMIT 5`,
      [skillLevel - 200, skillLevel + 200, `[${boardVector}]`]
    );
    
    if (similarStates.rows.length > 0) {
      // Calculate weighted prediction
      const predictions = similarStates.rows.map(row => ({
        move: row.next_move,
        weight: row.result === 'win' ? 1.5 : 1.0
      }));
      
      // Select best move based on weights
      const bestMove = predictions.reduce((best, current) => 
        current.weight > best.weight ? current : best
      );
      
      return {
        prediction: bestMove.move,
        confidence: bestMove.weight,
        algorithm: 'historical_data',
        leagueTier
      };
    }
    
    // Fallback to algorithm-based prediction
    const algorithm = skillLevel > 3000 ? 'nQueens' : 
                     skillLevel > 2000 ? 'bfs' : 'dfs';
    
    const prediction = await getAlgorithmPrediction(board, algorithm);
    return {
      ...prediction,
      leagueTier
    };
    
  } catch (error) {
    console.error('Error in prediction:', error);
    return {
      prediction: findRandomEmptyCell(board),
      confidence: 0.5,
      algorithm: 'fallback',
      leagueTier: 'BRONZE'
    };
  }
}

// Get algorithm-based prediction
async function getAlgorithmPrediction(board, algorithm) {
  try {
    let prediction;
    
    switch (algorithm) {
      case 'nQueens':
        prediction = nQueensPredictNextMove(board);
        break;
      case 'bfs':
        prediction = bfsPredictNextMove(board);
        break;
      case 'dfs':
        prediction = dfsPredictNextMove(board);
        break;
      default:
        prediction = {
          prediction: findRandomEmptyCell(board),
          confidence: 0.5,
          algorithm: 'random'
        };
    }
    
    return {
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      algorithm: algorithm
    };
  } catch (error) {
    console.error('Error in algorithm prediction:', error);
    return {
      prediction: findRandomEmptyCell(board),
      confidence: 0.5,
      algorithm: 'fallback'
    };
  }
}

// Store game state in database
async function storeGameState(boardState, nextMove, result, playerFingerprint, skillLevel, algorithm) {
    try {
        // Convert board state to vector format and join as a string
        const boardVector = boardState.map(cell => {
            if (cell === 'X') return 1;
            if (cell === 'O') return -1;
            return 0;
        }).join(',');

        // Convert next move to vector format and join as a string
        const moveVector = Array(9).fill(0);
        if (nextMove !== null) {
            moveVector[nextMove] = 1;
        }
        const moveVectorStr = moveVector.join(',');

        // Use system fingerprint if playerFingerprint is null or undefined
        const fingerprint = playerFingerprint || 'system';

        // Ensure player profile exists
        const playerCheck = await pool.query(
            'SELECT fingerprint FROM player_profiles WHERE fingerprint = $1',
            [fingerprint]
        );

        if (playerCheck.rows.length === 0) {
            // Create player profile if it doesn't exist
            await pool.query(
                `INSERT INTO player_profiles (fingerprint, ip_address, skill_level)
                 VALUES ($1, $2, $3)`,
                [fingerprint, 'unknown', skillLevel || 1000]
            );
            console.log(`Created new player profile for ${fingerprint}`);
        }

        // Store game state with properly formatted vectors
        await pool.query(
            `INSERT INTO game_states (board_state, next_move, result, player_fingerprint, skill_level, algorithm)
             VALUES ('[${boardVector}]'::vector, '[${moveVectorStr}]'::vector, $1, $2, $3, $4)`,
            [result, fingerprint, skillLevel, algorithm]
        );
        console.log('Game state stored successfully');
    } catch (error) {
        console.error('Error storing game state:', error);
        throw error;
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

// Initialize database and start server
const PORT = process.env.PORT || 3001;
initializeDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running : http://localhost:${PORT}`);
  });
}); 