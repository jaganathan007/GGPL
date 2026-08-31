import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react';
import type { League, Team, Match, User } from './types';

const STORAGE_KEY = 'ggpl-data';
// Use the environment variable if available, otherwise fallback to local
const WS_URL = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}/ws` : `ws://${window.location.host}/ws`);
const RECONNECT_DELAY = 2000;

interface AppState {
  users: User[];
  leagues: League[];
  teams: Team[];
  matches: Match[];
}

type Action =
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_LEAGUE'; payload: League }
  | { type: 'UPDATE_LEAGUE'; payload: League }
  | { type: 'DELETE_LEAGUE'; payload: string }
  | { type: 'ADD_TEAM'; payload: Team }
  | { type: 'UPDATE_TEAM'; payload: Team }
  | { type: 'DELETE_TEAM'; payload: string }
  | { type: 'ADD_MATCH'; payload: Match }
  | { type: 'UPDATE_MATCH'; payload: Match }
  | { type: 'DELETE_MATCH'; payload: string }
  | { type: 'SET_STATE'; payload: AppState };

const initialState: AppState = {
  users: [],
  leagues: [],
  teams: [],
  matches: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_USER':
      return { ...state, users: [...(state.users || []), action.payload] };
    case 'UPDATE_USER':
      return { ...state, users: (state.users || []).map(u => u.id === action.payload.id ? action.payload : u) };
    case 'ADD_LEAGUE':
      return { ...state, leagues: [...(state.leagues || []), action.payload] };
    case 'UPDATE_LEAGUE':
      return { ...state, leagues: (state.leagues || []).map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LEAGUE':
      return { ...state, leagues: (state.leagues || []).filter(l => l.id !== action.payload) };
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.payload] };
    case 'UPDATE_TEAM':
      return { ...state, teams: state.teams.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TEAM':
      return {
        ...state,
        teams: state.teams.filter(t => t.id !== action.payload),
        matches: state.matches.filter(m => m.team1Id !== action.payload && m.team2Id !== action.payload),
      };
    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches, action.payload] };
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MATCH':
      return { ...state, matches: state.matches.filter(m => m.id !== action.payload) };
    case 'SET_STATE': {
      const incoming = {
        ...action.payload,
        users: action.payload.users || state.users || [],
      };
      return migrateTeamOwnership(incoming);
    }
    default:
      return state;
  }
}

/**
 * Migrate legacy teams: assign ownerId to teams that don't have one.
 * Infer ownership from matches that reference the team.
 */
function migrateTeamOwnership(state: AppState): AppState {
  const hasOrphan = state.teams.some(t => !t.ownerId);
  if (!hasOrphan) return state;

  // Build a map: teamId -> ownerId from matches
  const teamOwnerMap: Record<string, string> = {};
  for (const match of state.matches) {
    if (match.ownerId) {
      if (!teamOwnerMap[match.team1Id]) teamOwnerMap[match.team1Id] = match.ownerId;
      if (!teamOwnerMap[match.team2Id]) teamOwnerMap[match.team2Id] = match.ownerId;
    }
  }
  // Also infer from league ownership
  const leagueOwnerMap: Record<string, string> = {};
  for (const league of (state.leagues || [])) {
    if (league.ownerId) leagueOwnerMap[league.id] = league.ownerId;
  }

  return {
    ...state,
    teams: state.teams.map(t => {
      if (t.ownerId) return t;
      // Try to infer from match ownership
      const fromMatch = teamOwnerMap[t.id];
      if (fromMatch) return { ...t, ownerId: fromMatch };
      // Try to infer from league ownership
      if (t.leagueId && leagueOwnerMap[t.leagueId]) return { ...t, ownerId: leagueOwnerMap[t.leagueId] };
      return t;
    }),
  };
}

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => {},
});

// ── Match auto-pruning ────────────────────────────────────────────────────────
const SEVEN_DAYS_MS  = 7  * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function pruneOldMatches(state: AppState): AppState {
  const now = Date.now();
  const filtered = state.matches.filter(m => {
    const matchDate = new Date(m.date).getTime();

    if (m.isComplete) {
      // Completed matches: keep for 7 days after completion (or match date as fallback)
      const completedTs = m.completedAt ? new Date(m.completedAt).getTime() : matchDate;
      return now - completedTs <= SEVEN_DAYS_MS;
    } else {
      // In-progress: keep only if the match date is within the last 30 days
      // This removes abandoned/demo matches that were never finished
      return now - matchDate <= THIRTY_DAYS_MS;
    }
  });
  return { ...state, matches: filtered };
}

