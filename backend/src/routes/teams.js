const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
  try {
    const teams = db.prepare(
      'SELECT * FROM teams ORDER BY conference, division, name'
    ).all();

    const grouped = {};
    for (const team of teams) {
      if (!grouped[team.conference]) {
        grouped[team.conference] = {};
      }
      if (!grouped[team.conference][team.division]) {
        grouped[team.conference][team.division] = [];
      }
      grouped[team.conference][team.division].push(team);
    }

    res.json({ teams: grouped, all: teams });
  } catch (err) {
    console.error('Teams fetch error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
