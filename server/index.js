const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load this server's env file even when npm/node is started from the project root.
dotenv.config({ path: path.join(__dirname, '.env') });

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/bookings');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/bookings', bookingRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MongoDB connection failed: MONGO_URI is missing from server/.env.');
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB Connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    const message = error.message || '';
    let hint = 'check Atlas Network Access, database credentials, and MONGO_URI';
    if (message.includes('ETIMEOUT') || message.includes('ENOTFOUND')) {
      hint = 'Atlas DNS lookup timed out; check network/DNS and try again';
    } else if (message.toLowerCase().includes('authentication failed') || message.toLowerCase().includes('bad auth')) {
      hint = 'Atlas rejected the database username or password';
    } else if (message.toLowerCase().includes('whitelist') || message.toLowerCase().includes('ip address')) {
      hint = 'add this network’s current public IP in Atlas Network Access';
    }
    console.error(`MongoDB connection failed: ${hint}. (${error.name || 'connection error'})`);
    process.exitCode = 1;
  }
}

startServer();
