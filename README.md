# Real-Time Multiplayer Tic-Tac-Toe with AI
## Computer Networking Lab Documentation

## 1. Network Architecture

### 1.1 Protocol Stack
- **Application Layer**: Node.js/Express.js server
- **Transport Layer**: TCP (via Socket.IO)
- **Network Layer**: IP routing
- **Data Link Layer**: Ethernet/WiFi
- **Physical Layer**: Network infrastructure

### 1.2 Communication Model
- **Client-Server Architecture**: Centralized game server with multiple clients
- **Publish-Subscribe Pattern**: Event-based communication using Socket.IO
- **State Synchronization**: Real-time game state updates across clients

### 1.3 Network Topology
```
                    [Game Server]
                         |
            +----------+----------+
            |                     |
    [Client 1]              [Client 2]
        |                        |
    [Browser]               [Browser]
```

## 2. Protocol Implementation

### 2.1 WebSocket Protocol (via Socket.IO)
- **Connection Establishment**: Handshake protocol
- **Message Format**: JSON-encoded game events
- **Connection Management**: Heartbeat mechanism
- **Error Handling**: Automatic reconnection

### 2.2 Event-Based Communication
```javascript
// Server-side event emission
socket.emit('move_made', { position, player, currentPlayer });

// Client-side event handling
socket.on('move_made', ({ position, player, currentPlayer }) => {
  // Update game state
});
```

### 2.3 Room-Based Broadcasting
```javascript
// Join game room
socket.join(roomId);

// Broadcast to room
io.to(roomId).emit('playerJoined', {
  playerId: socket.id,
  playerCount: room.players.size
});
```

## 3. Network Performance

### 3.1 Latency Management
- **Connection Pooling**: Database connection optimization
- **Caching**: In-memory game state caching
- **Batch Processing**: Vector similarity queries optimization

### 3.2 Bandwidth Optimization
- **Minimal Payload**: Efficient JSON message structure
- **Delta Updates**: Only sending changed game state
- **Compression**: Socket.IO built-in compression

### 3.3 Scalability Considerations
- **Horizontal Scaling**: Multiple server instances
- **Load Balancing**: Distributing client connections
- **Database Sharding**: Partitioning game data

## 4. Network Security

### 4.1 Authentication & Authorization
- **Player Identification**: Fingerprint-based authentication
- **Session Management**: Socket.IO session tracking
- **Access Control**: Room-based permission system

### 4.2 Data Protection
- **Input Validation**: Server-side move validation
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Request throttling per client

### 4.3 Network Monitoring
- **Connection Logging**: Socket connection events
- **Error Tracking**: Network error handling
- **Performance Metrics**: Latency and throughput monitoring

## 5. Database Networking

### 5.1 Connection Management
```javascript
// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
```

### 5.2 Query Optimization
- **Indexed Queries**: Performance-optimized database access
- **Connection Pooling**: Reusing database connections
- **Transaction Management**: Atomic game state updates

### 5.3 Vector Similarity Search
```sql
-- Vector similarity query
SELECT board_state, next_move, result 
FROM vector_embeddings 
WHERE player_skill_level BETWEEN $1 AND $2
ORDER BY similarity(board_state, $3::vector) DESC
LIMIT 5;
```

## 6. Deployment Architecture

### 6.1 Container Networking
```yaml
# Docker Compose network configuration
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    networks:
      - game-network
  db:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - game-network

networks:
  game-network:
    driver: bridge

volumes:
  postgres-data:
```

### 6.2 Service Discovery
- **Container Naming**: DNS-based service discovery
- **Environment Variables**: Configuration injection
- **Health Checks**: Container readiness monitoring

### 6.3 Network Isolation
- **Bridge Networks**: Isolated container communication
- **Volume Mounting**: Persistent data storage
- **Port Mapping**: External access control

## 7. Network Testing

### 7.1 Latency Testing
- **Connection Time**: Socket.IO connection establishment
- **Message Round-Trip**: Move submission to acknowledgment
- **Database Query Time**: Vector similarity search performance

### 7.2 Throughput Testing
- **Concurrent Connections**: Maximum player capacity
- **Message Frequency**: Move rate handling
- **Database Load**: Query performance under load

### 7.3 Resilience Testing
- **Connection Drops**: Automatic reconnection
- **Server Failures**: Graceful degradation
- **Database Failures**: Fallback mechanisms

## 8. Future Network Enhancements

### 8.1 Protocol Improvements
- **WebTransport**: Next-generation transport protocol
- **QUIC**: Quick UDP Internet Connections
- **HTTP/3**: Improved HTTP protocol

### 8.2 Scaling Strategies
- **WebSocket Clusters**: Multi-server WebSocket setup
- **Redis Pub/Sub**: Distributed event broadcasting
- **Database Replication**: Read/write splitting

### 8.3 Security Enhancements
- **TLS 1.3**: Latest encryption standards
- **JWT Authentication**: Stateless authentication
- **DDoS Protection**: Rate limiting and filtering

## Conclusion
This project demonstrates comprehensive networking concepts through a real-time multiplayer game. The implementation showcases modern networking technologies including WebSockets, database connectivity, and container networking, providing a practical application of computer networking principles in a engaging gaming context. 