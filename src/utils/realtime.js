const { WebSocketServer, WebSocket } = require('ws');

let wss = null;

/**
 * Attach a WebSocket server at /ws to the existing HTTP server.
 */
function initRealtime(httpServer) {
  if (wss) return wss;

  wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
    });

    ws.send(JSON.stringify({ event: 'CONNECTED', timestamp: Date.now() }));
  });

  // Periodic heartbeat to clean up dead mobile/browser sockets
  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('🔌 WebSocket real-time server attached at /ws');
  return wss;
}

function broadcast(event, data) {
  if (!wss) return;
  const payload = JSON.stringify({
    event,
    data,
    timestamp: Date.now(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function broadcastNumberUpdate({ gameId, numberId, number = null, status }) {
  broadcast('NUMBER_UPDATED', {
    gameId: Number(gameId),
    numberId: Number(numberId),
    number: number !== null ? Number(number) : null,
    status,
  });
}

function broadcastNumbersRefresh(gameId = null) {
  broadcast('NUMBERS_REFRESH', {
    gameId: gameId ? Number(gameId) : null,
  });
}

module.exports = {
  initRealtime,
  broadcast,
  broadcastNumberUpdate,
  broadcastNumbersRefresh,
};
