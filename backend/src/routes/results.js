const express = require('express');
const { db, getActiveSeason } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { calculateScores } = require('../scoring');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const season = getActiveSeason();
    if (!season) {
      return res.status(404).json({ error: 'No active season found' });
    }

    const results = db.prepare(
      'SELECT * FROM results WHERE season_id = ?'
    ).all(season.id);

    const parsed = results.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload),
    }));

    res.json({ results: parsed });
  } catch (err) {
    console.error('Results fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  try {
    if (req.user.username !== 'sebastian') {
      return res.status(403).json({ error: 'Only admin can update results' });
    }

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
      'SELECT id FROM results WHERE season_id = ? AND category = ?'
    ).get(season.id, category);

    if (existing) {
      db.prepare(
        "UPDATE results SET payload = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(payloadStr, existing.id);
    } else {
      db.prepare(
        'INSERT INTO results (season_id, category, payload) VALUES (?, ?, ?)'
      ).run(season.id, category, payloadStr);
    }

    // Recalculate scores after results update
    calculateScores(season.id);

    res.json({ success: true, message: 'Results saved and scores recalculated' });
  } catch (err) {
    console.error('Results save error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
