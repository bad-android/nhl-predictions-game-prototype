# NHL Predictions Game Prototype

A web-based NHL prediction game where players can enter predictions for the NHL season, including playoff teams, division winners, player trophies, and playoff brackets.

## Features

- **Regular Season Predictions**: Select playoff teams (8 per conference), division winners, Presidents' Trophy, and Stanley Cup winner
- **Player Trophy Predictions**: Predict top 3 finalists for major NHL awards
- **Playoff Bracket**: Visual bracket UI with automatic winner progression
- **Scoring Engine**: Configurable automatic score calculation
- **Leaderboard**: Real-time player rankings with score breakdown
- **Overview**: Side-by-side comparison of all players' predictions

## Quick Start with Docker

```bash
# Build the Docker image
docker build -t nhl-predictions .

# Run the container
docker run -p 3000:3000 -v nhl-data:/data nhl-predictions
```

Then open http://localhost:3000 in your browser.

### Login Credentials

| Username  | Password   |
|-----------|------------|
| sebastian | start123   |
| erik      | erik123    |
| marcus    | marcus123  |

## Local Development

### Prerequisites

- Node.js 20+
- npm

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on http://localhost:3001.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on http://localhost:3000 and proxies API requests to the backend.

## Architecture

- **Frontend**: React + Vite (SPA)
- **Backend**: Express.js + SQLite (better-sqlite3)
- **Authentication**: JWT tokens with static credentials
- **Database**: SQLite with persistent storage via Docker volume
- **Deployment**: Single Docker container serving both frontend and backend

## API Endpoints

| Method | Endpoint             | Description                        |
|--------|---------------------|------------------------------------|
| POST   | /api/login          | Authenticate user                  |
| GET    | /api/teams          | Get all NHL teams by conference    |
| GET    | /api/predictions    | Get current user's predictions     |
| GET    | /api/predictions/all| Get all players' predictions       |
| POST   | /api/predictions    | Save/update predictions            |
| GET    | /api/results        | Get actual season results          |
| POST   | /api/results        | Save results (admin only)          |
| GET    | /api/leaderboard    | Get player rankings                |
| GET    | /api/overview       | Get all predictions for comparison |
| GET    | /api/health         | Health check                       |

## Scoring Configuration

| Category          | Prediction                  | Points |
|-------------------|-----------------------------|--------|
| Regular Season    | Correct playoff team        | 2      |
| Regular Season    | Correct division winner     | 5      |
| Regular Season    | Correct Presidents' Trophy  | 10     |
| Regular Season    | Correct Stanley Cup winner  | 15     |
| Player Trophies   | Correct finalist            | 5      |
| Playoffs          | Round 1 winner              | 5      |
| Playoffs          | Round 2 winner              | 10     |
| Playoffs          | Conference Finals winner    | 15     |
| Playoffs          | Stanley Cup Finals winner   | 20     |
| Playoffs          | Correct Stanley Cup winner  | 25     |
