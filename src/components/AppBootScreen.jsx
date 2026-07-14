import React from 'react';

/**
 * Full-viewport boot screen used before ThemeProvider mounts (Clerk init, etc.).
 * Hardcoded dark palette so there is no white flash on wake / route transitions.
 *
 * When `stuck` is true (Clerk load watchdog fired), show a recoverable error
 * so the user is not trapped on an infinite spinner if auto-reload is skipped.
 */
const AppBootScreen = ({
  message = 'Loading...',
  stuck = false,
  onReload,
}) => (
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
      padding: '1.5rem',
      boxSizing: 'border-box',
      textAlign: 'center',
    }}
  >
    {!stuck && (
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
    )}
    <p style={{ margin: 0, fontSize: '1rem', color: '#a3a3a3' }}>
      {stuck ? 'Session restore is taking longer than expected.' : message}
    </p>
    {stuck && (
      <>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#737373', maxWidth: 360 }}>
          After a laptop boot or sleep, authentication can hang before the network is ready.
          Reload usually fixes it.
        </p>
        <button
          type="button"
          onClick={onReload || (() => window.location.reload())}
          style={{
            marginTop: '0.25rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.95rem',
            fontFamily: 'inherit',
            fontWeight: 600,
            color: '#040509',
            backgroundColor: '#4cceac',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </>
    )}
    <style>{`@keyframes app-boot-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

export default AppBootScreen;
