const Database = require('./db');

class GameAlgorithms {
    static checkWinner(board) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6] // diagonals
        ];

        for (const line of lines) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }

        return board.includes('') ? null : 'draw';
    }

    static async predictNextMove(board, playerSkillLevel) {
        // First, try to find similar game states from the database
        const similarStates = await Database.findSimilarGameStates(board, playerSkillLevel);
        
        if (similarStates.length > 0) {
            // Calculate weighted average of successful moves
            const moveScores = new Array(9).fill(0);
            let totalWeight = 0;

            for (const state of similarStates) {
                const weight = state.similarity_score * (1 + (state.result === 'win' ? 0.5 : 0));
                moveScores[state.next_move] += weight;
                totalWeight += weight;
            }

            // Normalize scores
            for (let i = 0; i < moveScores.length; i++) {
                moveScores[i] = moveScores[i] / totalWeight;
            }

            // Find best available move
            let bestMove = -1;
            let bestScore = -1;

            for (let i = 0; i < 9; i++) {
                if (board[i] === '' && moveScores[i] > bestScore) {
                    bestScore = moveScores[i];
                    bestMove = i;
                }
            }

            if (bestMove !== -1) {
                return {
                    move: bestMove,
                    confidence: bestScore,
                    source: 'historical'
                };
            }
        }

        // Fallback to minimax algorithm
        return this.minimax(board, playerSkillLevel);
    }

    static minimax(board, playerSkillLevel) {
        const emptyCells = board.reduce((acc, cell, index) => {
            if (cell === '') acc.push(index);
            return acc;
        }, []);

        if (emptyCells.length === 0) return { move: -1, confidence: 0, source: 'minimax' };

        // Adjust search depth based on player skill level
        const maxDepth = Math.min(emptyCells.length, Math.floor(playerSkillLevel / 500) + 2);

        let bestScore = -Infinity;
        let bestMove = emptyCells[0];
        let confidence = 0;

        for (const cell of emptyCells) {
            board[cell] = 'O';
            const score = this.minimaxScore(board, maxDepth - 1, false, -Infinity, Infinity);
            board[cell] = '';

            if (score > bestScore) {
                bestScore = score;
                bestMove = cell;
                confidence = (score + 10) / 20; // Normalize confidence to 0-1 range
            }
        }

        return {
            move: bestMove,
            confidence: confidence,
            source: 'minimax'
        };
    }

    static minimaxScore(board, depth, isMaximizing, alpha, beta) {
        const winner = this.checkWinner(board);
        
        if (winner === 'O') return 10;
        if (winner === 'X') return -10;
        if (winner === 'draw' || depth === 0) return 0;

        const emptyCells = board.reduce((acc, cell, index) => {
            if (cell === '') acc.push(index);
            return acc;
        }, []);

        if (isMaximizing) {
            let maxScore = -Infinity;
            for (const cell of emptyCells) {
                board[cell] = 'O';
                const score = this.minimaxScore(board, depth - 1, false, alpha, beta);
                board[cell] = '';
                maxScore = Math.max(maxScore, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            return maxScore;
        } else {
            let minScore = Infinity;
            for (const cell of emptyCells) {
                board[cell] = 'X';
                const score = this.minimaxScore(board, depth - 1, true, alpha, beta);
                board[cell] = '';
                minScore = Math.min(minScore, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            return minScore;
        }
    }

    static async analyzeGameState(board, playerSkillLevel) {
        const prediction = await this.predictNextMove(board, playerSkillLevel);
        const emptyCells = board.filter(cell => cell === '').length;
        
        let analysis = {
            prediction: prediction,
            gameState: {
                movesLeft: emptyCells,
                currentPhase: emptyCells > 6 ? 'early' : emptyCells > 3 ? 'mid' : 'late',
                isWinningPosition: this.checkWinner(board) === 'O',
                isLosingPosition: this.checkWinner(board) === 'X'
            },
            recommendations: []
        };

        // Add strategic recommendations based on game state
        if (analysis.gameState.isWinningPosition) {
            analysis.recommendations.push('Winning move available!');
        } else if (analysis.gameState.isLosingPosition) {
            analysis.recommendations.push('Defensive move needed!');
        } else if (emptyCells === 1) {
            analysis.recommendations.push('Final move - choose carefully!');
        }

        // Add skill-based recommendations
        if (playerSkillLevel < 1000) {
            analysis.recommendations.push('Focus on blocking opponent\'s winning moves');
        } else if (playerSkillLevel < 1500) {
            analysis.recommendations.push('Look for fork opportunities');
        } else {
            analysis.recommendations.push('Consider advanced strategies like forcing draws');
        }

        return analysis;
    }
}

module.exports = GameAlgorithms; 