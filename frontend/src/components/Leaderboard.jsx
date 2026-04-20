import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('/api/leaderboard');
        setLeaderboard(res.data.leaderboard || []);
      } catch (err) {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading leaderboard...</div>;

  return (
    <div className="leaderboard-page">
      <h1 className="page-title">Leaderboard</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Total Points</th>
              <th>Regular Season</th>
              <th>Trophies</th>
              <th>Playoffs</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => {
              const isCurrentUser = entry.username === user?.username;
              const breakdown = entry.breakdown || {};
              return (
                <tr key={entry.user_id} className={isCurrentUser ? 'current-user' : ''}>
                  <td className="rank">{idx + 1}</td>
                  <td className="player-name">
                    {entry.display_name || entry.username}
                    {isCurrentUser && <span className="you-badge">YOU</span>}
                  </td>
                  <td className="points total-points">{entry.total_points || 0}</td>
                  <td className="points">{breakdown.regular ?? '—'}</td>
                  <td className="points">{breakdown.trophies ?? '—'}</td>
                  <td className="points">{breakdown.playoffs ?? '—'}</td>
                </tr>
              );
            })}
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan="6" className="empty-state">No scores yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