// ── Smart merge: prevents server from overwriting newer local data ─────────────
function mergeStates(local: AppState, incoming: AppState): AppState {
  const localMatchMap: Record<string, (typeof local.matches)[0]> = {};
  local.matches.forEach(m => { localMatchMap[m.id] = m; });

  const merged = [...incoming.matches];
  // Add local matches not present in incoming
  local.matches.forEach(lm => {
    if (!incoming.matches.find(im => im.id === lm.id)) {
      merged.push(lm);
    }
  });

  // For conflicts (same id) prefer the richer/more-complete version
  const finalMatches = merged.map(m => {
    const loc = localMatchMap[m.id];
    if (!loc) return m;
    if (loc.innings.length > m.innings.length) return loc;
    if (loc.isComplete && !m.isComplete) return loc;
    return m;
  });

  const result: AppState = {
    ...incoming,
    users: incoming.users?.length ? incoming.users : local.users,
    matches: finalMatches,
    teams: mergeById(local.teams, incoming.teams),
    leagues: mergeById(local.leagues || [], incoming.leagues || []),
  };

  // Always prune after merge so the server can NEVER re-inject old/demo matches
  return pruneOldMatches(result);
}

function mergeById<T extends { id: string }>(local: T[], incoming: T[]): T[] {
  const map: Record<string, T> = {};
  local.forEach(i => { map[i.id] = i; });
  incoming.forEach(i => { map[i.id] = i; });
  return Object.values(map);
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = migrateTeamOwnership(JSON.parse(saved) as AppState);
        return pruneOldMatches(parsed); // auto-delete matches older than 7 days
      }
    } catch { /* ignore */ }
    return initialState;
  });


  // Track whether a state change came from an external source (WS or storage event)
  // to avoid echo-broadcasting it back
  const isExternalUpdate = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const actionQueue = useRef<Action[]>([]);
  const stateRef = useRef(initialState);
  stateRef.current = state;

  // ─── WebSocket connection with auto-reconnect ───
  useEffect(() => {
    function connect() {
      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log('🟢 GGPL Sync connected');
          wsRef.current = ws;
          
          // Send any actions that were queued while offline
          if (actionQueue.current.length > 0) {
            actionQueue.current.forEach(action => {
              ws.send(JSON.stringify({ type: 'ACTION', action }));
            });
            actionQueue.current = [];
          }
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'STATE_SYNC' && msg.state) {
              msg.state.leagues = msg.state.leagues || [];

              // If server woke up empty → push our full local state to it
              if (msg.state.teams?.length === 0 && msg.state.matches?.length === 0 &&
                 (stateRef.current.teams.length > 0 || stateRef.current.matches.length > 0 || (stateRef.current.leagues?.length ?? 0) > 0)) {
                ws.send(JSON.stringify({ type: 'STATE_UPDATE', state: stateRef.current }));
                return;
              }

              // Smart merge: never let server wipe real local data
              const merged = mergeStates(stateRef.current, msg.state as AppState);
              isExternalUpdate.current = true;
              dispatch({ type: 'SET_STATE', payload: merged });
            }
          } catch { /* ignore bad messages */ }
        };


        ws.onclose = () => {
          console.log('🔴 GGPL Sync disconnected, reconnecting...');
          wsRef.current = null;
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        // WebSocket server not running — that's ok, app works offline
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, []);

  // ─── Cross-tab sync via localStorage `storage` event ───
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const newState = JSON.parse(e.newValue) as AppState;
          isExternalUpdate.current = true;
          dispatch({ type: 'SET_STATE', payload: newState });
        } catch { /* ignore */ }
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ─── Persist to localStorage ───
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    isExternalUpdate.current = false;
  }, [state]);

  const customDispatch = (action: Action) => {
    dispatch(action);
    if (action.type !== 'SET_STATE') {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ACTION', action }));
      } else {
        // Queue the action to be sent when the connection is restored
        actionQueue.current.push(action);
      }
    }
  };

  return (
    <AppContext.Provider value={{ state, dispatch: customDispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
