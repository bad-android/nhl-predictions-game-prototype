import { useState } from 'react';
import RegularSeason from './predictions/RegularSeason';
import PlayerTrophies from './predictions/PlayerTrophies';
import PlayoffBracket from './predictions/PlayoffBracket';

const TABS = [
  { id: 'regular', label: 'Regular Season' },
  { id: 'trophies', label: 'Trophies' },
  { id: 'playoffs', label: 'Playoffs' },
];

export default function Predictions() {
  const [activeTab, setActiveTab] = useState('regular');

  return (
    <div className="predictions-page">
      <h1 className="page-title">My Predictions</h1>
      <div className="tabs">
        {TABS.map((tab) => (
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
        {activeTab === 'regular' && <RegularSeason />}
        {activeTab === 'trophies' && <PlayerTrophies />}
        {activeTab === 'playoffs' && <PlayoffBracket />}
      </div>
    </div>
  );
}
