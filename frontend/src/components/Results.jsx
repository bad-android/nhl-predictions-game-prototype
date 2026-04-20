import { useState, useEffect, useCallback } from 'react';
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

export default function Results() {
  const [activeTab, setActiveTab] = useState('regular');
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState({ regular: null, trophies: null, playoffs: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [teamsRes, resultsRes] = await Promise.all([
          axios.get('/api/teams'),
          axios.get('/api/results'),
        ]);
        setTeams(teamsRes.data.all || []);

        const parsed = {};
        for (const r of resultsRes.data.results || []) {
          parsed[r.category] = r.payload;
        }
        setResults((prev) => ({ ...prev, ...parsed }));
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveResult(category, payload) {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.post('/api/results', { category, payload });
      setResults((prev) => ({ ...prev, [category]: payload }));
      setMessage('Results saved and scores recalculated!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  const tabs = [
    { id: 'regular', label: 'Regular Season' },
    { id: 'trophies', label: 'Trophies' },
    { id: 'playoffs', label: 'Playoffs' },
  ];

  return (
    <div className="results-page">
      <h1 className="page-title">🔧 Admin: Enter Results</h1>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'regular' && (
          <RegularResults
            teams={teams}
            data={results.regular}
            onSave={(payload) => saveResult('regular', payload)}
            saving={saving}
          />
        )}
        {activeTab === 'trophies' && (
          <TrophyResults
            data={results.trophies}
            onSave={(payload) => saveResult('trophies', payload)}
            saving={saving}
          />
        )}
        {activeTab === 'playoffs' && (
          <PlayoffResults
            teams={teams}
            data={results.playoffs}
            onSave={(payload) => saveResult('playoffs', payload)}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}

function RegularResults({ teams, data, onSave, saving }) {
  const [playoffTeams, setPlayoffTeams] = useState({ Eastern: [], Western: [] });
  const [divisionWinners, setDivisionWinners] = useState({});
  const [presidentsTrophy, setPresidentsTrophy] = useState('');
  const [stanleyCupWinner, setStanleyCupWinner] = useState('');

  useEffect(() => {
    if (data) {
      setPlayoffTeams(data.playoffTeams || { Eastern: [], Western: [] });
      setDivisionWinners(data.divisionWinners || {});
      setPresidentsTrophy(data.presidentsTrophy || '');
      setStanleyCupWinner(data.stanleyCupWinner || '');
    }
  }, [data]);

  function toggleTeam(conference, abbr) {
    setPlayoffTeams((prev) => {
      const current = prev[conference] || [];
      if (current.includes(abbr)) {
        return { ...prev, [conference]: current.filter((t) => t !== abbr) };
      }
      return { ...prev, [conference]: [...current, abbr] };
    });
  }

  const grouped = {};
  teams.forEach((t) => {
    if (!grouped[t.conference]) grouped[t.conference] = {};
    if (!grouped[t.conference][t.division]) grouped[t.conference][t.division] = [];
    grouped[t.conference][t.division].push(t);
  });

  const allSelected = [...(playoffTeams.Eastern || []), ...(playoffTeams.Western || [])];

  return (
    <div className="results-section">
      <h2>Regular Season Actual Results</h2>
      {['Eastern', 'Western'].map((conf) => (
        <div key={conf}>
          <h3 className="conference-title">{conf} Conference</h3>
          {Object.entries(grouped[conf] || {}).map(([div, divTeams]) => (
            <div key={div} className="division-section">
              <h4 className="division-title">{div} Division</h4>
              <div className="team-grid compact">
                {divTeams.map((team) => {
                  const sel = (playoffTeams[conf] || []).includes(team.abbreviation);
                  const isDivWinner = divisionWinners[div] === team.abbreviation;
                  return (
                    <div
                      key={team.abbreviation}
                      className={`team-card small ${sel ? 'selected' : ''} ${isDivWinner ? 'division-winner' : ''}`}
                      onClick={() => toggleTeam(conf, team.abbreviation)}
                    >
                      <span className="team-abbr">{team.abbreviation}</span>
                      {sel && (
                        <button
                          className={`btn-division-winner small ${isDivWinner ? 'active' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDivisionWinners((prev) => ({ ...prev, [div]: team.abbreviation }));
                          }}
                        >
                          Div
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
        <div className="pick-group">
          <label>Presidents&apos; Trophy</label>
          <select value={presidentsTrophy} onChange={(e) => setPresidentsTrophy(e.target.value)}>
            <option value="">Select...</option>
            {allSelected.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="pick-group">
          <label>Stanley Cup Winner</label>
          <select value={stanleyCupWinner} onChange={(e) => setStanleyCupWinner(e.target.value)}>
            <option value="">Select...</option>
            {allSelected.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <button
        className="btn btn-primary btn-save"
        onClick={() => onSave({ playoffTeams, divisionWinners, presidentsTrophy, stanleyCupWinner })}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Regular Season Results'}
      </button>
    </div>
  );
}

function TrophyResults({ data, onSave, saving }) {
  const [trophies, setTrophies] = useState(() => {
    const t = {};
    TROPHIES.forEach((tr) => { t[tr.id] = ''; });
    return t;
  });

  useEffect(() => {
    if (data?.trophies) {
      setTrophies((prev) => ({ ...prev, ...data.trophies }));
    }
  }, [data]);

  return (
    <div className="results-section">
      <h2>Trophy Winners</h2>
      <div className="trophies-list">
        {TROPHIES.map((trophy) => (
          <div key={trophy.id} className="trophy-card">
            <div className="trophy-header">
              <h3>🏆 {trophy.name}</h3>
            </div>
            <div className="form-group">
              <label>Winner</label>
              <input
                type="text"
                value={trophies[trophy.id] || ''}
                onChange={(e) => setTrophies((prev) => ({ ...prev, [trophy.id]: e.target.value }))}
                placeholder="Actual winner..."
              />
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn btn-primary btn-save"
        onClick={() => onSave({ trophies })}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Trophy Results'}
      </button>
    </div>
  );
}

function PlayoffResults({ teams, data, onSave, saving }) {
  const [cupWinner, setCupWinner] = useState('');
  const [confWinners, setConfWinners] = useState({ Eastern: '', Western: '' });
  const [round1, setRound1] = useState({ Eastern: ['', '', '', ''], Western: ['', '', '', ''] });
  const [round2, setRound2] = useState({ Eastern: ['', ''], Western: ['', ''] });

  useEffect(() => {
    if (data) {
      setCupWinner(data.cupWinner || '');
      setConfWinners(data.confWinners || { Eastern: '', Western: '' });
      if (data.round1) setRound1(data.round1);
      if (data.round2) setRound2(data.round2);
    }
  }, [data]);

  const teamAbbrs = teams.map((t) => t.abbreviation).sort();

  return (
    <div className="results-section">
      <h2>Playoff Results</h2>
      {['Eastern', 'Western'].map((conf) => (
        <div key={conf} className="mini-section">
          <h3 className="conference-title">{conf} Conference</h3>
          <div className="form-group">
            <label>Round 1 Winners (4)</label>
            <div className="inline-selects">
              {[0, 1, 2, 3].map((i) => (
                <select
                  key={i}
                  value={round1[conf][i]}
                  onChange={(e) => {
                    const next = { ...round1 };
                    next[conf] = [...next[conf]];
                    next[conf][i] = e.target.value;
                    setRound1(next);
                  }}
                >
                  <option value="">R1-{i + 1}</option>
                  {teamAbbrs.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Round 2 Winners (2)</label>
            <div className="inline-selects">
              {[0, 1].map((i) => (
                <select
                  key={i}
                  value={round2[conf][i]}
                  onChange={(e) => {
                    const next = { ...round2 };
                    next[conf] = [...next[conf]];
                    next[conf][i] = e.target.value;
                    setRound2(next);
                  }}
                >
                  <option value="">R2-{i + 1}</option>
                  {teamAbbrs.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Conference Winner</label>
            <select
              value={confWinners[conf]}
              onChange={(e) => setConfWinners((prev) => ({ ...prev, [conf]: e.target.value }))}
            >
              <option value="">Select...</option>
              {teamAbbrs.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      ))}
      <div className="form-group">
        <label>Stanley Cup Winner</label>
        <select value={cupWinner} onChange={(e) => setCupWinner(e.target.value)}>
          <option value="">Select...</option>
          {teamAbbrs.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <button
        className="btn btn-primary btn-save"
        onClick={() => onSave({ round1, round2, confWinners, cupWinner })}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Playoff Results'}
      </button>
    </div>
  );
}
