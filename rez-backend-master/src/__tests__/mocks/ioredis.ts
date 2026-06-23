/**
 * ioredis mock for Jest tests.
 *
 * Prevents BullMQ's bullmq-connection module from opening a real IORedis
 * connection to localhost:6379 during tests. Without this, the shared Redis
 * connection created at module-load time retries indefinitely and can block
 * the test runner or trigger "open handles" warnings.
 *
 * Individual tests that need Redis behaviour (redisService, walletService, etc.)
 * mock redisService directly — they do not rely on this ioredis stub.
 */

const EventEmitter = require('events');

class MockIORedis extends EventEmitter {
  status = 'ready';

  constructor() {
    super();
    // Emit ready asynchronously so listeners registered after construction work
    setImmediate(() => this.emit('ready'));
  }

  // Core commands used by BullMQ / bullmq-connection
  get = () => Promise.resolve(null);
  set = () => Promise.resolve('OK');
  del = () => Promise.resolve(0);
  hset = () => Promise.resolve(0);
  hget = () => Promise.resolve(null);
  hgetall = () => Promise.resolve({});
  hmset = () => Promise.resolve('OK');
  lrange = () => Promise.resolve([]);
  llen = () => Promise.resolve(0);
  lpush = () => Promise.resolve(0);
  rpush = () => Promise.resolve(0);
  rpoplpush = () => Promise.resolve(null);
  lmove = () => Promise.resolve(null);
  zadd = () => Promise.resolve(0);
  zrangebyscore = () => Promise.resolve([]);
  zremrangebyscore = () => Promise.resolve(0);
  zcard = () => Promise.resolve(0);
  expire = () => Promise.resolve(1);
  ttl = () => Promise.resolve(-1);
  exists = () => Promise.resolve(0);
  keys = () => Promise.resolve([]);
  flushdb = () => Promise.resolve('OK');
  info = () => Promise.resolve('redis_version:7.0.0\r\nused_memory:1000\r\n');
  ping = () => Promise.resolve('PONG');
  quit = () => Promise.resolve('OK');
  disconnect = () => {};
  duplicate = () => new MockIORedis();
  pipeline = () => ({
    exec: () => Promise.resolve([]),
    zadd: () => this,
    zrangebyscore: () => this,
    zremrangebyscore: () => this,
    lrange: () => this,
    hset: () => this,
    hget: () => this,
    del: () => this,
    set: () => this,
    get: () => this,
    expire: () => this,
    lpush: () => this,
    rpush: () => this,
  });
  multi = () => this.pipeline();
  subscribe = () => Promise.resolve();
  unsubscribe = () => Promise.resolve();
  publish = () => Promise.resolve(0);
  sendCommand = () => Promise.resolve(null);
  call = () => Promise.resolve(null);
  // BullMQ uses xadd / xread for streams
  xadd = () => Promise.resolve(null);
  xread = () => Promise.resolve(null);
  xlen = () => Promise.resolve(0);
}

export = MockIORedis;
