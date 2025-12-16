// PM2 配置文件
// 加载 .env 文件（如果存在）
const fs = require('fs');
const path = require('path');

// 尝试加载 .env 文件
const envPath = path.join(__dirname, '.env');
let envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

module.exports = {
  apps: [{
    name: 'gameroom-server',
    script: 'server/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: envVars.PORT || process.env.PORT || 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: envVars.PORT || process.env.PORT || 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
};

