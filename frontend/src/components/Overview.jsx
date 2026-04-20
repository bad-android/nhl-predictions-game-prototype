import { useState, useEffect } from 'react';
import axios from 'axios';

const TROPHIES = [
  { id: 'hart', name: 'Hart Trophy' },
  { id: 'vezina', name: 'Vezina Trophy' },
  { id: 'norris', name: 'Norris Trophy' },
  { id: 'calder', name: 'Calder Trophy' },
  { id: 'art_ross', name: 'Art Ross Trophy' },
  { id: 'rocket_richard', name: 'Rocket Richard Trophy' },
  { id: 'selke', name: 'Selke Trophy' },
  { id: 'conn_smythe', name: 'Conn Smythe Trophy' },
];

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('regular');

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get('/api/overview');
        setData(res.data);
      } catch (err) {
        setError('Failed to load overview');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="loading">Loading overview...</div>;
  if (!data) return <div className="error-message">{error || 'No data'}</div>;

  const { players, overview } = data;
  const sections = [
    { id: 'regular', label: 'Regular Season' },
    { id: 'trophies', label: 'Player Trophies' },
    { id: 'playoffs', label: 'Playoffs' },
  ];

  return (
    <div className="overview-page">
      <h1 className="page-title">All Predictions Overview</h1>
      {error && <div className="error-message">{error}</div>}

      <div className="tabs">
        {sections.map((s) => (
          <button
            key={s.id}
            className={`tab ${activeSection === s.id ? 'active' : ''}`}
            onClick={() => setActiveSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeSection === 'regular' && (
          <RegularOverview overview={overview.regular} players={players} />
        )}
        {activeSection === 'trophies' && (
          <TrophiesOverview overview={overview.trophies} players={players} />
        )}
        {activeSection === 'playoffs' && (
          <PlayoffsOverview overview={overview.playoffs} players={players} />
        )}
      </div>
    </div>
  );
}

function RegularOverview({ overview, players }) {
  if (!overview) return <div className="empty-state">No predictions yet</div>;

  return (
    <div className="overview-section">
      <h2>Regular Season Predictions</h2>
      <div className="overview-grid">
        {players.map((player) => {
          const pred = overview[player.username]?.prediction;
          return (
            <div key={player.username} className="player-predictions-card">
              <h3>{player.display_name}</h3>
              {!pred ? (
                <p className="no-prediction">No predictions yet</p>
              ) : (
                <>
                  {['Eastern', 'Western'].map((conf) => (
                    <div key={conf} className="mini-section">
                      <h4>{conf} Playoff Teams</h4>
                      <div className="team-tags">
                        {(pred.playoffTeams?.[conf] || []).map((abbr) => (
                          <span key={abbr} className="team-tag">
                            {abbr}
                            {Object.values(pred.divisionWinners || {}).includes(abbr) && (
                              <span className="div-winner-badge" title="Division Winner">★</span>
                            )}
                          </span>
                        ))}
                        {(!pred.playoffTeams?.[conf] || pred.playoffTeams[conf].length === 0) && (
                          <span className="no-data">None selected</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="mini-section">
                    <span className="pick-label">Presidents&apos; Trophy:</span>{' '}
                    <strong>{pred.presidentsTrophy || '—'}</strong>
                  </div>
                  <div className="mini-section">
                    <span className="pick-label">Stanley Cup:</span>{' '}
                    <strong>{pred.stanleyCupWinner || '—'}</strong>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TrophiesOverview({ overview, players }) {
  if (!overview) return <div className="empty-state">No predictions yet</div>;

  return (
    <div className="overview-section">
      <h2>Trophy Predictions</h2>
      <div className="table-container">
        <table className="overview-table">
          <thead>
            <tr>
              <th>Award</th>
              {players.map((p) => (
                <th key={p.username}>{p.display_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TROPHIES.map((trophy) => (
              <tr key={trophy.id}>
                <td className="trophy-name-cell">{trophy.name}</td>
                {players.map((player) => {
                  const pred = overview[player.username]?.prediction;
                  const picks = pred?.trophies?.[trophy.id] || [];
                  return (
                    <td key={player.username}>
                      {picks.filter(Boolean).length > 0 ? (
                        <ol className="finalist-list">
                          {picks.filter(Boolean).map((name, i) => (
                            <li key={i}>{name}</li>
                          ))}
                        </ol>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayoffsOverview({ overview, players }) {
  if (!overview) return <div className="empty-state">No predictions yet</div>;

  return (
    <div className="overview-section">
      <h2>Playoff Bracket Predictions</h2>
      <div className="overview-grid">
        {players.map((player) => {
          const pred = overview[player.username]?.prediction;
          return (
            <div key={player.username} className="player-predictions-card">
              <h3>{player.display_name}</h3>
              {!pred ? (
                <p className="no-prediction">No predictions yet</p>
              ) : (
                <>
                  {['Eastern', 'Western'].map((conf) => (
                    <div key={conf} className="mini-section">
                      <h4>{conf}</h4>
                      <div className="bracket-mini">
                        <div className="round-mini">
                          <span className="round-label">R1:</span>
                          <div className="team-tags">
                            {(pred.round1?.[conf] || []).filter(Boolean).map((abbr, i) => (
                              <span key={i} className="team-tag">{abbr}</span>
                            ))}
                            {(!pred.round1?.[conf] || pred.round1[conf].filter(Boolean).length === 0) && (
                              <span className="no-data">—</span>
                            )}
                          </div>
                        </div>
                        <div className="round-mini">
                          <span className="round-label">R2:</span>
                          <div className="team-tags">
                            {(pred.round2?.[conf] || []).filter(Boolean).map((abbr, i) => (
                              <span key={i} className="team-tag">{abbr}</span>
                            ))}
                            {(!pred.round2?.[conf] || pred.round2[conf].filter(Boolean).length === 0) && (
                              <span className="no-data">—</span>
                            )}
                          </div>
                        </div>
                        <div className="round-mini">
                          <span className="round-label">CF:</span>
                          <span className="team-tag">
                            {pred.confFinals?.[conf] || '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mini-section cup-winner-mini">
                    <span className="pick-label">🏆 Cup Winner:</span>{' '}
                    <strong>{pred.cupFinal || '—'}</strong>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
