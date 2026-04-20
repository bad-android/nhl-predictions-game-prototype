const express = require('express');
const { db, getActiveSeason } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const season = getActiveSeason();
    if (!season) {
      return res.status(404).json({ error: 'No active season found' });
    }

    const users = db.prepare('SELECT id, username, display_name FROM users').all();

    const predictions = db.prepare(`
      SELECT p.*, u.username, u.display_name
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      WHERE p.season_id = ?
    `).all(season.id);

    const results = db.prepare(
      'SELECT * FROM results WHERE season_id = ?'
    ).all(season.id);

    // Group predictions by category, then by user
    const categories = ['regular', 'trophies', 'playoffs'];
    const overview = {};

    for (const category of categories) {
      overview[category] = {};
      for (const user of users) {
        const pred = predictions.find(
          (p) => p.user_id === user.id && p.category === category
        );
        overview[category][user.username] = {
          display_name: user.display_name,
          prediction: pred ? JSON.parse(pred.payload) : null,
        };
      }
    }

    const parsedResults = {};
    for (const result of results) {
      parsedResults[result.category] = JSON.parse(result.payload);
    }

    res.json({
      players: users.map((u) => ({ username: u.username, display_name: u.display_name })),
      overview,
      results: parsedResults,
    });
  } catch (err) {
    console.error('Overview fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
