const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const pgSession = require('connect-pg-simple')(session);
const crypto = require("crypto");
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "ai_project",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5434,
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Session configuration
const sessionMiddleware = session({
  store: new pgSession({
    pool: pool,
    tableName: 'user_sessions',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  name: 'userId'
});

// Apply session middleware
app.use(sessionMiddleware);

// Share session with Socket.IO
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

const gameRooms = new Map();

const LEAGUE_TIERS = {
  BRONZE: { min: 0, max: 1000 },
  SILVER: { min: 1001, max: 2000 },
  GOLD: { min: 2001, max: 3000 },
  PLATINUM: { min: 3001, max: 4000 },
  DIAMOND: { min: 4001, max: 5000 },
};

function findRandomEmptyCell(board) {
  const emptyCells = board.reduce((acc, cell, index) => {
    if (cell === "") acc.push(index);
    return acc;
  }, []);
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}


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
      return { prediction: -1, confidence: "default" };
    }

    // Try each empty cell
    for (const cell of emptyCells) {
      const newBoard = [...board];
      newBoard[cell] = getCurrentPlayer(board);

      // Check if this move leads to a win
      if (checkWinner(newBoard) === getCurrentPlayer(board)) {
        return {
          prediction: cell,
          confidence: "win",
        };
      }

      queue.push(newBoard);
      visited.add(newBoard.join(","));
    }

    // If no winning move, find the best defensive move
    for (const cell of emptyCells) {
      const newBoard = [...board];
      newBoard[cell] = getOpponentPlayer(board);

      // Check if this move blocks opponent's win
      if (checkWinner(newBoard) === getOpponentPlayer(board)) {
        return {
          prediction: cell,
          confidence: "block",
        };
      }
    }

    // If no winning or blocking move, choose center or corners
    if (board[4] === null) {
      return {
        prediction: 4,
        confidence: "center",
      };
    }

    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter((i) => board[i] === null);

    if (availableCorners.length > 0) {
      return {
        prediction: availableCorners[0],
        confidence: "corner",
      };
    }

    // Default to first available move
    return {
      prediction: emptyCells[0],
      confidence: "default",
    };
  } catch (error) {
    console.error("BFS prediction error:", error);
    return { prediction: -1, confidence: "default" };
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
      return { prediction: -1, confidence: "default" };
    }

    // Try each empty cell
    for (const cell of emptyCells) {
      const newBoard = [...board];
      newBoard[cell] = getCurrentPlayer(board);

      // Check if this move leads to a win
      if (checkWinner(newBoard) === getCurrentPlayer(board)) {
        return {
          prediction: cell,
          confidence: "win",
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
          confidence: "block",
        };
      }
    }

    // If no winning or blocking move, choose center or corners
    if (board[4] === null) {
      return {
        prediction: 4,
        confidence: "center",
      };
    }

    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter((i) => board[i] === null);

    if (availableCorners.length > 0) {
      return {
        prediction: availableCorners[0],
        confidence: "corner",
      };
    }

    // Default to first available move
    return {
      prediction: emptyCells[0],
      confidence: "default",
    };
  } catch (error) {
    console.error("DFS prediction error:", error);
    return { prediction: -1, confidence: "default" };
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
      return { prediction: -1, confidence: "default" };
    }

    // Score each empty cell based on "protection" (similar to N-Queens)
    const scores = emptyCells.map((cell) => {
      let score = 0;

      // Check rows, columns, and diagonals
      const row = Math.floor(cell / 3);
      const col = cell % 3;

      // Row protection
      for (let i = 0; i < 9; i++) {
        if (
          i !== cell &&
          Math.floor(i / 3) === row &&
          board[i] === getCurrentPlayer(board)
        ) {
          score += 2;
        }
      }

      // Column protection
      for (let i = 0; i < 9; i++) {
        if (
          i !== cell &&
          i % 3 === col &&
          board[i] === getCurrentPlayer(board)
        ) {
          score += 2;
        }
      }

      // Diagonal protection
      if (cell % 4 === 0) {
        // Main diagonal
        for (let i = 0; i < 9; i += 4) {
          if (i !== cell && board[i] === getCurrentPlayer(board)) {
            score += 2;
          }
        }
      }

      if (cell % 2 === 0 && cell !== 0 && cell !== 8) {
        // Other diagonal
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
      confidence: scores[0].score > 5 ? "strategic" : "default",
    };
  } catch (error) {
    console.error("N-Queens prediction error:", error);
    return { prediction: -1, confidence: "default" };
  }
}

