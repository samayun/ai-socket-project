const socket = io();

const gameState = {
  board: Array(9).fill(null),
  currentPlayer: null,
  gameStatus: 'waiting',
  playerId: null,
  playerXId: null,
  playerOId: null,
  playerXName: null,
  playerOName: null,
  roomId: null,
  isPlayerX: false,
  isPlayerO: false,
  scores: { X: 0, O: 0 }
};


const sounds = {
  move: new Audio('/sounds/move.mp3'),
  win: new Audio('/sounds/win.mp3'),
  draw: new Audio('/sounds/draw.mp3'),
  error: new Audio('/sounds/error.mp3'),
  reset: new Audio('/sounds/reset.mp3'),
  music: new Audio('/sounds/music.webm')
};

// Preload sounds
Object.values(sounds).forEach(sound => {
  sound.load();
  sound.volume = 0.8;
});

// Set music to loop and lower volume
sounds.music.loop = true;
sounds.music.volume = 0.3;

// Function to start music
function startGameMusic() {
  sounds.music.play().then().catch().catch(error => {
    console.log('Game music autoplay prevented:', error);
  });
}

// Function to stop music
function stopGameMusic() {
  sounds.music.pause();
  sounds.music.currentTime = 0;
}

// DOM Elements
const boardElement = document.querySelector('.game-board');
const statusElement = document.getElementById('status');
const scoreElement = document.getElementById('score');
const movesListElement = document.getElementById('movesList');
const predictionInfoElement = document.getElementById('predictionInfo');
const resetButton = document.getElementById('resetBtn');
// const newGameButton = document.getElementById('newGameBtn');
const gameOverAlert = document.getElementById('gameOverAlert');
const gameOverWinner = document.getElementById('gameOverWinner');
const gameOverScore = document.getElementById('gameOverScore');
const playAgainBtn = document.getElementById('playAgainBtn');
// const newGameFromAlertBtn = document.getElementById('newGameFromAlertBtn');


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


const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');
if (roomId) {
  joinRoom(roomId);
} 
// else {
//   const newRoomId = joinRoom();
//   const shareLink = `${window.location.origin}${window.location.pathname}?room=${newRoomId}`;
//   console.log(`Share this link with your opponent: ${shareLink}`);
// }


function updateBoard() {
  const cells = boardElement.querySelectorAll('.cell');
  cells.forEach((cell, index) => {
    cell.textContent = gameState.board[index] || '';
    cell.className = `cell ${gameState.board[index] || ''}`;
  });
}

