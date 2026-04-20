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

    const { category } = req.query;
    let predictions;

    if (category) {
      predictions = db.prepare(
        'SELECT * FROM predictions WHERE user_id = ? AND season_id = ? AND category = ?'
      ).all(req.user.id, season.id, category);
    } else {
      predictions = db.prepare(
        'SELECT * FROM predictions WHERE user_id = ? AND season_id = ?'
      ).all(req.user.id, season.id);
    }

    const parsed = predictions.map((p) => ({
      ...p,
      payload: JSON.parse(p.payload),
    }));

    res.json({ predictions: parsed });
  } catch (err) {
    console.error('Predictions fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/all', authenticateToken, (req, res) => {
  try {
    const season = getActiveSeason();
    if (!season) {
      return res.status(404).json({ error: 'No active season found' });
    }

    const predictions = db.prepare(`
      SELECT p.*, u.username, u.display_name
      FROM predictions p
      JOIN users u ON p.user_id = u.id
      WHERE p.season_id = ?
      ORDER BY u.username, p.category
    `).all(season.id);

    const parsed = predictions.map((p) => ({
      ...p,
      payload: JSON.parse(p.payload),
    }));

    res.json({ predictions: parsed });
  } catch (err) {
    console.error('All predictions fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    const season = getActiveSeason();
    if (!season) {
      return res.status(404).json({ error: 'No active season found' });
    }

    const { category, payload } = req.body;

    if (!category || !payload) {
      return res.status(400).json({ error: 'Category and payload are required' });
    }

    const validCategories = ['regular', 'trophies', 'playoffs'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const payloadStr = JSON.stringify(payload);

    const existing = db.prepare(
      'SELECT id FROM predictions WHERE user_id = ? AND season_id = ? AND category = ?'
    ).get(req.user.id, season.id, category);

    if (existing) {
      db.prepare(
        "UPDATE predictions SET payload = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(payloadStr, existing.id);
    } else {
      db.prepare(
        'INSERT INTO predictions (user_id, season_id, category, payload) VALUES (?, ?, ?, ?)'
      ).run(req.user.id, season.id, category, payloadStr);
    }

    res.json({ success: true, message: 'Prediction saved successfully' });
  } catch (err) {
    console.error('Prediction save error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
