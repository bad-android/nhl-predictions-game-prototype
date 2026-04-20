import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();
  const isAdmin = user?.username === 'sebastian';

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-logo">🏒</span>
        <span className="nav-title">NHL Predictions</span>
      </div>
      <div className="nav-links">
        <NavLink to="/predictions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Predictions
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Leaderboard
        </NavLink>
        <NavLink to="/overview" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Overview
        </NavLink>
        {isAdmin && (
          <NavLink to="/results" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Results
          </NavLink>
        )}
      </div>
      <div className="nav-user">
        <span className="user-name">{user?.display_name || user?.username}</span>
        <button onClick={logout} className="btn btn-logout">Logout</button>
      </div>
    </nav>
  );
}
