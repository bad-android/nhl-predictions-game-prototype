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

    const scores = db.prepare(`
      SELECT s.*, u.username, u.display_name
      FROM scores s
      JOIN users u ON s.user_id = u.id
      WHERE s.season_id = ?
      ORDER BY s.total_points DESC
    `).all(season.id);

    const parsed = scores.map((s) => ({
      ...s,
      breakdown: s.breakdown ? JSON.parse(s.breakdown) : null,
    }));

    // Include users with no scores yet
    const allUsers = db.prepare('SELECT id, username, display_name FROM users').all();
    const scoredUserIds = new Set(parsed.map((s) => s.user_id));

    const leaderboard = [
      ...parsed,
      ...allUsers
        .filter((u) => !scoredUserIds.has(u.id))
        .map((u) => ({
          user_id: u.id,
          username: u.username,
          display_name: u.display_name,
          season_id: season.id,
          total_points: 0,
          breakdown: null,
        })),
    ];

    res.json({ leaderboard });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
