import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { getRequestHandler } from '@baseline/client-api/request-handler';
import { createRoom, joinRoom } from '@baseline/client-api/room';
import styles from './Home.module.scss';

const Home = (): JSX.Element => {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleCreateRoom = async () => {
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const requestHandler = getRequestHandler();
      const response = await createRoom(requestHandler, { displayName: displayName.trim() });
      navigate(`/room/${response.roomCode}`);
    } catch (err) {
      setError('Failed to create room. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!displayName.trim()) {
      setError('Please enter your display name');
      return;
    }
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const requestHandler = getRequestHandler();
      await joinRoom(requestHandler, joinCode.trim().toUpperCase(), { displayName: displayName.trim() });
      navigate(`/room/${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      setError('Failed to join room. Check the code and try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Scrum Poker</h1>
        <div className={styles.headerActions}>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={styles.themeToggle}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={handleSignOut} className={styles.signOutBtn}>
            Sign Out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>Welcome!</h2>
          <p>Create a new room or join an existing one.</p>

          <div className={styles.inputGroup}>
            <label htmlFor="displayName">Your Display Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <div className={styles.section}>
              <h3>Create a Room</h3>
              <button
                onClick={handleCreateRoom}
                disabled={isLoading}
                className={styles.primaryBtn}
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </button>
            </div>

            <div className={styles.divider}>
              <span>or</span>
            </div>

            <div className={styles.section}>
              <h3>Join a Room</h3>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter room code"
                maxLength={6}
                className={styles.codeInput}
              />
              <button
                onClick={handleJoinRoom}
                disabled={isLoading}
                className={styles.secondaryBtn}
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
