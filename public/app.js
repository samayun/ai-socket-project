const socket = io();

// DOM Elements
const algorithmSelect = document.getElementById('algorithmSelect');
const bfsInput = document.getElementById('bfsInput');
const nqueensInput = document.getElementById('nqueensInput');
const runButton = document.getElementById('runButton');
const resultOutput = document.getElementById('resultOutput');
const visualization = document.getElementById('visualization');

// Event Listeners
algorithmSelect.addEventListener('change', () => {
    const selectedAlgorithm = algorithmSelect.value;
    bfsInput.style.display = selectedAlgorithm === 'nqueens' ? 'none' : 'block';
    nqueensInput.style.display = selectedAlgorithm === 'nqueens' ? 'block' : 'none';
});

runButton.addEventListener('click', () => {
    const algorithm = algorithmSelect.value;
    let input = {};

    if (algorithm === 'nqueens') {
        input = {
            n: parseInt(document.getElementById('boardSize').value)
        };
    } else {
        input = {
            start: document.getElementById('startNode').value,
            end: document.getElementById('endNode').value,
            graph: document.getElementById('graphInput').value
        };
    }

    // Clear previous results
    resultOutput.textContent = '';
    visualization.innerHTML = '';

    // Emit the algorithm request
    socket.emit('run_algorithm', { algorithm, input });
});

// Socket event handlers
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('algorithm_result', (result) => {
    // Display the result
    resultOutput.textContent = JSON.stringify(result, null, 2);

    // Visualize the result based on algorithm type
    const algorithm = algorithmSelect.value;
    if (algorithm === 'nqueens') {
        visualizeNQueens(result.solutions[0]);
    } else {
        visualizeGraph(result);
    }
});

socket.on('error', (error) => {
    resultOutput.textContent = `Error: ${error.message}`;
});

// Visualization functions
function visualizeNQueens(solution) {
    if (!solution) return;

    const boardSize = solution.length;
    const board = document.createElement('div');
    board.style.display = 'grid';
    board.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
    board.style.gap = '2px';
    board.style.width = '400px';
    board.style.height = '400px';
    board.style.margin = '0 auto';

    for (let i = 0; i < boardSize; i++) {
        for (let j = 0; j < boardSize; j++) {
            const cell = document.createElement('div');
            cell.style.backgroundColor = (i + j) % 2 === 0 ? '#fff' : '#000';
            cell.style.display = 'flex';
            cell.style.alignItems = 'center';
            cell.style.justifyContent = 'center';
            cell.style.fontSize = '24px';
            
            if (solution[i] === j) {
                cell.textContent = '👑';
            }
            
            board.appendChild(cell);
        }
    }

    visualization.innerHTML = '';
    visualization.appendChild(board);
}

function visualizeGraph(result) {
    if (!result.path || !result.visited) return;

    const graph = document.createElement('div');
    graph.style.display = 'flex';
    graph.style.flexDirection = 'column';
    graph.style.gap = '10px';

    // Add path information
    const pathInfo = document.createElement('div');
    pathInfo.innerHTML = `
        <strong>Path:</strong> ${result.path.join(' → ')}<br>
        <strong>Visited Nodes:</strong> ${result.visited.join(', ')}
    `;
    graph.appendChild(pathInfo);

    visualization.innerHTML = '';
    visualization.appendChild(graph);
} 