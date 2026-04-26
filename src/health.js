/*
 * src/health.js
 * Health check endpoint for monitoring and load balancers
 */

function createHealthCheckHandler() {
  const startTime = Date.now();

  return {
    live: (req, res) => {
      // Liveness probe: is process alive?
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    },

    ready: (req, res) => {
      // Readiness probe: is service ready to accept traffic?
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
      });
    },

    metrics: (req, res) => {
      // Prometheus-compatible metrics endpoint
      const uptime = Date.now() - startTime;
      const metrics = [
        '# HELP process_uptime_seconds Process uptime in seconds',
        '# TYPE process_uptime_seconds gauge',
        `process_uptime_seconds ${Math.floor(uptime / 1000)}`,
        '',
        '# HELP nodejs_memory_usage_bytes Node.js memory usage',
        '# TYPE nodejs_memory_usage_bytes gauge',
      ];

      const memUsage = process.memoryUsage();
      Object.entries(memUsage).forEach(([key, value]) => {
        metrics.push(`nodejs_memory_usage_bytes{type="${key}"} ${value}`);
      });

      res.set('Content-Type', 'text/plain');
      res.send(metrics.join('\n'));
    }
  };
}

module.exports = { createHealthCheckHandler };
