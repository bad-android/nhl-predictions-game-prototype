const { db } = require('./database');

const SCORING_CONFIG = {
  regular: {
    correctPlayoffTeam: 2,
    correctDivisionWinner: 5,
    correctPresidentsTrophy: 10,
    correctStanleyCupWinner: 15,
  },
  trophies: {
    correctFinalist: 5,
  },
  playoffs: {
    round1: 5,
    round2: 10,
    conferenceFinals: 15,
    stanleyCupFinals: 20,
    correctStanleyCupWinner: 25,
  },
};

function scoreRegularSeason(prediction, result) {
  let points = 0;
  const details = {};

  // Score playoff teams (teams predicted to make playoffs)
  if (prediction.playoffTeams && result.playoffTeams) {
    const correctTeams = prediction.playoffTeams.filter((t) =>
      result.playoffTeams.includes(t)
    );
    const teamPoints = correctTeams.length * SCORING_CONFIG.regular.correctPlayoffTeam;
    points += teamPoints;
    details.playoffTeams = { correct: correctTeams.length, points: teamPoints };
  }

  // Score division winners
  if (prediction.divisionWinners && result.divisionWinners) {
    let divPoints = 0;
    let correctDivs = 0;
    const divisions = Object.keys(result.divisionWinners);
    for (const div of divisions) {
      if (prediction.divisionWinners[div] === result.divisionWinners[div]) {
        divPoints += SCORING_CONFIG.regular.correctDivisionWinner;
        correctDivs++;
      }
    }
    points += divPoints;
    details.divisionWinners = { correct: correctDivs, points: divPoints };
  }

  // Score Presidents' Trophy
  if (prediction.presidentsTrophy && result.presidentsTrophy) {
    if (prediction.presidentsTrophy === result.presidentsTrophy) {
      points += SCORING_CONFIG.regular.correctPresidentsTrophy;
      details.presidentsTrophy = { correct: true, points: SCORING_CONFIG.regular.correctPresidentsTrophy };
    } else {
      details.presidentsTrophy = { correct: false, points: 0 };
    }
  }

  // Score Stanley Cup Winner prediction in regular season category
  if (prediction.stanleyCupWinner && result.stanleyCupWinner) {
    if (prediction.stanleyCupWinner === result.stanleyCupWinner) {
      points += SCORING_CONFIG.regular.correctStanleyCupWinner;
      details.stanleyCupWinner = { correct: true, points: SCORING_CONFIG.regular.correctStanleyCupWinner };
    } else {
      details.stanleyCupWinner = { correct: false, points: 0 };
    }
  }

  return { points, details };
}

function scoreTrophies(prediction, result) {
  let points = 0;
  const details = {};

  // Each trophy has finalists; score correct finalist picks
  if (prediction.trophies && result.trophies) {
    const trophyNames = Object.keys(result.trophies);
    for (const trophy of trophyNames) {
      const predFinalists = prediction.trophies[trophy] || [];
      const resultFinalists = result.trophies[trophy] || [];
      const correct = predFinalists.filter((f) => resultFinalists.includes(f));
      const trophyPoints = correct.length * SCORING_CONFIG.trophies.correctFinalist;
      points += trophyPoints;
      details[trophy] = { correct: correct.length, points: trophyPoints };
    }
  }

  return { points, details };
}

function scorePlayoffs(prediction, result) {
  let points = 0;
  const details = {};

  const rounds = [
    { key: 'round1', config: SCORING_CONFIG.playoffs.round1 },
    { key: 'round2', config: SCORING_CONFIG.playoffs.round2 },
    { key: 'conferenceFinals', config: SCORING_CONFIG.playoffs.conferenceFinals },
    { key: 'stanleyCupFinals', config: SCORING_CONFIG.playoffs.stanleyCupFinals },
  ];

  for (const round of rounds) {
    if (prediction[round.key] && result[round.key]) {
      const predWinners = Array.isArray(prediction[round.key])
        ? prediction[round.key]
        : [prediction[round.key]];
      const resultWinners = Array.isArray(result[round.key])
        ? result[round.key]
        : [result[round.key]];

      const correct = predWinners.filter((w) => resultWinners.includes(w));
      const roundPoints = correct.length * round.config;
      points += roundPoints;
      details[round.key] = { correct: correct.length, points: roundPoints };
    }
  }

  // Stanley Cup Winner
  if (prediction.stanleyCupWinner && result.stanleyCupWinner) {
    if (prediction.stanleyCupWinner === result.stanleyCupWinner) {
      points += SCORING_CONFIG.playoffs.correctStanleyCupWinner;
      details.stanleyCupWinner = { correct: true, points: SCORING_CONFIG.playoffs.correctStanleyCupWinner };
    } else {
      details.stanleyCupWinner = { correct: false, points: 0 };
    }
  }

  return { points, details };
}

function calculateScores(seasonId) {
  const users = db.prepare('SELECT * FROM users').all();
  const results = db.prepare('SELECT * FROM results WHERE season_id = ?').all(seasonId);

  const resultMap = {};
  for (const r of results) {
    resultMap[r.category] = JSON.parse(r.payload);
  }

  for (const user of users) {
    const predictions = db.prepare(
      'SELECT * FROM predictions WHERE user_id = ? AND season_id = ?'
    ).all(user.id, seasonId);

    let totalPoints = 0;
    const breakdown = {};

    for (const pred of predictions) {
      const predPayload = JSON.parse(pred.payload);
      const resultPayload = resultMap[pred.category];

      if (!resultPayload) continue;

      let score;
      switch (pred.category) {
        case 'regular':
          score = scoreRegularSeason(predPayload, resultPayload);
          break;
        case 'trophies':
          score = scoreTrophies(predPayload, resultPayload);
          break;
        case 'playoffs':
          score = scorePlayoffs(predPayload, resultPayload);
          break;
        default:
          continue;
      }

      totalPoints += score.points;
      breakdown[pred.category] = score;
    }

    const existing = db.prepare(
      'SELECT id FROM scores WHERE user_id = ? AND season_id = ?'
    ).get(user.id, seasonId);

    const breakdownStr = JSON.stringify(breakdown);

    if (existing) {
      db.prepare(
        "UPDATE scores SET total_points = ?, breakdown = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(totalPoints, breakdownStr, existing.id);
    } else {
      db.prepare(
        'INSERT INTO scores (user_id, season_id, total_points, breakdown) VALUES (?, ?, ?, ?)'
      ).run(user.id, seasonId, totalPoints, breakdownStr);
    }
  }
}

module.exports = { calculateScores, SCORING_CONFIG };
