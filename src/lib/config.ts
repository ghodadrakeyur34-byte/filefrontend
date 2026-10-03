const isDev = import.meta.env.DEV;

// Detect API host based on environment or fallback to current origin / port 8787
export const API_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:8787' : window.location.origin);
export const WS_URL = import.meta.env.VITE_WS_URL || (
  isDev 
    ? 'ws://localhost:8787/ws' 
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
);
