import React, { useState, useEffect } from 'react';

interface PasswordGuardProps {
  children: React.ReactNode;
}

const PasswordGuard: React.FC<PasswordGuardProps> = ({ children }) => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const CORRECT_PASSWORD = "pleven123";

  useEffect(() => {
    const savedAuth = localStorage.getItem('site-auth');
    if (savedAuth === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
    }
    setIsChecking(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      localStorage.setItem('site-auth', CORRECT_PASSWORD);
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  if (isChecking) {
    return (
      <div className="password-guard-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="password-guard-overlay">
      <div className="password-card">
        <div className="password-header">
          <div className="realm-icon">🏰</div>
          <h1>Accès Restreint</h1>
          <p>Le grimoire est scellé. Prononcez le mot de passe pour briser le sortilège.</p>
        </div>
        <form onSubmit={handleSubmit} className="password-form">
          <div className={`input-wrapper ${error ? 'error' : ''}`}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe..."
              autoFocus
            />
            <div className="glow-border"></div>
          </div>
          <div className="error-container">
             {error && <p className="error-message">La magie n'opère pas. Réessayez.</p>}
          </div>
          <button type="submit" className="premium-btn-lancer">
            Entrer
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordGuard;
