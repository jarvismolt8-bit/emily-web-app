module.exports = {
  apps: [
    {
      name: 'cashflow-backend',
      script: 'server.js',
      cwd: '/var/www/cashflow-manager/backend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'shared-xvfb',
      script: 'Xvfb',
      args: ':99 -screen 0 1280x800x24',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 5
    },
    {
      name: 'shared-chrome',
      script: '/usr/local/bin/start-shared-chrome.sh',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 5
    },
    {
      name: 'shared-vnc',
      script: 'x11vnc',
      args: '-display :99 -nopw -listen 127.0.0.1 -rfbport 5900 -forever -noncache',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 5
    },
    {
      name: 'shared-novnc',
      script: 'websockify',
      args: '--web /usr/share/novnc 127.0.0.1:6080 127.0.0.1:5900',
      interpreter: 'none',
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 5
    }
  ]
};
