import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const TROPHIES = [
  { id: 'hart', name: 'Hart Trophy', description: 'Most Valuable Player' },
  { id: 'vezina', name: 'Vezina Trophy', description: 'Best Goaltender' },
  { id: 'norris', name: 'Norris Trophy', description: 'Best Defenseman' },
  { id: 'calder', name: 'Calder Trophy', description: 'Best Rookie' },
  { id: 'art_ross', name: 'Art Ross Trophy', description: 'Points Leader' },
  { id: 'rocket_richard', name: 'Rocket Richard Trophy', description: 'Goals Leader' },
  { id: 'selke', name: 'Selke Trophy', description: 'Best Defensive Forward' },
  { id: 'conn_smythe', name: 'Conn Smythe Trophy', description: 'Playoff MVP' },
];

function createEmptyTrophies() {
  const trophies = {};
  TROPHIES.forEach((t) => {
    trophies[t.id] = ['', '', ''];
  });
  return trophies;
}

export default function PlayerTrophies() {
  const [trophies, setTrophies] = useState(createEmptyTrophies);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const res = await axios.get('/api/predictions?category=trophies');
      const pred = res.data.predictions.find((p) => p.category === 'trophies');
      if (pred?.payload?.trophies) {
        setTrophies((prev) => {
          const merged = { ...prev };
          for (const [key, value] of Object.entries(pred.payload.trophies)) {
            if (Array.isArray(value)) {
              merged[key] = [value[0] || '', value[1] || '', value[2] || ''];
            }
          }
          return merged;
        });
      }
    } catch (err) {
      setError('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function updatePlayer(trophyId, index, value) {
    setTrophies((prev) => {
      const updated = { ...prev };
      updated[trophyId] = [...updated[trophyId]];
      updated[trophyId][index] = value;
      return updated;
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await axios.post('/api/predictions', {
        category: 'trophies',
        payload: { trophies },
      });
      setMessage('Trophy predictions saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="player-trophies">
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <p className="section-description">
        For each award, predict the top 3 finalists (player names).
      </p>

      <div className="trophies-list">
        {TROPHIES.map((trophy) => (
          <div key={trophy.id} className="trophy-card">
            <div className="trophy-header">
              <h3>🏆 {trophy.name}</h3>
              <span className="trophy-desc">{trophy.description}</span>
            </div>
            <div className="trophy-inputs">
              {[0, 1, 2].map((i) => (
                <div key={i} className="finalist-input">
                  <label>{i === 0 ? 'Winner' : `Runner-up ${i}`}</label>
                  <input
                    type="text"
                    value={trophies[trophy.id]?.[i] || ''}
                    onChange={(e) => updatePlayer(trophy.id, i, e.target.value)}
                    placeholder={`Player name...`}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-save" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Trophy Predictions'}
      </button>
    </div>
  );
}
