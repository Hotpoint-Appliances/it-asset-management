// PM2 process file for the Windows Server deployment (docs/deployment.md).
//
//   pm2 start deploy/ecosystem.config.js     (from the app folder, after `npm run build`)
//   pm2 reload itam                          (zero-downtime restart: workers are replaced one by one)
//   pm2 save                                 (so `pm2 resurrect` brings it back after a reboot)
//
// Cluster mode can't run `npm start` on Windows (npm is a .cmd shim, not a Node script), so the
// script is Next's own CLI entry point. Each worker opens its own Postgres pool: keep
// instances x PG_POOL_MAX (default 10) below Postgres's max_connections.
const instances = Number(process.env.ITAM_PM2_INSTANCES) || 2;
const port = Number(process.env.ITAM_PORT) || 3000;

module.exports = {
  apps: [
    {
      name: "itam",
      cwd: __dirname + "/..",
      script: "node_modules/next/dist/bin/next",
      // 127.0.0.1 only: users reach the app through nginx (HTTPS, login rate limit), never
      // directly. The scheduled notification script calls this port locally.
      args: `start -H 127.0.0.1 -p ${port}`,
      exec_mode: "cluster",
      instances,
      env: { NODE_ENV: "production" },
      max_memory_restart: "1G",
      kill_timeout: 10000,
      time: true,
    },
  ],
};
