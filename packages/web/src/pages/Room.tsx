import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequestHandler } from '@baseline/client-api/request-handler';
import {
  getRoom,
  vote as submitVote,
  setTopic,
  revealVotes,
  resetRoom,
  leaveRoom,
} from '@baseline/client-api/room';
import { RoomState, VoteValue } from '@baseline/types/room';
import styles from './Room.module.scss';

const VOTE_VALUES: VoteValue[] = [1, 2, 3, 5, 8, 13, 21, '?'];
const POLL_INTERVAL = 2000;

const Room = (): JSX.Element => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedVote, setSelectedVote] = useState<VoteValue | null>(null);
  const [topicInput, setTopicInput] = useState('');
  const [isEditingTopic, setIsEditingTopic] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [notInRoom, setNotInRoom] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  // Apply theme on mount and change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const fetchRoom = useCallback(async () => {
    if (!roomCode) return;

    try {
      const requestHandler = getRequestHandler();
      const data = await getRoom(requestHandler, roomCode);

      // Check if current user is still in the room
      if (!data.isParticipant) {
        setNotInRoom(true);
        setError('You are no longer in this room');
        setRoom(null);
        return;
      }

      setRoom(data);
      setError('');
      setNotInRoom(false);

      // Update selected vote from server state
      if (data.myVote !== null && data.myVote !== undefined) {
        setSelectedVote(data.myVote as VoteValue);
      } else if (!data.revealed) {
        // Reset vote selection if we haven't voted yet
        setSelectedVote(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch room:', err);
      if (err?.response?.status === 404) {
        setError('Room not found');
      } else {
        setError('Room not found or access denied');
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomCode]);

  // Initial fetch and polling
  useEffect(() => {
    fetchRoom();
    const interval = setInterval(fetchRoom, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const handleVote = async (value: VoteValue) => {
    if (!roomCode || room?.revealed) return;

    setSelectedVote(value);
    try {
      const requestHandler = getRequestHandler();
      await submitVote(requestHandler, roomCode, { vote: value });
    } catch (err) {
      console.error('Failed to vote:', err);
      setSelectedVote(null);
    }
  };

  const handleSetTopic = async () => {
    if (!roomCode || !room?.isHost) return;

    try {
      const requestHandler = getRequestHandler();
      await setTopic(requestHandler, roomCode, { topic: topicInput });
      setIsEditingTopic(false);
    } catch (err) {
      console.error('Failed to set topic:', err);
    }
  };

  const handleReveal = async () => {
    if (!roomCode || !room?.isHost) return;

    try {
      const requestHandler = getRequestHandler();
      await revealVotes(requestHandler, roomCode);
    } catch (err) {
      console.error('Failed to reveal:', err);
    }
  };

  const handleReset = async () => {
    if (!roomCode || !room?.isHost) return;

    try {
      const requestHandler = getRequestHandler();
      await resetRoom(requestHandler, roomCode);
      setSelectedVote(null);
      setTopicInput('');
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  };

  const handleLeave = async () => {
    if (!roomCode) return;

    try {
      const requestHandler = getRequestHandler();
      await leaveRoom(requestHandler, roomCode);
      navigate('/');
    } catch (err) {
      console.error('Failed to leave:', err);
      navigate('/');
    }
  };

  const copyRoomCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading room...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{notInRoom ? 'Left Room' : 'Error'}</h2>
          <p>{error || 'Room not found'}</p>
          <p className={styles.errorHint}>
            {notInRoom
              ? 'You left this room from another session.'
              : 'The room may have expired or been deleted.'}
          </p>
          <button onClick={() => navigate('/')}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.roomInfo}>
          <h1>Room: {roomCode}</h1>
          <button onClick={copyRoomCode} className={styles.copyBtn} title="Copy room code">
            {copyFeedback ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={styles.themeToggle}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={handleLeave} className={styles.leaveBtn}>
            Leave Room
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Topic Section */}
        <section className={styles.topicSection}>
          {isEditingTopic && room.isHost ? (
            <div className={styles.topicEdit}>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Enter topic to estimate"
                autoFocus
              />
              <button onClick={handleSetTopic}>Save</button>
              <button onClick={() => setIsEditingTopic(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.topicDisplay}>
              <h2>{room.topic || 'No topic set'}</h2>
              {room.isHost && !room.revealed && (
                <button onClick={() => { setTopicInput(room.topic); setIsEditingTopic(true); }}>
                  Edit
                </button>
              )}
            </div>
          )}
        </section>

        {/* Participants Section */}
        <section className={styles.participants}>
          <h3>Participants ({room.participants.length})</h3>
          <div className={styles.participantGrid}>
            {room.participants.map((p) => (
              <div key={p.odv} className={styles.participantCard}>
                <div className={styles.voteIndicator}>
                  <div className={`${styles.cardInner} ${room.revealed ? styles.revealed : ''}`}>
                    <div className={`${styles.cardFront} ${p.hasVoted ? styles.voted : ''}`}>
                      {p.hasVoted ? (
                        <span className={styles.checkmark}>✓</span>
                      ) : (
                        <span className={styles.waiting}>?</span>
                      )}
                    </div>
                    <div className={styles.cardBack}>
                      <span className={styles.voteValue}>{p.vote ?? '?'}</span>
                    </div>
                  </div>
                </div>
                <span className={styles.name}>{p.displayName}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stats Section (after reveal) */}
        {room.revealed && room.stats && (
          <section className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Average</span>
              <span className={styles.statValue}>{room.stats.average}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Most Common</span>
              <span className={styles.statValue}>{room.stats.mode}</span>
            </div>
          </section>
        )}

        {/* Voting Section */}
        {!room.revealed && (
          <section className={styles.voting}>
            <h3>Your Vote</h3>
            <div className={styles.voteCards}>
              {VOTE_VALUES.map((value) => (
                <button
                  key={value}
                  className={`${styles.voteCard} ${selectedVote === value ? styles.selected : ''}`}
                  onClick={() => handleVote(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Host Controls */}
        {room.isHost && (
          <section className={styles.hostControls}>
            {!room.revealed ? (
              <button onClick={handleReveal} className={styles.revealBtn}>
                Reveal Votes
              </button>
            ) : (
              <button onClick={handleReset} className={styles.resetBtn}>
                Next Round
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Room;