function getCurrentPlayer(board) {
  const xCount = board.filter((cell) => cell === "X").length;
  const oCount = board.filter((cell) => cell === "O").length;
  return xCount <= oCount ? "X" : "O";
}

function getOpponentPlayer(board) {
  return getCurrentPlayer(board) === "X" ? "O" : "X";
}

io.on("connection", (socket) => {
  const session = socket.request.session;
  const userId = session?.userId;

  if (!userId) {
    console.log("No authenticated user found");
    socket.disconnect();
    return;
  }

  console.log("User connected:", userId);

  socket.on("playerData", async (data) => {
    try {
      const session = socket.request.session;

      if (!session?.userId) {
        socket.emit("error", { message: "Please sign in to play" });
        return;
      }

      // First check if player exists
      const playerExists = await pool.query(
        "SELECT id, username, display_name FROM player_profiles WHERE id = $1",
        [session.userId]
      );

      if (playerExists.rows.length === 0) {
        socket.emit("error", { message: "Player profile not found" });
        return;
      }

      // Store socket connection
      await pool.query(
        `INSERT INTO player_sockets (socket_id, player_id) 
         VALUES ($1, $2) 
         ON CONFLICT (socket_id) 
         DO UPDATE SET 
           player_id = EXCLUDED.player_id,
           last_active = NOW()`,
        [socket.id, session.userId]
      );

      // Return player data
      socket.emit("playerDataResponse", {
        success: true,
        player: playerExists.rows[0]
      });

      console.log("Player data stored successfully:", {
        socketId: socket.id,
        playerId: session.userId,
        username: playerExists.rows[0].username
      });

    } catch (error) {
      console.error("Error handling player data:", error);
      socket.emit("error", { message: "Error processing player data" });
    }
  });

  socket.on("joinRoom", async (roomId) => {
    const session = socket.request.session?.userId;
    if (!session) {
      socket.emit("error", { message: "Please sign in to play" });
      return;
    }

    socket.join(roomId);

    // Create room if it doesn't exist
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, createGameRoom(roomId));
    }

    const room = gameRooms.get(roomId);

    // Check if room is full (max 2 players)
    if (room.players.size >= 2) {
        socket.emit("error", {
        message: "Room is full. Maximum 2 players allowed.",
        });
      socket.leave(roomId);
        return;
      }

    room.players.add(socket.id);

    // Assign player to X or O
    if (room.playerX === null) {
      room.playerX = socket.id;
    } else if (room.playerO === null) {
      room.playerO = socket.id;
    }

    // Get player display names
    let playerXName = "Player X";
    let playerOName = "Player O";

    try {
      // Get player X's display name
      if (room.playerX) {
        const xResult = await pool.query(
          `SELECT p.display_name 
           FROM player_profiles p
           JOIN player_sockets s ON p.id = s.player_id
           WHERE s.socket_id = $1`,
          [room.playerX]
        );
        if (xResult.rows.length > 0) {
          playerXName = xResult.rows[0].display_name;
        }
      }

      // Get player O's display name
      if (room.playerO) {
        const oResult = await pool.query(
          `SELECT p.display_name 
           FROM player_profiles p
           JOIN player_sockets s ON p.id = s.player_id
           WHERE s.socket_id = $1`,
          [room.playerO]
        );
        if (oResult.rows.length > 0) {
          playerOName = oResult.rows[0].display_name;
        }
      }
    } catch (error) {
      console.error("Error fetching player names:", error);
    }

    // Notify room of new player
    io.to(roomId).emit("playerJoined", {
      playerId: socket.id,
      playerCount: room.players.size,
      currentPlayer: room.currentPlayer,
      board: room.board,
      scores: room.scores,
      playerX: room.playerX,
      playerO: room.playerO,
      playerXName,
      playerOName
    });
  });

  // Make a move
  socket.on("makeMove", async (data) => {
    // Check authentication
    const session = socket.request.session;
    if (!session?.userId) {
      socket.emit("error", { message: "Please sign in to play" });
        return;
      }

    const { roomId, position } = data;
    const room = gameRooms.get(roomId);
    
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Check if it's the player's turn
    const isPlayerX = room.playerX === socket.id;
    const isPlayerO = room.playerO === socket.id;
    
    if ((room.currentPlayer === "X" && !isPlayerX) || 
        (room.currentPlayer === "O" && !isPlayerO)) {
      socket.emit("error", { message: "Not your turn!" });
      return;
    }

    // Validate move
    if (room.board[position] || isGameOver(room.board)) {
      socket.emit("invalidMove", { message: "Invalid move" });
      return;
    }

    // Get player names
    let playerXName = "Player X";
    let playerOName = "Player O";
    
    try {
      if (room.playerX) {
        const xResult = await pool.query(
          `SELECT p.display_name 
           FROM player_profiles p
           JOIN player_sockets s ON p.id = s.player_id
           WHERE s.socket_id = $1`,
          [room.playerX]
        );
        if (xResult.rows.length > 0) {
          playerXName = xResult.rows[0].display_name;
        }
      }

      if (room.playerO) {
        const oResult = await pool.query(
          `SELECT p.display_name 
           FROM player_profiles p
           JOIN player_sockets s ON p.id = s.player_id
           WHERE s.socket_id = $1`,
          [room.playerO]
        );
        if (oResult.rows.length > 0) {
          playerOName = oResult.rows[0].display_name;
        }
      }
    } catch (error) {
      console.error("Error fetching player names:", error);
    }

    // Make the move
    room.board[position] = room.currentPlayer;
    room.moveHistory.push({
      position,
      player: room.currentPlayer,
      timestamp: new Date(),
    });

    // Get AI prediction
    const prediction = await predictNextMove(room.board, socket.id);

    // Broadcast the move and prediction
    io.to(roomId).emit("moveMade", {
      position,
      player: room.currentPlayer,
      board: room.board,
      moveHistory: room.moveHistory,
      playerXName,
      playerOName
    });

    if (prediction) {
      io.to(roomId).emit("prediction", {
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        source: prediction.source,
      });
    }

    // Check for game over
    if (isGameOver(room.board)) {
      const winner = checkWinner(room.board);
      if (winner) {
        room.scores[winner]++;
      }

      // Emit game over with player names
      io.to(roomId).emit("gameOver", {
        winner,
        scores: room.scores,
        playerXName,
        playerOName
      });

      // Store game state in database
      await storeGameState(
        room.board,
        prediction,
        winner ? 'win' : 'draw',
        session.userId,
        roomId,
        prediction?.algorithm || 'default',
        room.scores,
        room
      );

      // Get player IDs from socket connections
      const xPlayerResult = await pool.query(
        `SELECT p.id 
         FROM player_profiles p
         JOIN player_sockets s ON p.id = s.player_id
         WHERE s.socket_id = $1`,
        [room.playerX]
      );
      const oPlayerResult = await pool.query(
        `SELECT p.id 
         FROM player_profiles p
         JOIN player_sockets s ON p.id = s.player_id
         WHERE s.socket_id = $1`,
        [room.playerO]
      );

      const xPlayerId = xPlayerResult.rows[0]?.id;
      const oPlayerId = oPlayerResult.rows[0]?.id;

      // Determine results for each player
      const playerXResult = winner === 'X' ? 'win' : winner === 'O' ? 'loss' : 'draw';
      const playerOResult = winner === 'O' ? 'win' : winner === 'X' ? 'loss' : 'draw';

      // Store game history for both players
      if (xPlayerId) {
        await pool.query(
          `INSERT INTO game_history 
           (player_id, opponent_id, result, score, algorithm)
           VALUES ($1, $2, $3, $4, $5)`,
          [xPlayerId, oPlayerId, playerXResult, `${room.scores.X}-${room.scores.O}`, prediction?.algorithm || 'default']
        );
      }

      if (oPlayerId) {
        await pool.query(
          `INSERT INTO game_history 
           (player_id, opponent_id, result, score, algorithm)
           VALUES ($1, $2, $3, $4, $5)`,
          [oPlayerId, xPlayerId, playerOResult, `${room.scores.X}-${room.scores.O}`, prediction?.algorithm || 'default']
        );
      }
    } else {
      // Switch players
      room.currentPlayer = room.currentPlayer === "X" ? "O" : "X";
      io.to(roomId).emit("playerTurn", {
        currentPlayer: room.currentPlayer,
        currentPlayerName: room.currentPlayer === "X" ? playerXName : playerOName,
        nextPlayerName: room.currentPlayer === "X" ? playerOName : playerXName
      });
    }
  });

  socket.on("resetBoard", (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.board = Array(9).fill(null);
      room.currentPlayer = "X";
      room.moveHistory = [];
      io.to(roomId).emit("boardReset", {
        board: room.board,
        currentPlayer: room.currentPlayer,
      });
    }
  });


  socket.on("newGame", (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.board = Array(9).fill(null);
      room.currentPlayer = "X";
      room.moveHistory = [];
        io.to(roomId).emit("gameStarted", {
        board: room.board,
        currentPlayer: room.currentPlayer,
        scores: room.scores,
      });
    }
  });

  // Leave room
  socket.on("leaveRoom", (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      room.players.delete(socket.id);
      if (room.players.size === 0) {
        gameRooms.delete(roomId);
      } else {
        io.to(roomId).emit("playerLeft", {
          playerId: socket.id,
          playerCount: room.players.size,
        });
      }
    }
    socket.leave(roomId);
  });

  // Disconnect handler
  socket.on("disconnect", async () => {
    try {
      // Remove socket connection
      await pool.query(
        "DELETE FROM player_sockets WHERE socket_id = $1",
        [socket.id]
      );

      // Remove player from all rooms
      for (const [roomId, room] of gameRooms.entries()) {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);
          if (room.playerX === socket.id) room.playerX = null;
          if (room.playerO === socket.id) room.playerO = null;

          if (room.players.size === 0) {
            gameRooms.delete(roomId);
        } else {
          io.to(roomId).emit("playerLeft", {
            playerId: socket.id,
              playerCount: room.players.size,
          });
        }
      }
      }
    } catch (error) {
      console.error("Error handling disconnect:", error);
    }
  });

  // Handle game over
  socket.on("gameOver", async (data) => {
    const { winner, scores, playerXName, playerOName, roomId } = data;
    const room = gameRooms.get(roomId);
    
    if (!room) return;
    
    try {
      // Get player IDs from socket connections
      const xPlayerResult = await pool.query(
        `SELECT p.id 
         FROM player_profiles p
         JOIN player_sockets s ON p.id = s.player_id
         WHERE s.socket_id = $1`,
        [room.playerX]
      );
      const oPlayerResult = await pool.query(
        `SELECT p.id 
         FROM player_profiles p
         JOIN player_sockets s ON p.id = s.player_id
         WHERE s.socket_id = $1`,
        [room.playerO]
      );

      const xPlayerId = xPlayerResult.rows[0]?.id;
      const oPlayerId = oPlayerResult.rows[0]?.id;

      // Determine results for each player
      const playerXResult = winner === 'X' ? 'win' : winner === 'O' ? 'loss' : 'draw';
      const playerOResult = winner === 'O' ? 'win' : winner === 'X' ? 'loss' : 'draw';

      // Store game state
      await pool.query(
        `INSERT INTO game_states 
         (room_id, player_x_id, player_o_id, board_state, winner, player_x_result, player_o_result, final_score, algorithm)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [roomId, xPlayerId, oPlayerId, room.board.join(''), winner, playerXResult, playerOResult, `${scores.X}-${scores.O}`, data.algorithm]
      );

      // Update player statistics and store game history
      if (xPlayerId) {
        // Update player X stats
        await pool.query(
          `UPDATE player_profiles 
           SET games_played = games_played + 1,
               wins = wins + ${playerXResult === 'win' ? 1 : 0},
               losses = losses + ${playerXResult === 'loss' ? 1 : 0},
               draws = draws + ${playerXResult === 'draw' ? 1 : 0},
               last_seen = NOW()
           WHERE id = $1`,
          [xPlayerId]
        );

        // Store game history for player X
        await pool.query(
          `INSERT INTO game_history 
           (player_id, opponent_id, result, score, algorithm)
           VALUES ($1, $2, $3, $4, $5)`,
          [xPlayerId, oPlayerId, playerXResult, `${scores.X}-${scores.O}`, data.algorithm]
        );
      }

      if (oPlayerId) {
        // Update player O stats
        await pool.query(
          `UPDATE player_profiles 
           SET games_played = games_played + 1,
               wins = wins + ${playerOResult === 'win' ? 1 : 0},
               losses = losses + ${playerOResult === 'loss' ? 1 : 0},
               draws = draws + ${playerOResult === 'draw' ? 1 : 0},
               last_seen = NOW()
           WHERE id = $1`,
          [oPlayerId]
        );

        // Store game history for player O
        await pool.query(
          `INSERT INTO game_history 
           (player_id, opponent_id, result, score, algorithm)
           VALUES ($1, $2, $3, $4, $5)`,
          [oPlayerId, xPlayerId, playerOResult, `${scores.X}-${scores.O}`, data.algorithm]
        );
      }

      // Log success
      console.log('Game history stored successfully', {
        xPlayerId,
        oPlayerId,
        winner,
        scores
      });

    } catch (error) {
      console.error("Error updating game statistics:", error);
    }

    io.to(roomId).emit("gameOver", {
      winner,
      scores,
      playerXName,
      playerOName
    });
  });

  // Room Management
  const rooms = new Map();

  socket.on('createRoom', async ({ roomName, roomCode }) => {
    try {
      console.log('Creating room:', { roomName, roomCode, userId });
      
      // Check authentication
      if (!session?.userId) {
        socket.emit('error', { message: 'Please sign in to create a room' });
        return;
      }

      // Check if room code already exists
      if (gameRooms.has(roomCode)) {
        socket.emit('error', { message: 'Room code already exists. Please try again.' });
        return;
      }

      // Create new room
      const room = {
        id: roomCode,
        name: roomCode || 'Game Room',
        type: 'public',
        board: Array(9).fill(null),
        currentPlayer: 'X',
        players: new Set(),
        playerX: null,
        playerO: null,
        scores: { X: 0, O: 0 },
        moveHistory: [],
        createdAt: new Date()
      };

      gameRooms.set(roomCode, room);
      

      socket.join(roomCode);
      
      room.players.add(socket.id);
      room.playerX = socket.id;

      let playerName = "Player X";
      try {
        const result = await pool.query(
          `SELECT p.display_name 
           FROM player_profiles p
           WHERE p.id = $1`,
          [session.userId]
        );
        if (result.rows.length > 0) {
          playerName = result.rows[0].display_name;
        }
      } catch (error) {
        console.error("Error fetching player name:", error);
      }


      socket.emit('roomCreated', {
        roomCode,
        roomName: room.name,
        playerName
      });

      io.emit('roomListUpdated', Array.from(gameRooms.values()));

      console.log('Room created successfully:', {
        roomCode,
        roomName: room.name,
        playerId: session.userId
      });

    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Error creating room' });
    }
  });

  socket.on('joinRoom', (roomCode) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }

    socket.join(roomCode);
    
    const player = {
      id: socket.id,
      name: socket.user?.name || 'Anonymous',
      symbol: 'O'
    };
    room.players.push(player);

    io.to(roomCode).emit('playerJoined', {
      player,
      room: {
        id: room.id,
        name: room.name,
        type: room.type,
        players: room.players
      }
    });

    if (room.players.length === 2) {
      room.gameState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        isDraw: false
      };
      
      io.to(roomCode).emit('gameStarted', {
        gameState: room.gameState,
        players: room.players
      });
    }
  });
});

// Helper functions
function isGameOver(board) {
  return checkWinner(board) || board.every((cell) => cell !== null);
}

function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // Rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // Columns
    [0, 4, 8],
    [2, 4, 6], // Diagonals
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}


function getLeagueTier(skillLevel) {
  for (const [tier, range] of Object.entries(LEAGUE_TIERS)) {
    if (skillLevel >= range.min && skillLevel <= range.max) {
      return tier;
    }
  }
  return "BRONZE";
}


async function storeGameState(boardState, nextMove, result, playerId, roomId, algorithm, scores, room) {
  try {
    const boardStateStr = boardState.map(cell => cell || ' ').join('');

    if (!playerId || !roomId || !scores || !room) {
      console.error("Cannot store game state: playerId, roomId, scores, and room are required");
      return;
    }

    const playerXSkillResult = await pool.query(
      "SELECT skill_level FROM player_profiles WHERE id = $1",
      [room.player_x_id]
    );
    const playerOSkillResult = await pool.query(
      "SELECT skill_level FROM player_profiles WHERE id = $1",
      [room.player_o_id]
    );

    const playerXSkillLevel = playerXSkillResult.rows[0]?.skill_level || 0;
    const playerOSkillLevel = playerOSkillResult.rows[0]?.skill_level || 0;

    const winner = checkWinner(boardState);
    const playerXGameResult = winner === 'X' ? 'win' : winner === 'O' ? 'loss' : 'draw';
    const playerOGameResult = winner === 'O' ? 'win' : winner === 'X' ? 'loss' : 'draw';
    const finalScore = `${scores.X}-${scores.O}`;


    const nextMoveValue = typeof nextMove === 'object' ? nextMove.prediction : nextMove;

    await pool.query(
      `INSERT INTO game_states 
       (board_state, next_move, result, player_id, skill_level, algorithm, room_id, 
        player_x_id, player_o_id, player_x_result, player_o_result, final_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        boardStateStr,
        nextMoveValue,
        result,
        playerId,
        Math.max(playerXSkillLevel, playerOSkillLevel),
        algorithm,
        roomId,
        room.player_x_id,
        room.player_o_id,
        playerXGameResult,
        playerOGameResult,
        finalScore
      ]
    );

    // Update player statistics
    if (room.player_x_id) {
      await pool.query(
        `UPDATE player_profiles 
         SET games_played = games_played + 1,
             wins = wins + ${playerXGameResult === 'win' ? 1 : 0},
             losses = losses + ${playerXGameResult === 'loss' ? 1 : 0},
             draws = draws + ${playerXGameResult === 'draw' ? 1 : 0},
             last_seen = NOW()
         WHERE id = $1`,
        [room.player_x_id]
      );
    }

    if (room.player_o_id) {
      await pool.query(
        `UPDATE player_profiles 
         SET games_played = games_played + 1,
             wins = wins + ${playerOGameResult === 'win' ? 1 : 0},
             losses = losses + ${playerOGameResult === 'loss' ? 1 : 0},
             draws = draws + ${playerOGameResult === 'draw' ? 1 : 0},
             last_seen = NOW()
         WHERE id = $1`,
        [room.player_o_id]
      );
    }

    console.log("Game state stored successfully", {
      boardState: boardStateStr,
      nextMove: nextMoveValue,
      result,
      playerId,
      roomId,
      algorithm,
      scores,
      playerXGameResult,
      playerOGameResult,
      finalScore
    });
  } catch (error) {
    console.error("Error storing game state:", error);
  }
}

async function predictNextMove(board, playerId) {
  try {

    const playerIdStr = String(playerId);

    const playerResult = await pool.query(
      "SELECT skill_level FROM player_profiles WHERE id = $1",
      [playerIdStr]
    );

    const skillLevel = playerResult.rows[0]?.skill_level || 1000;
    const leagueTier = getLeagueTier(skillLevel);

    // Convert board state to string format without commas
    const boardStateStr = board.map(cell => cell || ' ').join('');

    // Find similar game states from players in the same league
    const similarStates = await pool.query(
      `SELECT board_state, next_move, result 
       FROM game_states 
       WHERE (player_x_id = $1 OR player_o_id = $1)
       AND (player_x_id IN (
         SELECT id FROM player_profiles WHERE skill_level BETWEEN $2 AND $3
       ) OR player_o_id IN (
         SELECT id FROM player_profiles WHERE skill_level BETWEEN $2 AND $3
       ))
       ORDER BY created_at DESC
       LIMIT 5`,
      [playerIdStr, skillLevel - 200, skillLevel + 200]
    );

    if (similarStates.rows.length > 0) {
      // Calculate weighted prediction
      const predictions = similarStates.rows.map((row) => ({
        move: row.next_move,
        weight: row.result === "win" ? 1.5 : 1.0,
      }));

      // Select best move based on weights
      const bestMove = predictions.reduce((best, current) =>
        current.weight > best.weight ? current : best
      );

      return {
        prediction: bestMove.move,
        confidence: bestMove.weight,
        algorithm: "historical_data",
        leagueTier,
      };
    }

    // Fallback to algorithm-based prediction
    const algorithm =
      skillLevel > 3000 ? "nQueens" : skillLevel > 2000 ? "bfs" : "dfs";

    const prediction = await getAlgorithmPrediction(board, algorithm);
    return {
      ...prediction,
      leagueTier,
    };
  } catch (error) {
    console.error("Error in prediction:", error);
    return {
      prediction: findRandomEmptyCell(board),
      confidence: 0.5,
      algorithm: "fallback",
      leagueTier: "BRONZE",
    };
  }
}


async function getAlgorithmPrediction(board, algorithm) {
  try {
    let prediction;

    switch (algorithm) {
      case "nQueens":
        prediction = nQueensPredictNextMove(board);
        break;
      case "bfs":
        prediction = bfsPredictNextMove(board);
        break;
      case "dfs":
        prediction = dfsPredictNextMove(board);
        break;
      default:
        prediction = {
          prediction: findRandomEmptyCell(board),
          confidence: 0.5,
          algorithm: "random",
        };
    }

    return {
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      algorithm: algorithm,
    };
  } catch (error) {
    console.error("Error in algorithm prediction:", error);
    return {
      prediction: findRandomEmptyCell(board),
      confidence: 0.5,
      algorithm: "fallback",
    };
  }
}

function createGameRoom(roomId) {
  return {
    id: roomId,
    board: Array(9).fill(null),
    currentPlayer: "X",
    players: new Set(),
    playerX: null,
    playerO: null,
    scores: { X: 0, O: 0 },
    moveHistory: [],
  };
}


app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, password, display_name, age, parent_email } = req.body;

    if (!username || !password || !display_name || !age || !parent_email) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    const existingUser = await pool.query(
      "SELECT * FROM player_profiles WHERE username = $1",
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: "Username already exists" });
    }

    // Generate a unique ID
    const userId = crypto.randomUUID();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const result = await pool.query(
      `INSERT INTO player_profiles 
       (id, username, password, display_name, age, parent_email, games_played, wins, losses, draws) 
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, 0) 
       RETURNING id, username, display_name`,
      [userId, username, hashedPassword, display_name, age, parent_email]
    );

    // Create session
    req.session.userId = result.rows[0].id;
    req.session.username = result.rows[0].username;

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        username: result.rows[0].username,
        display_name: result.rows[0].display_name
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ success: false, error: "Error creating account" });
  }
});

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Username and password are required" });
    }

    const result = await pool.query(
      "SELECT * FROM player_profiles WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username or password" });
    }
    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid username or password" });
    }

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ success: false, error: "Error signing in" });
  }
});

