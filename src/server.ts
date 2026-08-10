import 'dotenv/config';
import http from 'http';
import app from './app';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│        FundForge API Server              │');
  console.log('├─────────────────────────────────────────┤');
  console.log(`│  🚀 Running on port      : ${PORT}          │`);
  console.log(`│  🌍 Environment          : ${NODE_ENV}  │`);
  console.log(`│  📡 URL                  : http://localhost:${PORT} │`);
  console.log('└─────────────────────────────────────────┘');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

export default server;
