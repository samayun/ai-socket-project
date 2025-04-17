// Socket.IO connection
const socket = io();

// Game state
let gameState = {
  roomId: null,
  board: Array(9).fill(null),
  currentPlayer: 'X',
  scores: { X: 0, O: 0 },
  moveHistory: [],
  players: new Set()
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
function updateStatus(message) {
  statusElement.textContent = message;
}

// Update score display
function updateScore() {
  scoreElement.textContent = `Score - X: ${gameState.scores.X} | O: ${gameState.scores.O}`;
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
                   prediction.source === 'N-Queens' ? 'N-Queens Algorithm' :
                   'Unknown';
    
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

// Show game over alert with confetti
function showGameOverAlert(winner, scores) {
  // Update alert content
  if (winner) {
    gameOverWinner.textContent = `Player ${winner} Wins!`;
    gameOverWinner.style.color = winner === 'X' ? 'var(--primary-color)' : 'var(--secondary-color)';
  } else {
    gameOverWinner.textContent = "It's a Draw!";
    gameOverWinner.style.color = 'var(--text-color)';
  }
  
  gameOverScore.textContent = `Final Score - X: ${scores.X} | O: ${scores.O}`;
  
  // Show alert with animation
  gameOverAlert.classList.add('show');
  
  // Create confetti
  createConfetti();
  
  // Clear any existing prediction
  updatePrediction(null);
}

// Create confetti animation
function createConfetti() {
  // Clear existing confetti
  const existingConfetti = document.querySelectorAll('.confetti');
  existingConfetti.forEach(confetti => confetti.remove());
  
  // Create new confetti
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    
    // Random position, size, and animation delay
    const size = Math.random() * 10 + 5;
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    
    confetti.style.width = `${size}px`;
    confetti.style.height = `${size}px`;
    confetti.style.left = `${left}%`;
    confetti.style.animationDelay = `${delay}s`;
    
    gameOverAlert.appendChild(confetti);
  }
}

// Hide game over alert
function hideGameOverAlert() {
  gameOverAlert.classList.remove('show');
}

// Handle cell click
function handleCellClick(index) {
  if (gameState.board[index] || !gameState.roomId) return;
  
  socket.emit('makeMove', {
    roomId: gameState.roomId,
    position: index
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
  gameState.players.add(data.playerId);
  gameState.board = data.board;
  gameState.currentPlayer = data.currentPlayer;
  gameState.scores = data.scores;
  
  updateBoard();
  updateStatus(`Player ${data.playerCount === 1 ? 'waiting for opponent' : 'joined'}`);
  updateScore();
});

socket.on('moveMade', (data) => {
  gameState.board = data.board;
  gameState.moveHistory = data.moveHistory;
  
  updateBoard();
  updateMoveHistory();
  
  // Check if the game is over after the move
  if (isGameOver(data.board)) {
    const winner = checkWinner(data.board);
    showGameOverAlert(winner, gameState.scores);
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
  gameState.scores = data.scores;
  updateScore();
  
  if (data.winner) {
    updateStatus(`Player ${data.winner} wins!`);
  } else {
    updateStatus("It's a draw!");
  }
  
  // Show game over alert
  showGameOverAlert(data.winner, data.scores);
});

socket.on('boardReset', (data) => {
  gameState.board = data.board;
  gameState.currentPlayer = data.currentPlayer;
  gameState.moveHistory = [];
  
  updateBoard();
  updateStatus(`Player ${data.currentPlayer}'s turn`);
  updateMoveHistory();
  updatePrediction(null);
});

socket.on('gameStarted', (data) => {
  gameState.board = data.board;
  gameState.currentPlayer = data.currentPlayer;
  gameState.scores = data.scores;
  gameState.moveHistory = [];
  
  updateBoard();
  updateStatus(`Player ${data.currentPlayer}'s turn`);
  updateScore();
  updateMoveHistory();
  updatePrediction(null);
});

socket.on('playerTurn', (data) => {
  gameState.currentPlayer = data.currentPlayer;
  updateStatus(`Player ${data.currentPlayer}'s turn`);
});

socket.on('playerLeft', (data) => {
  gameState.players.delete(data.playerId);
  updateStatus(`Player left. ${data.playerCount} player${data.playerCount === 1 ? '' : 's'} remaining`);
});

socket.on('invalidMove', (data) => {
  alert(data.message);
});

socket.on('error', (data) => {
  alert(data.message);
});

// Helper function to check if game is over
function isGameOver(board) {
  return checkWinner(board) || board.every(cell => cell !== null);
}

// Helper function to check for winner
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