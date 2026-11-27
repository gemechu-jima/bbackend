const https = require('https');
const http = require('http');

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render sleeps after 15m idle)

function resolveKeepAliveUrl() {
  const raw =
    process.env.KEEP_ALIVE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.BASE_URL ||
    '';

  const trimmed = raw.trim().replace(/\/$/, '');
  if (!trimmed) return null;

  // Skip local URLs so local development doesn't spam itself unnecessarily
  if (
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1') ||
    trimmed.includes('0.0.0.0')
  ) {
    return null;
  }

  return `${trimmed}/health`;
}

function pingHealth(targetUrl) {
  return new Promise((resolve, reject) => {
    const client = targetUrl.startsWith('https://') ? https : http;
    const req = client.get(targetUrl, { timeout: 15000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });

    req.on('timeout', () => {
      req.destroy(new Error('Keep-alive ping timed out'));
    });

    req.on('error', reject);
  });
}

function startKeepAlive(intervalMs = DEFAULT_INTERVAL_MS) {
  const targetUrl = resolveKeepAliveUrl();
  if (!targetUrl) {
    console.log('💤 Keep-alive worker skipped (local environment or no public URL set).');
    return null;
  }

  console.log(`💓 Keep-alive worker started: pinging ${targetUrl} every ${Math.round(intervalMs / 60000)}m`);

  const timer = setInterval(async () => {
    try {
      const status = await pingHealth(targetUrl);
      console.log(`💓 Keep-alive ping ${targetUrl} -> ${status}`);
    } catch (err) {
      console.warn(`⚠️ Keep-alive ping failed (${targetUrl}):`, err.message);
    }
  }, intervalMs);

  // Do not block process shutdown
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return timer;
}

module.exports = { startKeepAlive, pingHealth, resolveKeepAliveUrl };
