const mongoose = require('mongoose');
const dns = require('dns');

// Configure public DNS resolvers to prevent Windows querySrv ECONNREFUSED
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore in restricted environments
}

let isConnecting = false;
let hasConnectedOnce = false;

const connectDB = async () => {
  if (isConnecting) return;
  isConnecting = true;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    isConnecting = false;
  } catch (error) {
    isConnecting = false;
    console.error(`\n[MongoDB Connection Error]: ${error.message}`);

    if (error.message.includes('querySrv') || error.code === 'ECONNREFUSED') {
      console.error(
        '💡 [DNS SRV Notice]: Your local network/ISP DNS is refusing SRV records.\n' +
        '   Direct replica set connection string is recommended in backend/.env to bypass SRV queries completely.'
      );
    }

    if (error.message.includes('whitelist') || error.message.includes('Could not connect to any servers')) {
      console.error(
        '🔒 [Atlas IP Whitelist Notice]: MongoDB Atlas is blocking your current IP.\n' +
        '   1. Go to https://cloud.mongodb.com -> Security -> Network Access\n' +
        '   2. Click "Add IP Address" -> Select "Allow Access from Anywhere" (0.0.0.0/0) or "Add Current IP Address".\n' +
        '   3. Changes take about 1 minute to apply in Atlas.'
      );
    }

    // In development mode, retry periodically instead of terminating nodemon in a crash loop
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[MongoDB] Will retry connection in 10 seconds... (Server remains active on port 5000)\n');
      setTimeout(() => {
        connectDB();
      }, 10000);
    } else {
      process.exit(1);
    }
  }
};

mongoose.connection.on('connected', () => {
  hasConnectedOnce = true;
});

mongoose.connection.on('disconnected', () => {
  if (hasConnectedOnce) {
    console.warn('[MongoDB] Connection lost. Attempting reconnection...');
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB] Reconnected successfully.');
});

module.exports = connectDB;
