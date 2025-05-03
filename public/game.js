// Socket.IO connection
const socket = io();

// Game state
const gameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  gameStatus: 'waiting',
  playerFingerprint: null,
  playerName: null,
  playerStats: null,
  roomId: null,
  isPlayerX: false,
  isPlayerO: false,
  playerXName: null,
  playerOName: null
};

// DOM Elements
const boardElement = document.querySelector('.game-board');
const statusElement = document.getElementById('status');
const scoreElement = document.getElementById('score');
const movesListElement = document.getElementById('movesList');
const predictionInfoElement = document.getElementById('predictionInfo');
const resetButton = document.getElementById('resetBtn');
const newGameButton = document.getElementById('newGameBtn');
const gameOverAlert = document.getElementById('gameOverAlert');
const gameOverWinner = document.getElementById('gameOverWinner');
const gameOverScore = document.getElementById('gameOverScore');
const playAgainBtn = document.getElementById('playAgainBtn');
const newGameFromAlertBtn = document.getElementById('newGameFromAlertBtn');

// Room management
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function joinRoom(roomId = null) {
  const roomToJoin = roomId || generateRoomId();
  gameState.roomId = roomToJoin;
  socket.emit('joinRoom', roomToJoin);
  
  // Update URL with room ID
  const url = new URL(window.location.href);
  url.searchParams.set('room', roomToJoin);
  window.history.pushState({}, '', url);
  
  return roomToJoin;
}

// Initialize room from URL or create new one
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
if (roomId) {
  joinRoom(roomId);
} else {
  const newRoomId = joinRoom();
  // Share room link
  const shareLink = `${window.location.origin}${window.location.pathname}?room=${newRoomId}`;
  alert(`Share this link with your opponent: ${shareLink}`);
}

// Update board display
function updateBoard() {
  const cells = boardElement.querySelectorAll('.cell');
  cells.forEach((cell, index) => {
    cell.textContent = gameState.board[index] || '';
    cell.className = `cell ${gameState.board[index] || ''}`;
  });
}

// Update status display
function updateStatus() {
  if (!statusElement) return;
  
  if (gameState.gameStatus === 'waiting') {
    statusElement.textContent = 'Waiting for opponent...';
  } else if (gameState.gameStatus === 'over') {
    statusElement.textContent = 'Game Over';
  } else {
    const isMyTurn = (gameState.currentPlayer === 'X' && gameState.isPlayerX) || 
                     (gameState.currentPlayer === 'O' && gameState.isPlayerO);
    statusElement.textContent = isMyTurn ? 'Your turn!' : 'Opponent\'s turn';
  }
}

// Update score display
function updateScore(scores, playerXName, playerOName) {
  const scoreElement = document.getElementById("score");
  if (scoreElement) {
    // Ensure we have valid names, fallback to "Player X/O" if undefined
    const xName = playerXName || "Player X";
    const oName = playerOName || "Player O";
    
    scoreElement.innerHTML = `
      <div class="text-lg font-semibold">
        <span class="text-blue-500">${xName}: ${scores.X || 0}</span>
        <span class="text-gray-400 mx-2">|</span>
        <span class="text-red-500">${oName}: ${scores.O || 0}</span>
      </div>
    `;
  }
}

// Update move history
function updateMoveHistory() {
  movesListElement.innerHTML = gameState.moveHistory
    .map(move => `
      <div class="move">
        Player ${move.player} placed at position ${move.position + 1}
        <span class="timestamp">${new Date(move.timestamp).toLocaleTimeString()}</span>
      </div>
    `)
    .join('');
  movesListElement.scrollTop = movesListElement.scrollHeight;
}

// Update prediction display
function updatePrediction(prediction) {
  if (prediction && typeof prediction.prediction === 'number') {
    const confidence = prediction.confidence === 'win' ? 'Player will win' :
                      prediction.confidence === 'block' ? 'Block opponent win' :
                      prediction.confidence === 'center' ? 'Strategic center move' :
                      prediction.confidence === 'corner' ? 'Strategic corner move' :
                      prediction.confidence === 'strategic' ? 'Strategic position' :
                      'Default move';
    
    const source = prediction.source === 'database' ? 'Historical Data' :
                   prediction.source === 'BFS' ? 'Breadth-First Search' :
                   prediction.source === 'DFS' ? 'Depth-First Search' :
                   prediction.source === 'N-Queens' ? 'N-Queens' :
                   'Min-Max';
    
    predictionInfoElement.innerHTML = `
      <div class="prediction-info">
        <div class="confidence">${confidence}</div>
        <div class="suggestion">Suggested move: Position ${prediction.prediction + 1}</div>
        <div class="source">Algorithm: ${source}</div>
      </div>
    `;
  } else {
    predictionInfoElement.innerHTML = '<div class="no-prediction">No prediction available</div>';
  }
}