function updateStatus() {
  if (!statusElement) return;
  
  if (gameState.gameStatus === 'waiting') {
    statusElement.textContent = 'Waiting for opponent...';
  } else if (gameState.gameStatus === 'over') {
    statusElement.textContent = 'Game Over';
  } else {
    const isMyTurn = (gameState.currentPlayer === gameState.playerXId && gameState.isPlayerX) || 
                     (gameState.currentPlayer === gameState.playerOId && gameState.isPlayerO);
    const currentPlayerName = gameState.currentPlayer === gameState.playerXId ? gameState.playerXName : gameState.playerOName;
    const nextPlayerName = gameState.currentPlayer === gameState.playerXId ? gameState.playerOName : gameState.playerXName;
    
    statusElement.innerHTML = `
      <div class="text-lg font-semibold">
        ${isMyTurn ? 'Your turn!' : `${currentPlayerName}'s turn`}
      </div>
      <div class="text-sm text-gray-500">
        Next: ${nextPlayerName}
      </div>
    `;
  }
}


function updateScore(scores, playerXName, playerOName) {
  if (!scoreElement) return;
  
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


function showGameOverAlert(winner, scores, playerXName, playerOName) {
  const gameOverAlert = document.getElementById('gameOverAlert');
  const gameOverWinner = document.getElementById('gameOverWinner');
  const gameOverScore = document.getElementById('gameOverScore');

  const xName = playerXName || "Player X";
  const oName = playerOName || "Player O";

  if (winner) {
    const winnerName = winner === "X" ? xName : oName;
    gameOverWinner.textContent = `🎉 ${winnerName} Won!`;
    sounds.win.play().then().catch();
    createConfetti();
  } else {
    gameOverWinner.textContent = "Game Draw!";
    sounds.draw.play().then().catch();
  }
  
  gameOverScore.textContent = `Final Score: ${xName}: ${scores.X || 0} | ${oName}: ${scores.O || 0}`;
  gameOverAlert.classList.add('show');
  
  document.addEventListener('keydown', handleEscapeKey);
}


function createConfetti() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff'];
  const container = document.body;
  
  for (let i = 0; i < 100; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.animationDelay = Math.random() * 3 + 's';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(confetti);
    
    setTimeout(() => {
      confetti.remove();
    }, 3000);
  }
}


function handleEscapeKey(event) {
  if (event.key === 'Escape') {
    hideGameOverAlert();
  }
}

// Hide game over alert
function hideGameOverAlert() {
  const gameOverAlert = document.getElementById('gameOverAlert');
  gameOverAlert.classList.remove('show');
  document.removeEventListener('keydown', handleEscapeKey);
}


// Handle cell click
function handleCellClick(position) {
  if (!gameState.roomId) {
    sounds.error.play().then().catch();
    alert('Please join a room first');
    return;
  }
  
  if (gameState.board[position] || gameState.gameStatus === 'over') {
    sounds.error.play().then().catch();
    return;
  }
  
  // Check if it's the player's turn using IDs
  if ((gameState.currentPlayer === gameState.playerXId && !gameState.isPlayerX) || 
      (gameState.currentPlayer === gameState.playerOId && !gameState.isPlayerO)) {
    sounds.error.play().then().catch();
    return;
  }
  
  sounds.move.play().then().catch();
  socket.emit('makeMove', {
    roomId: gameState.roomId,
    position,
    playerId: gameState.playerId
  });
}


boardElement.querySelectorAll('.cell').forEach((cell, index) => {
  cell.addEventListener('click', () => handleCellClick(index));
});

resetButton.addEventListener('click', () => {
  if (gameState.roomId) {
    sounds.reset.play().then().catch();
    // stopGameMusic();
    socket.emit('resetBoard', gameState.roomId);
    startGameMusic();
  }
});

// newGameButton.addEventListener('click', () => {
//   if (gameState.roomId) {
//     socket.emit('newGame', gameState.roomId);
//   }
// });

playAgainBtn.addEventListener('click', () => {
  hideGameOverAlert();
  if (gameState.roomId) {
    socket.emit('resetBoard', gameState.roomId);
    startGameMusic(); // Start music when new game begins
  }
});

// newGameFromAlertBtn.addEventListener('click', () => {
//   hideGameOverAlert();
//   if (gameState.roomId) {
//     socket.emit('newGame', gameState.roomId);
//   }
// });

// Socket.IO event handlers
socket.on('playerJoined', (data) => {
  const { playerId, playerCount, currentPlayer, board, scores, playerX, playerO, playerXName, playerOName } = data;
  
  // Update game state with IDs and names
  gameState.board = board;
  gameState.playerId = playerId;
  gameState.currentPlayer = currentPlayer;
  gameState.scores = scores;
  gameState.playerXId = playerX;
  gameState.playerOId = playerO;
  gameState.playerXName = playerXName || "Player X";
  gameState.playerOName = playerOName || "Player O";
  gameState.isPlayerX = playerId === playerX;
  gameState.isPlayerO = playerId === playerO;
  
  console.log('Game State Updated:', gameState);
  
  // Update UI
  updateBoard();
  updateScore(scores, gameState.playerXName, gameState.playerOName);
  updateStatus();
  updatePlayerNames();
  
  if (playerCount === 2) {
    gameState.gameStatus = "playing";
    updateStatus();
    startGameMusic();
  }
});

socket.on('moveMade', (data) => {
  const { position, player, board, playerXName, playerOName, currentPlayer } = data;
  
  // Update game state
  gameState.board = board;
  gameState.playerXName = playerXName || gameState.playerXName || "Player X";
  gameState.playerOName = playerOName || gameState.playerOName || "Player O";
  gameState.currentPlayer = currentPlayer;
  
  // Update UI
  updateBoard();
  updateScore(gameState.scores, gameState.playerXName, gameState.playerOName);
  updateStatus();
  updatePlayerNames();
  
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
  
  stopGameMusic(); // Stop music when game ends
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
  data.message && alert(data.message);
});

socket.on('error', (data) => {
  if (data.message === "Please sign in to play") {
    // Redirect to login page or show login modal
    window.location.href = "/login.html";
  } else {
    data.message && alert(data.message);
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

// Join room with code
function joinRoomWithCode() {
  const roomCode = prompt('Enter room code:');
  if (roomCode) {
    joinRoom(roomCode.toUpperCase());
  }
}

// Add event listener for join room button
document.addEventListener('DOMContentLoaded', () => {
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  if (joinRoomBtn) {
    joinRoomBtn.addEventListener('click', joinRoomWithCode);
  }
});

// Create Room Modal Functionality
const createRoomBtn = document.getElementById('createRoomBtn');
const createRoomModal = document.getElementById('create-room-modal');
const createRoomForm = document.getElementById('create-room-form');
const roomNameInput = document.getElementById('room-name');
const createRoomButton = document.getElementById('create-room-button');
const createRoomCancel = document.getElementById('create-room-cancel');
const modalCloseButtons = document.querySelectorAll('.modal .delete');

function showCreateRoomModal() {
    createRoomModal.classList.add('is-active');
    // Set default room name to generated code
    roomNameInput.value = generateRoomCode();
    roomNameInput.focus();
}

function hideCreateRoomModal() {
    createRoomModal.classList.remove('is-active');
    createRoomForm.reset();
}

function generateRoomCode() {
    const prefixes = [
        // Greek Mythology
        'ZEUS', 'ATHENA', 'APOLLO', 'HERMES', 'POSEIDON', 'ARES', 'HERA', 'ARTEMIS',
        // Muslim/Islamic Names
        'ALI', 'OMAR', 'FATIMA', 'AYESHA', 'KHALID', 'HAMZA', 'ZAINAB', 'IBRAHIM',
        // Gaming Icons
        'MARIO', 'LINK', 'SONIC', 'KIRBY', 'PACMAN', 'TETRIS', 'POKEMON', 'ZELDA',
        // Funny/Cool Names
        'NINJA', 'DRAGON', 'PHOENIX', 'TITAN', 'WIZARD', 'KNIGHT', 'SAGE', 'HERO',
        // Classic Names
        'ALPHA', 'OMEGA', 'NOVA', 'COSMOS', 'STAR', 'MOON', 'SUN', 'SKY'
    ];
    
    const suffixes = [
        // Numbers
        '123', '456', '789', '007', '999', '111', '222', '333',
        // Letters
        'XYZ', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR', 'STU',
        // Special
        'PRO', 'MAX', 'ULTRA', 'MEGA', 'SUPER', 'ELITE', 'MASTER', 'LEGEND'
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix}${suffix}`;
}

function handleCreateRoom(event) {
    event.preventDefault();
    const roomName = roomNameInput.value.trim() || generateRoomCode();
    const roomCode = roomName; // Use the room name as the room code
    
    console.log('Creating room:', { roomName, roomCode });
    
    socket.emit('createRoom', {
        roomName,
        roomCode
    }, (error) => {
        if (error) {
            console.error('Error creating room:', error);
            error.message && alert(error.message || 'Failed to create room');
        }
    });

    hideCreateRoomModal();
}

// Event Listeners
createRoomBtn.addEventListener('click', showCreateRoomModal);
createRoomForm.addEventListener('submit', handleCreateRoom);
createRoomButton.addEventListener('click', handleCreateRoom);
createRoomCancel.addEventListener('click', hideCreateRoomModal);

// Close modal when clicking outside
createRoomModal.addEventListener('click', (event) => {
    if (event.target === createRoomModal) {
        hideCreateRoomModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && createRoomModal.classList.contains('is-active')) {
        hideCreateRoomModal();
    }
});

// Close modal with delete button
modalCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        if (modal) {
            modal.classList.remove('is-active');
        }
    });
});

