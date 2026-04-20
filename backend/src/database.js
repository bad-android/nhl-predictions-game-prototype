const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : path.join(__dirname, '..', 'data'));
const DB_PATH = path.join(DATA_DIR, 'nhl-predictions.db');

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      year_start INTEGER NOT NULL,
      year_end INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      abbreviation TEXT UNIQUE NOT NULL,
      conference TEXT NOT NULL,
      division TEXT NOT NULL,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      UNIQUE(user_id, season_id, category)
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      season_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      UNIQUE(season_id, category)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      season_id INTEGER NOT NULL,
      total_points INTEGER NOT NULL DEFAULT 0,
      breakdown TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (season_id) REFERENCES seasons(id),
      UNIQUE(user_id, season_id)
    );
  `);

  seedData();
}

function seedData() {
  const seasonCount = db.prepare('SELECT COUNT(*) as count FROM seasons').get();
  if (seasonCount.count === 0) {
    db.prepare(
      'INSERT INTO seasons (name, year_start, year_end, active) VALUES (?, ?, ?, ?)'
    ).run('2025/2026', 2025, 2026, 1);
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    const users = [
      { username: 'sebastian', password: 'start123', display_name: 'Sebastian' },
      { username: 'erik', password: 'erik123', display_name: 'Erik' },
      { username: 'marcus', password: 'marcus123', display_name: 'Marcus' },
    ];

    const insertUser = db.prepare(
      'INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)'
    );

    for (const user of users) {
      const hash = bcrypt.hashSync(user.password, 10);
      insertUser.run(user.username, hash, user.display_name);
    }
  }

  const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams').get();
  if (teamCount.count === 0) {
    seedTeams();
  }
}

function seedTeams() {
  const teams = [
    // Eastern Conference - Atlantic Division
    { name: 'Boston Bruins', abbreviation: 'BOS', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Buffalo Sabres', abbreviation: 'BUF', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Detroit Red Wings', abbreviation: 'DET', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Florida Panthers', abbreviation: 'FLA', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Montreal Canadiens', abbreviation: 'MTL', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Ottawa Senators', abbreviation: 'OTT', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Tampa Bay Lightning', abbreviation: 'TBL', conference: 'Eastern', division: 'Atlantic' },
    { name: 'Toronto Maple Leafs', abbreviation: 'TOR', conference: 'Eastern', division: 'Atlantic' },

    // Eastern Conference - Metropolitan Division
    { name: 'Carolina Hurricanes', abbreviation: 'CAR', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'Columbus Blue Jackets', abbreviation: 'CBJ', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'New Jersey Devils', abbreviation: 'NJD', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'New York Islanders', abbreviation: 'NYI', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'New York Rangers', abbreviation: 'NYR', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'Philadelphia Flyers', abbreviation: 'PHI', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'Pittsburgh Penguins', abbreviation: 'PIT', conference: 'Eastern', division: 'Metropolitan' },
    { name: 'Washington Capitals', abbreviation: 'WSH', conference: 'Eastern', division: 'Metropolitan' },

    // Western Conference - Central Division
    { name: 'Utah Hockey Club', abbreviation: 'UTA', conference: 'Western', division: 'Central' },
    { name: 'Chicago Blackhawks', abbreviation: 'CHI', conference: 'Western', division: 'Central' },
    { name: 'Colorado Avalanche', abbreviation: 'COL', conference: 'Western', division: 'Central' },
    { name: 'Dallas Stars', abbreviation: 'DAL', conference: 'Western', division: 'Central' },
    { name: 'Minnesota Wild', abbreviation: 'MIN', conference: 'Western', division: 'Central' },
    { name: 'Nashville Predators', abbreviation: 'NSH', conference: 'Western', division: 'Central' },
    { name: 'St. Louis Blues', abbreviation: 'STL', conference: 'Western', division: 'Central' },
    { name: 'Winnipeg Jets', abbreviation: 'WPG', conference: 'Western', division: 'Central' },

    // Western Conference - Pacific Division
    { name: 'Anaheim Ducks', abbreviation: 'ANA', conference: 'Western', division: 'Pacific' },
    { name: 'Calgary Flames', abbreviation: 'CGY', conference: 'Western', division: 'Pacific' },
    { name: 'Edmonton Oilers', abbreviation: 'EDM', conference: 'Western', division: 'Pacific' },
    { name: 'Los Angeles Kings', abbreviation: 'LAK', conference: 'Western', division: 'Pacific' },
    { name: 'Seattle Kraken', abbreviation: 'SEA', conference: 'Western', division: 'Pacific' },
    { name: 'San Jose Sharks', abbreviation: 'SJS', conference: 'Western', division: 'Pacific' },
    { name: 'Vancouver Canucks', abbreviation: 'VAN', conference: 'Western', division: 'Pacific' },
    { name: 'Vegas Golden Knights', abbreviation: 'VGK', conference: 'Western', division: 'Pacific' },
  ];

  const insertTeam = db.prepare(
    'INSERT INTO teams (name, abbreviation, conference, division, logo_url) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((teams) => {
    for (const team of teams) {
      const logoUrl = `https://assets.nhle.com/logos/nhl/svg/${team.abbreviation}_light.svg`;
      insertTeam.run(team.name, team.abbreviation, team.conference, team.division, logoUrl);
    }
  });

  insertMany(teams);
}

function getActiveSeason() {
  return db.prepare('SELECT * FROM seasons WHERE active = 1').get();
}

module.exports = { db, initializeDatabase, getActiveSeason };
