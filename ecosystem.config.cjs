module.exports = {
  apps: [
    {
      name: 'my-token-site',
      cwd: '/var/www/my-token-site',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
