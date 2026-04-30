import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 3001;
const wss = new WebSocketServer({ port: PORT });
const DATA_FILE = path.join(process.cwd(), 'data.json');

let globalState = { teams: [], matches: [], leagues: [] };

// Try to load existing data on startup
try {
  if (fs.existsSync(DATA_FILE)) {
    const saved = fs.readFileSync(DATA_FILE, 'utf-8');
    globalState = JSON.parse(saved);
    console.log('✅ Loaded previous state from data.json');
  }
} catch (err) {
  console.error('⚠️ Could not load data.json:', err.message);
}

function saveState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(globalState));
  } catch (err) {
    console.error('⚠️ Could not save data.json:', err.message);
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_LEAGUE': return { ...state, leagues: [...(state.leagues || []), action.payload] };
    case 'UPDATE_LEAGUE': return { ...state, leagues: (state.leagues || []).map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LEAGUE': return { ...state, leagues: (state.leagues || []).filter(l => l.id !== action.payload) };
    case 'ADD_TEAM': return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM': return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TEAM': return { ...state, teams: state.teams.filter(t => t.id !== action.payload), matches: state.matches.filter(m => m.team1Id !== action.payload && m.team2Id !== action.payload) };
    case 'ADD_MATCH': return { ...state, matches: [...state.matches, action.payload] };
    case 'UPDATE_MATCH': return { ...state, matches: state.matches.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MATCH': return { ...state, matches: state.matches.filter(m => m.id !== action.payload) };
    case 'SET_STATE': return action.payload;
    default: return state;
  }
}

let clientCount = 0;

wss.on('connection', (ws) => {
  clientCount++;
  console.log(`✅ Client connected (${clientCount} total)`);

  ws.send(JSON.stringify({ type: 'STATE_SYNC', state: globalState }));

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ACTION') {
        globalState = reducer(globalState, msg.action);
        saveState();
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({ type: 'STATE_SYNC', state: globalState }));
          }
        });
      } else if (msg.type === 'STATE_UPDATE') {
        // Fallback for older clients or rehydration from client
        globalState = msg.state;
        saveState();
        wss.clients.forEach(c => {
          if (c !== ws && c.readyState === 1) {
            c.send(JSON.stringify({ type: 'STATE_SYNC', state: globalState }));
          }
        });
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
