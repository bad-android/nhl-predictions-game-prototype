import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export default function RegularSeason() {
  const [teams, setTeams] = useState(null);
  const [playoffTeams, setPlayoffTeams] = useState({ Eastern: [], Western: [] });
  const [divisionWinners, setDivisionWinners] = useState({});
  const [presidentsTrophy, setPresidentsTrophy] = useState('');
  const [stanleyCupWinner, setStanleyCupWinner] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [teamsRes, predsRes] = await Promise.all([
        axios.get('/api/teams'),
        axios.get('/api/predictions?category=regular'),
      ]);
      setTeams(teamsRes.data.teams);

      const pred = predsRes.data.predictions.find((p) => p.category === 'regular');
      if (pred?.payload) {
        const p = pred.payload;
        setPlayoffTeams(p.playoffTeams || { Eastern: [], Western: [] });
        setDivisionWinners(p.divisionWinners || {});
        setPresidentsTrophy(p.presidentsTrophy || '');
        setStanleyCupWinner(p.stanleyCupWinner || '');
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function togglePlayoffTeam(conference, abbr) {
    setPlayoffTeams((prev) => {
      const current = prev[conference] || [];
      if (current.includes(abbr)) {
        // If removing, also clean up dependent selections
        const updated = current.filter((t) => t !== abbr);
        if (presidentsTrophy === abbr) setPresidentsTrophy('');
        if (stanleyCupWinner === abbr) setStanleyCupWinner('');
        // Clean division winner if it was this team
        setDivisionWinners((dw) => {
          const newDw = { ...dw };
          for (const div of Object.keys(newDw)) {
            if (newDw[div] === abbr) delete newDw[div];
          }
          return newDw;
        });
        return { ...prev, [conference]: updated };
      }
      if (current.length >= 8) return prev;
      return { ...prev, [conference]: [...current, abbr] };
    });
  }

  function setDivisionWinner(division, abbr) {
    setDivisionWinners((prev) => ({ ...prev, [division]: abbr }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.post('/api/predictions', {
        category: 'regular',
        payload: { playoffTeams, divisionWinners, presidentsTrophy, stanleyCupWinner },
      });
      setMessage('Predictions saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading teams...</div>;
  if (!teams) return <div className="error-message">Failed to load teams</div>;

  const allSelectedTeams = [...(playoffTeams.Eastern || []), ...(playoffTeams.Western || [])];

  const conferences = ['Eastern', 'Western'];

  return (
    <div className="regular-season">
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {conferences.map((conf) => (
        <div key={conf} className="conference-section">
          <h2 className="conference-title">{conf} Conference</h2>
          <div className="selection-count">
            Playoff teams selected: {(playoffTeams[conf] || []).length} / 8
          </div>
          {Object.entries(teams[conf] || {}).map(([division, divTeams]) => (
            <div key={division} className="division-section">
              <h3 className="division-title">{division} Division</h3>
              <div className="team-grid">
                {divTeams.map((team) => {
                  const selected = (playoffTeams[conf] || []).includes(team.abbreviation);
                  const isDivWinner = divisionWinners[division] === team.abbreviation;
                  return (
                    <div
                      key={team.abbreviation}
                      className={`team-card ${selected ? 'selected' : ''} ${isDivWinner ? 'division-winner' : ''}`}
                      onClick={() => togglePlayoffTeam(conf, team.abbreviation)}
                    >
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="team-logo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className="team-name">{team.name}</span>
                      <span className="team-abbr">{team.abbreviation}</span>
                      {selected && (
                        <button
                          className={`btn-division-winner ${isDivWinner ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDivisionWinner(division, team.abbreviation);
                          }}
                          title="Set as division winner"
                        >
                          🏆 Div Winner
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div className="special-picks">
        <h2>Special Picks</h2>
        <div className="pick-group">
          <label>Presidents&apos; Trophy (Best Regular Season Record)</label>
          <select
            value={presidentsTrophy}
            onChange={(e) => setPresidentsTrophy(e.target.value)}
          >
            <option value="">Select a team...</option>
            {allSelectedTeams.map((abbr) => (
              <option key={abbr} value={abbr}>{abbr}</option>
            ))}
          </select>
        </div>
        <div className="pick-group">
          <label>Stanley Cup Winner</label>
          <select
            value={stanleyCupWinner}
            onChange={(e) => setStanleyCupWinner(e.target.value)}
          >
            <option value="">Select a team...</option>
            {allSelectedTeams.map((abbr) => (
              <option key={abbr} value={abbr}>{abbr}</option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn btn-primary btn-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Regular Season Predictions'}
      </button>
    </div>
  );
}
