const isDev = import.meta.env.DEV;

// Deployed Cloudflare Worker endpoints
const PROD_API = 'https://hyperbeam-backend.ghodadrakeyur34.workers.dev';
const PROD_WS = 'wss://hyperbeam-backend.ghodadrakeyur34.workers.dev/ws';

export const API_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:8787' : PROD_API);
export const WS_URL = import.meta.env.VITE_WS_URL || (isDev ? 'ws://localhost:8787/ws' : PROD_WS);
