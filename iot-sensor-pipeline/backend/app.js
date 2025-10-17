require('dotenv').config();
const express = require('express');
const http = require('http');
const { Pool } = require('pg');
const mqtt = require('mqtt');
const { Server } = require('socket.io');

const app = express();
const port = process.env.PORT || 3000;

// HTTP server + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  // Si necesitas restringir orígenes en producción añade origin aquí
  cors: { origin: '*' }
});

app.use(express.json());
// servir archivos estáticos (frontend)
app.use(express.static('public'));

// PostgreSQL connection
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: 5432,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
  process.exit(-1);
});

// MQTT connection
const mqttClient = mqtt.connect(process.env.MQTT_BROKER, { reconnectPeriod: 5000 });

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('sensors/temperature', (err) => {
    if (err) {
      console.error('Subscription error:', err);
    } else {
      console.log('Subscribed to sensors/temperature');
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('MQTT error:', err.message);
});

mqttClient.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());
    // basic validation
    const temperature = parseFloat(payload.temperature);
    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
    if (Number.isNaN(temperature)) {
      console.warn('Invalid temperature received, skipping:', payload);
      return;
    }

    const insertResult = await pool.query(
      'INSERT INTO readings (temperature, timestamp) VALUES ($1, $2) RETURNING id',
      [temperature, timestamp]
    );

    const inserted = {
      id: insertResult.rows[0].id,
      temperature,
      timestamp: timestamp.toISOString()
    };

    console.log('Data inserted:', inserted);

    // Emit real-time update to all connected socket.io clients
    io.emit('reading', inserted);
  } catch (error) {
    console.error('Insert error:', error.message);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get readings with optional limit param (default 100)
app.get('/api/readings', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000); // cap limit to 1000
  try {
    const result = await pool.query(
      'SELECT * FROM readings ORDER BY timestamp DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('DB error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get latest reading
app.get('/api/readings/latest', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1'
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'No readings' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('DB error:', error.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Handle socket connections (optional logging)
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Start server (HTTP + socket.io)
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down...');
  mqttClient.end();
  io.close();
  server.close(() => {
    pool.end().then(() => process.exit(0));
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);