// Socket event handlers for room creation
socket.on('roomCreated', (data) => {
    console.log('Room created response:', data);
    const { roomCode } = data;
    
    if (!roomCode) {
        console.error('No room code received');
        alert('Error: No room code received');
        return;
    }
    
    // Show success message with room code
    alert(`Room created successfully!\nRoom Code: ${roomCode}`);
    
    // Redirect to the room
    window.location.href = '/?room=' + roomCode;
});

socket.on('error', (data) => {
    console.error('Socket error:', data);
    data.message && alert(data.message || 'An error occurred');
});

// Add connection status handlers
socket.on('connect', () => {
    console.log('Connected to server with socket ID:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    if (error.message === 'No player ID provided') {
        // Redirect to login or show error
        window.location.href = '/login.html';
    }
    alert('Failed to connect to server');
});

function updatePlayerNames() {
  const playerNamesElement = document.getElementById('playerNames');
  if (!playerNamesElement) return;

  const xName = gameState.playerXName || "Player X";
  const oName = gameState.playerOName || "Player O";
  
  playerNamesElement.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <div class="text-blue-500 font-semibold">
        <span class="text-lg">X: ${xName}</span>
        ${gameState.isPlayerX ? ' (You)' : ''}
      </div>
      <div class="text-red-500 font-semibold">
        <span class="text-lg">O: ${oName}</span>
        ${gameState.isPlayerO ? ' (You)' : ''}
      </div>
    </div>
  `;
} 