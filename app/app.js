const express = require('express');
const os = require('os');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Request counter to demonstrate ALB load balancing across Fargate tasks
let hitCount = 0;

// Helper to resolve local IP address
function getContainerIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint required by Application Load Balancer (ALB) Target Group
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    container: {
      hostname: os.hostname(),
      ip: getContainerIp()
    }
  });
});

// Config API endpoint returning Environment Variables, Secrets, and Task Metadata
app.get('/api/config', (req, res) => {
  hitCount++;
  res.json({
    env: {
      APP_NAME: process.env.APP_NAME || 'ECS Secrets Demo',
      APP_ENV: process.env.APP_ENV || 'development',
      PORT: PORT,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      FEATURE_ANALYTICS: process.env.FEATURE_ANALYTICS || 'enabled'
    },
    secrets: {
      // Injected by ECS Agent via Secrets Manager valueFrom in Task Definition
      DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || 'local_dev_db_password_123',
      API_SECRET_KEY: process.env.API_SECRET_KEY || 'sk_dev_998877665544332211',
      SECRET_SOURCE: process.env.SECRET_SOURCE || 'Local Environment Default'
    },
    task: {
      hostname: os.hostname(),
      ip: getContainerIp(),
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      hitCount: hitCount
    }
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 ECS Demo Application running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.APP_ENV || 'development'}`);
  console.log(`🔐 Database Password loaded: ${process.env.DATABASE_PASSWORD ? 'YES (Injected)' : 'NO (Using Default)'}`);
  console.log(`🏥 Health check path: http://localhost:${PORT}/health`);
  console.log(`==================================================`);
});

// Handle graceful termination signal from ECS Agent (Fargate container shutdown)
process.on('SIGTERM', () => {
  console.log('⚠️ SIGTERM signal received: closing HTTP server gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed. Exiting process.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️ SIGINT signal received: exiting process.');
  process.exit(0);
});