app.get("/api/auth/status", async (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.json({ authenticated: false });
    }

    const result = await pool.query(
      "SELECT id, username, display_name FROM player_profiles WHERE id = $1",
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ authenticated: false });
    }

    res.json({
      authenticated: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Auth status error:", error);
    res.json({ authenticated: false });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res
        .status(500)
        .json({ success: false, error: "Error logging out" });
    }
    res.json({ success: true });
  });
});

// Profile endpoints
app.get("/api/profile", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get player profile
    const profileResult = await pool.query(
      `SELECT id, username, display_name, games_played, wins, losses, draws, skill_level
       FROM player_profiles
       WHERE id = $1`,
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: "Player not found" });
    }

    // Get game history as both X and O player
    const historyResult = await pool.query(
      `SELECT 
        gh.created_at,
        gh.result,
        gh.score,
        gh.algorithm,
        pp.display_name as opponent_name
       FROM game_history gh
       LEFT JOIN player_profiles pp ON gh.opponent_id = pp.id
       WHERE gh.player_id = $1
       ORDER BY gh.created_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      ...profileResult.rows[0],
      game_history: historyResult.rows
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Error fetching profile" });
  }
});

app.get("/api/profile/history", async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get game history with player information
    const result = await pool.query(
      `SELECT 
        gs.id,
        gs.created_at,
        gs.result,
        gs.algorithm,
        gs.player_id,
        gs.skill_level,
        pp.display_name as player_name
       FROM game_states gs
       LEFT JOIN player_profiles pp ON gs.player_id = pp.id
       WHERE gs.player_id = $1
       ORDER BY gs.created_at DESC
       LIMIT 50`,
      [userId]
    );

    // Transform the results to include opponent information
    const history = result.rows.map(game => ({
      id: game.id,
      created_at: game.created_at,
      result: game.result,
      algorithm: game.algorithm,
      player_name: game.player_name,
      skill_level: game.skill_level
    }));

    res.json(history);
  } catch (error) {
    console.error("Error fetching game history:", error);
    res.status(500).json({ error: "Error fetching game history" });
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running : http://localhost:${PORT}`);
});
