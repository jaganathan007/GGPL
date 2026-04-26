import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });

let latestState = null;
let clientCount = 0;

wss.on('connection', (ws) => {
  clientCount++;
  console.log(`✅ Client connected (${clientCount} total)`);

  // Send latest state to newly connected client immediately
  if (latestState) {
    ws.send(JSON.stringify({ type: 'STATE_SYNC', state: latestState }));
  }

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'STATE_UPDATE') {
        latestState = msg.state;
        // Broadcast to ALL other connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'STATE_SYNC', state: msg.state }));
          }
        });
        console.log(`📡 State broadcast to ${wss.clients.size - 1} client(s)`);
      }
    } catch (err) {
      console.error('❌ Invalid message:', err.message);
    }
  });

  ws.on('close', () => {
    clientCount--;
    console.log(`🔌 Client disconnected (${clientCount} remaining)`);
  });
});

console.log(`
╔══════════════════════════════════════╗
║   🏏 GGPL Live Sync Server          ║
║   Running on ws://localhost:${PORT}    ║
║   Waiting for connections...         ║
╚══════════════════════════════════════╝
`);
