import 'dotenv/config';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(process.cwd(), 'data.json');

// ── State ────────────────────────────────────────────────────────────────────
let globalState = { users: [], teams: [], matches: [], leagues: [], deletedMatchIds: [] };

try {
  if (fs.existsSync(DATA_FILE)) {
    const saved = fs.readFileSync(DATA_FILE, 'utf-8');
    globalState = { ...globalState, ...JSON.parse(saved) };
    console.log('✅ Loaded previous state from data.json');
  }
} catch (err) {
  console.error('⚠️ Could not load data.json:', err.message);
}

function saveState() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(globalState)); }
  catch (err) { console.error('⚠️ Could not save data.json:', err.message); }
}

function reducer(state, action) {
  const deleted = state.deletedMatchIds || [];
  switch (action.type) {
    case 'ADD_USER':      return { ...state, users: [...(state.users||[]), action.payload] };
    case 'UPDATE_USER':   return { ...state, users: (state.users||[]).map(u => u.id === action.payload.id ? action.payload : u) };
    case 'ADD_LEAGUE':    return { ...state, leagues: [...(state.leagues||[]), action.payload] };
    case 'UPDATE_LEAGUE': return { ...state, leagues: (state.leagues||[]).map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LEAGUE': return { ...state, leagues: (state.leagues||[]).filter(l => l.id !== action.payload) };
    case 'ADD_TEAM':      return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM':   return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TEAM':   return { ...state, teams: state.teams.filter(t => t.id !== action.payload), matches: state.matches.filter(m => m.team1Id !== action.payload && m.team2Id !== action.payload) };
    case 'ADD_MATCH':
      if (deleted.includes(action.payload.id)) return state;
      return { ...state, matches: [...state.matches, action.payload] };
    case 'UPDATE_MATCH':
      if (deleted.includes(action.payload.id)) return state;
      return { ...state, matches: state.matches.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MATCH':
      return {
        ...state,
        matches: state.matches.filter(m => m.id !== action.payload),
        deletedMatchIds: deleted.includes(action.payload) ? deleted : [...deleted, action.payload],
      };
    case 'SET_STATE':     return { ...globalState, ...action.payload };
    default:              return state;
  }
}

// ── HTTP request handler (API + health check) ────────────────────────────────
async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Health check — Render pings this to confirm the service is alive
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size }));
    return;
  }

  // Email OTP API
  if (req.method === 'POST' && req.url === '/api/send-otp') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', async () => {
      try {
        const { to_email, to_name, otp_code } = JSON.parse(body);
        if (!to_email || !otp_code) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }
        if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Email service not configured' }));
          return;
        }

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });

        const htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
            <tr><td align="center">
              <table width="100%" style="max-width:520px;background:#1e293b;border-radius:20px;overflow:hidden;border:1px solid #334155;">
                <tr><td style="background:linear-gradient(135deg,#059669,#0d9488);padding:32px;text-align:center;">
                  <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:2px;">🏏 GGPL</div>
                  <div style="color:#a7f3d0;font-size:13px;margin-top:4px;font-weight:500;text-transform:uppercase;letter-spacing:2px;">Cricket Score Tracker</div>
                </td></tr>
                <tr><td style="padding:36px 32px;">
                  <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px 0;">Hi <strong style="color:#34d399;">${to_name || 'there'}</strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;margin:0 0 28px 0;line-height:1.6;">Use the code below to reset your GGPL password.</p>
                  <div style="background:#0f172a;border:2px solid #34d399;border-radius:16px;padding:28px;text-align:center;margin:0 0 28px 0;">
                    <div style="color:#94a3b8;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:3px;margin-bottom:16px;">Your Verification Code</div>
                    <div style="font-size:52px;font-family:'Courier New',monospace;font-weight:900;color:#34d399;letter-spacing:16px;line-height:1;">${otp_code}</div>
                    <div style="color:#475569;font-size:12px;margin-top:16px;">⏱ Expires in <strong style="color:#fbbf24;">10 minutes</strong></div>
                  </div>
                  <p style="color:#475569;font-size:13px;margin:0;">If you didn't request this, please ignore this email.</p>
                </td></tr>
                <tr><td style="background:#0f172a;padding:20px 32px;text-align:center;border-top:1px solid #1e293b;">
                  <p style="color:#334155;font-size:11px;margin:0;">© 2025 GGPL Cricket Score Tracker · Sent automatically</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>`;

        await transporter.sendMail({
          from: `"GGPL Cricket Tracker" <${process.env.GMAIL_USER}>`,
          to: to_email,
          subject: `🏏 Your GGPL verification code: ${otp_code}`,
          html: htmlBody,
          text: `Hi ${to_name},\n\nYour GGPL password reset code is: ${otp_code}\n\nExpires in 10 minutes.\n\n— GGPL Cricket Score Tracker`,
        });

        console.log(`📧 OTP sent to ${to_email}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        console.error('❌ Email error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to send email', details: err.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end();
}

// ── Single HTTP server — WebSocket upgrades + HTTP API on the SAME port ──────
const httpServer = createServer(handleRequest);
const wss = new WebSocketServer({ server: httpServer }); // attach WS to HTTP server

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
        wss.clients.forEach(c => {
          if (c !== ws && c.readyState === 1)
            c.send(JSON.stringify({ type: 'STATE_SYNC', state: globalState }));
        });
      } else if (msg.type === 'STATE_UPDATE') {
        globalState = { ...globalState, ...msg.state };
        saveState();
        wss.clients.forEach(c => {
          if (c !== ws && c.readyState === 1)
            c.send(JSON.stringify({ type: 'STATE_SYNC', state: globalState }));
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

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🏏 GGPL Live Sync Server              ║
║   HTTP + WS  → port ${PORT}              ║
║   Health     → GET /health              ║
║   Email API  → POST /api/send-otp       ║
╚══════════════════════════════════════════╝
  `);
});
