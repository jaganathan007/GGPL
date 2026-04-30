import { createContext, useContext, useReducer, useEffect, useRef, type ReactNode, type Dispatch } from 'react';
import type { Team, Match } from './types';

const STORAGE_KEY = 'ggpl-data';
// Use the environment variable if available, otherwise fallback to local
const WS_URL = import.meta.env.VITE_WS_URL || (window.location.protocol === 'https:' ? `wss://${window.location.host}/ws` : `ws://${window.location.host}/ws`);
const RECONNECT_DELAY = 2000;

interface AppState {
  leagues: League[];
  teams: Team[];
  matches: Match[];
}

type Action =
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
  leagues: [],
  teams: [],
  matches: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
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
    case 'SET_STATE':
      return action.payload;
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as AppState;
    } catch { /* ignore */ }
    return initialState;
  });

  // Track whether a state change came from an external source (WS or storage event)
  // to avoid echo-broadcasting it back
  const isExternalUpdate = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
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
              // Ensure leagues array exists
              msg.state.leagues = msg.state.leagues || [];
              // Rehydrate the server if it woke up from sleep (empty) but we have data
              if (msg.state.teams?.length === 0 && msg.state.matches?.length === 0 && 
                 (stateRef.current.teams.length > 0 || stateRef.current.matches.length > 0 || stateRef.current.leagues?.length > 0)) {
                ws.send(JSON.stringify({ type: 'STATE_UPDATE', state: stateRef.current }));
                return;
              }

              isExternalUpdate.current = true;
              dispatch({ type: 'SET_STATE', payload: msg.state });
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
