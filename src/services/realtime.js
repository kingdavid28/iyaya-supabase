// Optional realtime client wrapper (Socket.IO if available)
// Falls back to no-op if socket.io-client isn't installed.
import { API_CONFIG } from '../config/constants';

let socket = null;
let ioFactory = null;

export async function initRealtime(authTokenProvider) {
  try {
    // Dynamically import to avoid bundling errors if not installed
    const mod = await import('socket.io-client');
    ioFactory = mod.io || mod.default;
    const token = (await authTokenProvider?.()) || null;
    socket = ioFactory(API_CONFIG.BASE_URL.replace('/api', ''), {
      transports: ['websocket', 'polling'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
    });

    return socket;
  } catch (err) {
    console.warn('[Realtime] socket.io-client not available, realtime disabled');
    socket = null;
    return null;
  }
}

export function getSocket() {
  return socket;
}

export function on(event, handler) {
  if (!socket) return () => {};
  socket.on(event, handler);
  return () => socket.off(event, handler);
}

export function emit(event, payload) {
  if (!socket) return;
  socket.emit(event, payload);
}
