const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const teamsRoutes = require('./routes/teams');
const predictionsRoutes = require('./routes/predictions');
const resultsRoutes = require('./routes/results');
const leaderboardRoutes = require('./routes/leaderboard');
const overviewRoutes = require('./routes/overview');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Initialize database
initializeDatabase();
console.log('Database initialized successfully');

// API routes
app.use('/api', authRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/predictions', predictionsRoutes);
app.use('/api/results', resultsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/overview', overviewRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend files if they exist
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`NHL Predictions Backend running on port ${PORT}`);
});

module.exports = app;