// Show game over alert
function showGameOverAlert(winner, scores, playerXName, playerOName) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
  
  // Ensure we have valid names
  const xName = playerXName || "Player X";
  const oName = playerOName || "Player O";
  
  alertDiv.innerHTML = `
    <div class="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <h2 class="text-2xl font-bold mb-4 text-center">
        ${winner ? `🎉 ${winner === "X" ? xName : oName} Won!` : "Game Draw!"}
      </h2>
      <div class="text-center mb-4">
        <p class="text-lg">
          Final Score: ${xName}: ${scores.X || 0} | ${oName}: ${scores.O || 0}
        </p>
      </div>
      <div class="flex justify-center">
        <button onclick="startNewGame()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
          Play Again
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(alertDiv);
}

// Create confetti with different colors
function createConfetti() {
  const colors = ['var(--primary-color)', 'var(--secondary-color)', '#FFD700', '#FF69B4'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.width = Math.random() * 10 + 5 + 'px';
    confetti.style.height = Math.random() * 10 + 5 + 'px';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 2 + 's';
    document.body.appendChild(confetti);
    
    // Remove confetti after animation
    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }
}

// Find winning cells
function findWinningCells(board, winner) {
  const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] === winner && board[b] === winner && board[c] === winner) {
      return pattern;
    }
  }
  return [];
}

// Handle Escape key
function handleEscapeKey(event) {
  if (event.key === 'Escape') {
    hideGameOverAlert();
  }
}

// Hide game over alert
function hideGameOverAlert() {
  gameOverAlert.classList.remove('show');
  document.removeEventListener('keydown', handleEscapeKey);
  
  // Remove winning cell highlights
  document.querySelectorAll('.winning-cell').forEach(cell => {
    cell.classList.remove('winning-cell');
  });
}

// Generate a unique fingerprint for the player
function generateFingerprint() {
  // Check if we already have a fingerprint in localStorage
  let fingerprint = localStorage.getItem('playerFingerprint');
  
  if (!fingerprint) {
    // Generate a new fingerprint
    fingerprint = 'player_' + Math.random().toString(36).substring(2, 15) + 
                 '_' + Date.now().toString(36);
    
    // Store in localStorage
    localStorage.setItem('playerFingerprint', fingerprint);
  }
  
  return fingerprint;
}

// Get player's IP address
async function getPlayerIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP address:', error);
    return 'unknown';
  }
}

// Initialize player data
async function initializePlayerData() {
  gameState.playerFingerprint = generateFingerprint();
  gameState.playerName = prompt('Please enter your name:');
  gameState.ipAddress = await getPlayerIP();
  
  // Send player data to server
  socket.emit('playerData', {
    fingerprint: gameState.playerFingerprint,
    ipAddress: gameState.ipAddress,
    name: gameState.playerName
  });
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
  initializePlayerData();
});

// Handle cell click
function handleCellClick(position) {
  if (!gameState.roomId) {
    alert('Please join a room first');
    return;
  }
  
  if (gameState.board[position] || gameState.gameStatus === 'over') {
    return;
  }
  
  // Check if it's the player's turn
  if ((gameState.currentPlayer === 'X' && !gameState.isPlayerX) || 
      (gameState.currentPlayer === 'O' && !gameState.isPlayerO)) {
    return;
  }
  
  socket.emit('makeMove', {
    roomId: gameState.roomId,
    position,
    playerFingerprint: gameState.playerFingerprint
  });
}

// Event Listeners
boardElement.querySelectorAll('.cell').forEach((cell, index) => {
  cell.addEventListener('click', () => handleCellClick(index));
});

resetButton.addEventListener('click', () => {
  if (gameState.roomId) {
    socket.emit('resetBoard', gameState.roomId);
  }
});

newGameButton.addEventListener('click', () => {
  if (gameState.roomId) {
    socket.emit('newGame', gameState.roomId);
  }
});

playAgainBtn.addEventListener('click', () => {
  hideGameOverAlert();
  if (gameState.roomId) {
    socket.emit('resetBoard', gameState.roomId);
  }
});

newGameFromAlertBtn.addEventListener('click', () => {
  hideGameOverAlert();
  if (gameState.roomId) {
    socket.emit('newGame', gameState.roomId);
  }
});

// Socket.IO event handlers
socket.on('playerJoined', (data) => {
  const { playerId, playerCount, currentPlayer, board, scores, playerX, playerO, playerXName, playerOName } = data;
  
  // Update game state
  gameState.board = board;
  gameState.currentPlayer = currentPlayer;
  gameState.scores = scores;
  gameState.isPlayerX = socket.id === playerX;
  gameState.isPlayerO = socket.id === playerO;
  gameState.playerXName = playerXName || "Player X";
  gameState.playerOName = playerOName || "Player O";
  
  // Update UI
  updateBoard();
  updateScore(scores, gameState.playerXName, gameState.playerOName);
  updateTurnDisplay(
    currentPlayer,
    currentPlayer === "X" ? gameState.playerXName : gameState.playerOName,
    currentPlayer === "X" ? gameState.playerOName : gameState.playerXName
  );
  
  if (playerCount === 2) {
    gameState.gameStatus = "playing";
    updateStatus();
  }
});

socket.on('moveMade', (data) => {
  const { position, player, board, playerXName, playerOName } = data;
  
  // Update game state
  gameState.board = board;
  gameState.playerXName = playerXName || gameState.playerXName || "Player X";
  gameState.playerOName = playerOName || gameState.playerOName || "Player O";
  
  // Update UI
  updateBoard();
  updateScore(gameState.scores, gameState.playerXName, gameState.playerOName);
  updateTurnDisplay(
    player === "X" ? "O" : "X",
    player === "X" ? gameState.playerOName : gameState.playerXName,
    player === "X" ? gameState.playerXName : gameState.playerOName
  );
  
  // Check if the game is over after the move
  if (isGameOver(data.board)) {
    const winner = checkWinner(data.board);
    showGameOverAlert(winner, data.scores, data.playerXName, data.playerOName);
  }
});

socket.on('prediction', (data) => {
  if (data && typeof data.prediction === 'number') {
    updatePrediction(data);
  } else {
    updatePrediction(null);
  }
});

socket.on('gameOver', (data) => {
  const { winner, scores, playerXName, playerOName } = data;
  
  // Update game state
  gameState.scores = scores;
  gameState.playerXName = playerXName || gameState.playerXName || "Player X";
  gameState.playerOName = playerOName || gameState.playerOName || "Player O";
  
  // Update UI
  updateScore(scores, gameState.playerXName, gameState.playerOName);
  showGameOverAlert(winner, scores, gameState.playerXName, gameState.playerOName);
});

socket.on('boardReset', (data) => {
  gameState.board = data.board;
  gameState.currentPlayer = data.currentPlayer;
  gameState.moveHistory = [];
  gameState.playerXName = data.playerXName;
  gameState.playerOName = data.playerOName;
  
  updateBoard();
  updateStatus();
  updateScore(gameState.scores, gameState.playerXName, gameState.playerOName);
  updateMoveHistory();
  updatePrediction(null);
});

socket.on('gameStarted', (data) => {
  gameState.board = data.board;
  gameState.currentPlayer = data.currentPlayer;
  gameState.scores = data.scores;
  gameState.moveHistory = [];
  gameState.playerXName = data.playerXName;
  gameState.playerOName = data.playerOName;
  
  updateBoard();
  updateStatus();
  updateScore(gameState.scores, gameState.playerXName, gameState.playerOName);
  updateMoveHistory();
  updatePrediction(null);
});

socket.on('playerTurn', (data) => {
  gameState.currentPlayer = data.currentPlayer;
  updateStatus();
});

socket.on('playerLeft', (data) => {
  gameState.gameStatus = 'waiting';
  updateStatus();
});

socket.on('invalidMove', (data) => {
  alert(data.message);
});

socket.on('error', (data) => {
  if (data.message === "Please sign in to play") {
    // Redirect to login page or show login modal
    window.location.href = "/login.html";
  } else {
    alert(data.message);
  }
});

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

// Check authentication status on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/auth/status");
    const data = await response.json();
    
    if (!data.authenticated) {
      // Redirect to login page if not authenticated
      window.location.href = "/login.html";
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    window.location.href = "/login.html";
  }
});

// Update the turn display
function updateTurnDisplay(currentPlayer, currentPlayerName, nextPlayerName) {
  const turnDisplay = document.getElementById("turnDisplay");
  if (turnDisplay) {
    // Ensure we have valid names, fallback to "Player X/O" if undefined
    const currentName = currentPlayerName || `Player ${currentPlayer}`;
    const nextName = nextPlayerName || `Player ${currentPlayer === "X" ? "O" : "X"}`;
    
    turnDisplay.innerHTML = `
      <div class="text-lg font-semibold">
        <span class="${currentPlayer === "X" ? "text-blue-500" : "text-red-500"}">
          ${currentName}'s Turn
        </span>
        <span class="text-gray-400">(Playing as ${currentPlayer})</span>
      </div>
      <div class="text-sm text-gray-400">
        Next: ${nextName}
      </div>
    `;
  }
}

// Handle player turn events
socket.on("playerTurn", (data) => {
  const { currentPlayer, currentPlayerName, nextPlayerName } = data;
  updateTurnDisplay(currentPlayer, currentPlayerName, nextPlayerName);
});

// Handle move made events
socket.on("moveMade", (data) => {
  const { position, player, board, playerXName, playerOName } = data;
  updateBoard(board);
  updateTurnDisplay(
    player === "X" ? "O" : "X",
    player === "X" ? playerOName : playerXName,
    player === "X" ? playerXName : playerOName
  );
});

// Handle game over events
socket.on("gameOver", (data) => {
  const { winner, scores, playerXName, playerOName } = data;
  showGameOverAlert(winner, scores, playerXName, playerOName);
}); 