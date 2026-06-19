import React from 'react';

/**
 * Full-viewport boot screen used before ThemeProvider mounts (Clerk init, etc.).
 * Hardcoded dark palette so there is no white flash on wake / route transitions.
 */
const AppBootScreen = ({ message = 'Loading...' }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#040509',
      color: '#e0e0e0',
      fontFamily: '"Source Sans Pro", sans-serif',
      gap: '1.25rem',
    }}
  >
    <div
      role="progressbar"
      aria-label={message}
      style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(76, 206, 172, 0.2)',
        borderTopColor: '#4cceac',
        borderRadius: '50%',
        animation: 'app-boot-spin 0.9s linear infinite',
      }}
    />
    <p style={{ margin: 0, fontSize: '1rem', color: '#a3a3a3' }}>{message}</p>
    <style>{`@keyframes app-boot-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default AppBootScreen;