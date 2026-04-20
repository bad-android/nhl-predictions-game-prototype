import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

function createEmptyBracket() {
  return {
    round1: { Eastern: [null, null, null, null], Western: [null, null, null, null] },
    round2: { Eastern: [null, null], Western: [null, null] },
    confFinals: { Eastern: null, Western: null },
    cupFinal: null,
    matchups: {
      round1: {
        Eastern: [
          { top: null, bottom: null },
          { top: null, bottom: null },
          { top: null, bottom: null },
          { top: null, bottom: null },
        ],
        Western: [
          { top: null, bottom: null },
          { top: null, bottom: null },
          { top: null, bottom: null },
          { top: null, bottom: null },
        ],
      },
      round2: {
        Eastern: [
          { top: null, bottom: null },
          { top: null, bottom: null },
        ],
        Western: [
          { top: null, bottom: null },
          { top: null, bottom: null },
        ],
      },
      confFinals: {
        Eastern: { top: null, bottom: null },
        Western: { top: null, bottom: null },
      },
      cupFinal: { top: null, bottom: null },
    },
  };
}

export default function PlayoffBracket() {
  const [bracket, setBracket] = useState(createEmptyBracket);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const getTeam = useCallback(
    (abbr) => teams.find((t) => t.abbreviation === abbr) || { abbreviation: abbr, name: abbr, logo_url: '' },
    [teams]
  );

  const loadData = useCallback(async () => {
    try {
      const [teamsRes, predsRes] = await Promise.all([
        axios.get('/api/teams'),
        axios.get('/api/predictions?category=playoffs'),
      ]);
      setTeams(teamsRes.data.all || []);

      const pred = predsRes.data.predictions.find((p) => p.category === 'playoffs');
      if (pred?.payload) {
        setBracket((prev) => ({ ...prev, ...pred.payload }));
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function selectR1Winner(conference, matchupIdx, winner) {
    setBracket((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.round1[conference][matchupIdx] = winner;

      // Populate round 2 matchup
      const r2Idx = Math.floor(matchupIdx / 2);
      const pos = matchupIdx % 2 === 0 ? 'top' : 'bottom';
      next.matchups.round2[conference][r2Idx][pos] = winner;

      // Clear downstream if winner changed
      clearDownstream(next, conference, 'round2', r2Idx);
      return next;
    });
  }

  function selectR2Winner(conference, matchupIdx, winner) {
    setBracket((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.round2[conference][matchupIdx] = winner;

      const pos = matchupIdx === 0 ? 'top' : 'bottom';
      next.matchups.confFinals[conference][pos] = winner;

      clearDownstream(next, conference, 'confFinals', 0);
      return next;
    });
  }

  function selectConfFinalsWinner(conference, winner) {
    setBracket((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.confFinals[conference] = winner;

      const pos = conference === 'Eastern' ? 'top' : 'bottom';
      next.matchups.cupFinal[pos] = winner;

      // Clear cup final winner if it was from the other slot
      if (next.cupFinal && next.cupFinal !== next.matchups.cupFinal.top && next.cupFinal !== next.matchups.cupFinal.bottom) {
        next.cupFinal = null;
      }
      return next;
    });
  }

  function selectCupWinner(winner) {
    setBracket((prev) => ({ ...prev, cupFinal: winner }));
  }

  function clearDownstream(b, conference, fromRound) {
    if (fromRound === 'round2') {
      // Could clear conf finals if involved teams changed, but for simplicity,
      // we don't aggressively clear — user picks fresh selections
    }
  }

  function setR1Matchup(conference, matchupIdx, position, teamAbbr) {
    setBracket((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      next.matchups.round1[conference][matchupIdx][position] = teamAbbr;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.post('/api/predictions', {
        category: 'playoffs',
        payload: bracket,
      });
      setMessage('Playoff predictions saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  const allTeamAbbrs = teams.map((t) => t.abbreviation);

  // Gather already-used teams in round 1 matchups to prevent duplicates
  function getUsedTeams(conference) {
    const used = new Set();
    bracket.matchups.round1[conference].forEach((m) => {
      if (m.top) used.add(m.top);
      if (m.bottom) used.add(m.bottom);
    });
    return used;
  }

  const conferenceTeams = {};
  for (const t of teams) {
    if (!conferenceTeams[t.conference]) conferenceTeams[t.conference] = [];
    conferenceTeams[t.conference].push(t);
  }

  return (
    <div className="playoff-bracket">
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <p className="section-description">
        Set up Round 1 matchups by selecting teams, then pick winners to advance through each round.
      </p>

      {['Eastern', 'Western'].map((conf) => (
        <div key={conf} className="conference-bracket">
          <h2 className="conference-title">{conf} Conference</h2>

          {/* Round 1 */}
          <div className="bracket-round">
            <h3>Round 1</h3>
            <div className="matchups">
              {bracket.matchups.round1[conf].map((matchup, idx) => {
                const used = getUsedTeams(conf);
                const winner = bracket.round1[conf][idx];
                return (
                  <div key={idx} className="matchup">
                    <div className="matchup-label">Matchup {idx + 1}</div>
                    <div className="matchup-teams">
                      <TeamSlot
                        team={matchup.top ? getTeam(matchup.top) : null}
                        abbr={matchup.top}
                        isWinner={winner === matchup.top && matchup.top !== null}
                        onClick={() => matchup.top && selectR1Winner(conf, idx, matchup.top)}
                        availableTeams={(conferenceTeams[conf] || []).filter(
                          (t) => !used.has(t.abbreviation) || t.abbreviation === matchup.top
                        )}
                        onSelectTeam={(abbr) => setR1Matchup(conf, idx, 'top', abbr)}
                        showSelect
                      />
                      <span className="vs">VS</span>
                      <TeamSlot
                        team={matchup.bottom ? getTeam(matchup.bottom) : null}
                        abbr={matchup.bottom}
                        isWinner={winner === matchup.bottom && matchup.bottom !== null}
                        onClick={() => matchup.bottom && selectR1Winner(conf, idx, matchup.bottom)}
                        availableTeams={(conferenceTeams[conf] || []).filter(
                          (t) => !used.has(t.abbreviation) || t.abbreviation === matchup.bottom
                        )}
                        onSelectTeam={(abbr) => setR1Matchup(conf, idx, 'bottom', abbr)}
                        showSelect
                      />
                    </div>
                    {winner && (
                      <div className="matchup-winner">Winner: {winner}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Round 2 */}
          <div className="bracket-round">
            <h3>Round 2</h3>
            <div className="matchups">
              {bracket.matchups.round2[conf].map((matchup, idx) => {
                const winner = bracket.round2[conf][idx];
                return (
                  <div key={idx} className="matchup">
                    <div className="matchup-label">Matchup {idx + 1}</div>
                    <div className="matchup-teams">
                      <TeamSlot
                        team={matchup.top ? getTeam(matchup.top) : null}
                        abbr={matchup.top}
                        isWinner={winner === matchup.top && matchup.top !== null}
                        onClick={() => matchup.top && selectR2Winner(conf, idx, matchup.top)}
                      />
                      <span className="vs">VS</span>
                      <TeamSlot
                        team={matchup.bottom ? getTeam(matchup.bottom) : null}
                        abbr={matchup.bottom}
                        isWinner={winner === matchup.bottom && matchup.bottom !== null}
                        onClick={() => matchup.bottom && selectR2Winner(conf, idx, matchup.bottom)}
                      />
                    </div>
                    {winner && (
                      <div className="matchup-winner">Winner: {winner}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conference Finals */}
          <div className="bracket-round">
            <h3>Conference Final</h3>
            <div className="matchups">
              <div className="matchup">
                <div className="matchup-teams">
                  <TeamSlot
                    team={bracket.matchups.confFinals[conf].top ? getTeam(bracket.matchups.confFinals[conf].top) : null}
                    abbr={bracket.matchups.confFinals[conf].top}
                    isWinner={bracket.confFinals[conf] === bracket.matchups.confFinals[conf].top && bracket.matchups.confFinals[conf].top !== null}
                    onClick={() => bracket.matchups.confFinals[conf].top && selectConfFinalsWinner(conf, bracket.matchups.confFinals[conf].top)}
                  />
                  <span className="vs">VS</span>
                  <TeamSlot
                    team={bracket.matchups.confFinals[conf].bottom ? getTeam(bracket.matchups.confFinals[conf].bottom) : null}
                    abbr={bracket.matchups.confFinals[conf].bottom}
                    isWinner={bracket.confFinals[conf] === bracket.matchups.confFinals[conf].bottom && bracket.matchups.confFinals[conf].bottom !== null}
                    onClick={() => bracket.matchups.confFinals[conf].bottom && selectConfFinalsWinner(conf, bracket.matchups.confFinals[conf].bottom)}
                  />
                </div>
                {bracket.confFinals[conf] && (
                  <div className="matchup-winner">Winner: {bracket.confFinals[conf]}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Stanley Cup Final */}
      <div className="cup-final-section">
        <h2>🏆 Stanley Cup Final</h2>
        <div className="matchup cup-final-matchup">
          <div className="matchup-teams">
            <TeamSlot
              team={bracket.matchups.cupFinal.top ? getTeam(bracket.matchups.cupFinal.top) : null}
              abbr={bracket.matchups.cupFinal.top}
              isWinner={bracket.cupFinal === bracket.matchups.cupFinal.top && bracket.matchups.cupFinal.top !== null}
              onClick={() => bracket.matchups.cupFinal.top && selectCupWinner(bracket.matchups.cupFinal.top)}
              label="Eastern Champion"
            />
            <span className="vs">VS</span>
            <TeamSlot
              team={bracket.matchups.cupFinal.bottom ? getTeam(bracket.matchups.cupFinal.bottom) : null}
              abbr={bracket.matchups.cupFinal.bottom}
              isWinner={bracket.cupFinal === bracket.matchups.cupFinal.bottom && bracket.matchups.cupFinal.bottom !== null}
              onClick={() => bracket.matchups.cupFinal.bottom && selectCupWinner(bracket.matchups.cupFinal.bottom)}
              label="Western Champion"
            />
          </div>
          {bracket.cupFinal && (
            <div className="matchup-winner cup-winner">
              🏆 Stanley Cup Champion: {bracket.cupFinal}
            </div>
          )}
        </div>
      </div>

      <button className="btn btn-primary btn-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Playoff Predictions'}
      </button>
    </div>
  );
}

function TeamSlot({ team, abbr, isWinner, onClick, availableTeams, onSelectTeam, showSelect, label }) {
  if (!abbr && showSelect && availableTeams) {
    return (
      <div className="team-slot empty">
        <select onChange={(e) => e.target.value && onSelectTeam(e.target.value)} value="">
          <option value="">Select team...</option>
          {availableTeams.map((t) => (
            <option key={t.abbreviation} value={t.abbreviation}>
              {t.abbreviation} - {t.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (!abbr) {
    return (
      <div className="team-slot empty">
        <span className="empty-label">{label || 'TBD'}</span>
      </div>
    );
  }

  return (
    <div
      className={`team-slot ${isWinner ? 'winner' : ''}`}
      onClick={onClick}
      title="Click to select as winner"
    >
      {showSelect && availableTeams && (
        <select
          value={abbr}
          onChange={(e) => onSelectTeam(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="team-slot-select"
        >
          <option value="">Select...</option>
          {availableTeams.map((t) => (
            <option key={t.abbreviation} value={t.abbreviation}>
              {t.abbreviation}
            </option>
          ))}
          {/* Keep current selection even if not in available list */}
          {!availableTeams.find((t) => t.abbreviation === abbr) && (
            <option value={abbr}>{abbr}</option>
          )}
        </select>
      )}
      {team?.logo_url && (
        <img
          src={team.logo_url}
          alt={team.name || abbr}
          className="team-logo-small"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <span className="team-slot-name">{abbr}</span>
      {isWinner && <span className="winner-badge">✓</span>}
    </div>
  );
}
