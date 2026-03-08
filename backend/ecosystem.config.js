module.exports = {
  apps: [{
    name: 'cashflow-backend',
    script: 'server.js',
    cwd: '/var/www/cashflow-manager/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
