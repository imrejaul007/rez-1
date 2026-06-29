import http from 'http';
import mongoose from 'mongoose';
import { redis } from './config/redis';
import { logger } from './config/logger';

export function startHealthServer(port: number): http.Server {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    // Liveness — is the process alive?
    if (req.url === '/health/live') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'alive', timestamp: new Date().toISOString() }));
      return;
    }

    // Readiness — can the service handle requests?
    if (req.url === '/health/ready') {
      const checks: Record<string, string> = {};
      let ready = true;

      try {
        if (mongoose.connection.readyState !== 1) throw new Error('not connected');
        await mongoose.connection.db?.admin().ping();
        checks.mongodb = 'ok';
      } catch (err: any) {
        checks.mongodb = `error: ${err.message}`;
        ready = false;
      }

      try {
        await redis.ping();
        checks.redis = 'ok';
      } catch (err: any) {
        checks.redis = `degraded: ${err.message}`;
        // Redis degraded is warning not fatal for auth (locking will fail-closed)
      }

      res.writeHead(ready ? 200 : 503);
      res.end(JSON.stringify({
        status: ready ? 'ready' : 'degraded',
        checks,
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    // Backward-compat /health endpoint
    if (req.url === '/health' || req.url === '/healthz') {
      try {
        await mongoose.connection.db?.admin().ping();
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
      } catch {
        res.writeHead(503);
        res.end(JSON.stringify({ status: 'unhealthy' }));
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => logger.info(`[Health] Listening on :${port}`));
  return server;
}
