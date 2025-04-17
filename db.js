const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class Database {
    static async getPlayerProfile(fingerprint) {
        const query = `
            SELECT * FROM player_profiles 
            WHERE fingerprint = $1
        `;
        const result = await pool.query(query, [fingerprint]);
        return result.rows[0];
    }

    static async createPlayerProfile(fingerprint, ipAddress) {
        const query = `
            INSERT INTO player_profiles (fingerprint, ip_address)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await pool.query(query, [fingerprint, ipAddress]);
        return result.rows[0];
    }

    static async updatePlayerStats(fingerprint, result) {
        const updates = {
            'win': { wins: 1, skill_level: 25 },
            'loss': { losses: 1, skill_level: -20 },
            'draw': { draws: 1, skill_level: 5 }
        };

        const update = updates[result];
        const query = `
            UPDATE player_profiles
            SET 
                games_played = games_played + 1,
                wins = wins + $1,
                losses = losses + $2,
                draws = draws + $3,
                skill_level = skill_level + $4
            WHERE fingerprint = $5
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            update.wins || 0,
            update.losses || 0,
            update.draws || 0,
            update.skill_level,
            fingerprint
        ]);
        return result.rows[0];
    }

    static async saveGameState(fingerprint, boardState, movePosition, result, algorithmUsed, skillLevel) {
        const query = `
            INSERT INTO game_history 
            (player_fingerprint, board_state, move_position, result, algorithm_used, player_skill_level)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;
        const result = await pool.query(query, [
            fingerprint,
            JSON.stringify(boardState),
            movePosition,
            result,
            algorithmUsed,
            skillLevel
        ]);
        return result.rows[0];
    }

    static async findSimilarGameStates(boardState, skillLevel, limit = 5) {
        const query = `
            SELECT 
                board_state,
                next_move,
                result,
                player_skill_level,
                similarity(board_state, $1::vector) as similarity_score
            FROM vector_embeddings
            WHERE 
                player_skill_level BETWEEN $2 - 200 AND $2 + 200
                AND similarity(board_state, $1::vector) > 0.7
            ORDER BY similarity_score DESC
            LIMIT $3
        `;
        const result = await pool.query(query, [boardState, skillLevel, limit]);
        return result.rows;
    }

    static async saveVectorEmbedding(boardState, nextMove, result, skillLevel, algorithmUsed) {
        const query = `
            INSERT INTO vector_embeddings 
            (board_state, next_move, result, player_skill_level, algorithm_used)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [
            boardState,
            nextMove,
            result,
            skillLevel,
            algorithmUsed
        ]);
        return result.rows[0];
    }

    static async getLeaderboard(limit = 10) {
        const query = `
            SELECT 
                fingerprint,
                skill_level,
                games_played,
                wins,
                losses,
                draws,
                CASE 
                    WHEN skill_level >= 2000 THEN 'DIAMOND'
                    WHEN skill_level >= 1500 THEN 'PLATINUM'
                    WHEN skill_level >= 1200 THEN 'GOLD'
                    WHEN skill_level >= 1000 THEN 'SILVER'
                    ELSE 'BRONZE'
                END as league_tier
            FROM player_profiles
            ORDER BY skill_level DESC
            LIMIT $1
        `;
        const result = await pool.query(query, [limit]);
        return result.rows;
    }
}

module.exports = Database; 