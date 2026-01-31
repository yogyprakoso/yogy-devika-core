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
  const [isRevealing, setIsRevealing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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

      // Reset revealing state when room is actually revealed
      if (data.revealed) {
        setIsRevealing(false);
      } else {
        // Reset resetting state when room is actually reset
        setIsResetting(false);
      }

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
    void fetchRoom();
    const interval = setInterval(() => void fetchRoom(), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchRoom]);

  const handleVote = async (value: VoteValue) => {
    if (!roomCode || room?.revealed) return;

    const previousVote = selectedVote;
    setSelectedVote(value);

    // Optimistic update: immediately show checkmark for current user
    if (room) {
      setRoom({
        ...room,
        myVote: value,
        participants: room.participants.map(p =>
          p.odv === room.myOdv ? { ...p, hasVoted: true, vote: value } : p
        ),
      });
    }

    try {
      const requestHandler = getRequestHandler();
      await submitVote(requestHandler, roomCode, { vote: value });
    } catch (err) {
      console.error('Failed to vote:', err);
      // Rollback on error
      setSelectedVote(previousVote);
      if (room) {
        setRoom({
          ...room,
          myVote: previousVote,
          participants: room.participants.map(p =>
            p.odv === room.myOdv ? { ...p, hasVoted: previousVote !== null, vote: previousVote } : p
          ),
        });
      }
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

    // Check if everyone has voted
    const votedCount = room.participants.filter(p => p.hasVoted).length;
    const totalCount = room.participants.length;

    if (votedCount < totalCount) {
      const notVoted = totalCount - votedCount;
      const confirmed = window.confirm(
        `${notVoted} participant${notVoted > 1 ? 's have' : ' has'} not voted yet.\n\nReveal votes anyway?`
      );
      if (!confirmed) return;
    }

    setIsRevealing(true);
    try {
      const requestHandler = getRequestHandler();
      await revealVotes(requestHandler, roomCode);
      // Don't set isRevealing to false here - let it stay true until room.revealed becomes true
    } catch (err) {
      console.error('Failed to reveal:', err);
      setIsRevealing(false); // Only reset on error
    }
  };

  const handleReset = async () => {
    if (!roomCode || !room?.isHost) return;

    setIsResetting(true);
    try {
      const requestHandler = getRequestHandler();
      await resetRoom(requestHandler, roomCode);
      setSelectedVote(null);
      setTopicInput('');
      // Don't set isResetting to false here - let it stay true until room.revealed becomes false
    } catch (err) {
      console.error('Failed to reset:', err);
      setIsResetting(false); // Only reset on error
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
      void navigator.clipboard.writeText(roomCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container} role="status" aria-busy="true" aria-live="polite">
        <div className={styles.loading}>Loading room...</div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className={styles.container}>
        <div className={styles.error} role="alert" aria-live="assertive">
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
      <header className={styles.header} role="banner">
        <div className={styles.roomInfo}>
          <h1>Room: {roomCode}</h1>
          <button
            onClick={copyRoomCode}
            className={styles.copyBtn}
            aria-label={copyFeedback ? 'Room code copied' : 'Copy room code to clipboard'}
          >
            <span aria-live="polite">{copyFeedback ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={styles.themeToggle}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDarkMode}
          >
            <span aria-hidden="true">{isDarkMode ? '☀️' : '🌙'}</span>
          </button>
          <button onClick={handleLeave} className={styles.leaveBtn}>
            Leave Room
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Topic Section */}
        <section className={styles.topicSection} aria-labelledby="topic-heading">
          {isEditingTopic && room.isHost ? (
            <div className={styles.topicEdit} role="form" aria-label="Edit topic">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Enter topic to estimate"
                aria-label="Topic to estimate"
                autoFocus
              />
              <button onClick={handleSetTopic}>Save</button>
              <button onClick={() => setIsEditingTopic(false)}>Cancel</button>
            </div>
          ) : (
            <div className={styles.topicDisplay}>
              <h2 id="topic-heading">{room.topic || 'No topic set'}</h2>
              {room.isHost && !room.revealed && (
                <button
                  onClick={() => { setTopicInput(room.topic); setIsEditingTopic(true); }}
                  aria-label="Edit topic"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </section>

        {/* Participants Section */}
        <section className={styles.participants} aria-labelledby="participants-heading">
          <h3 id="participants-heading">Participants ({room.participants.length})</h3>
          <div className={styles.participantGrid} role="list" aria-live="polite">
            {room.participants.map((p) => (
              <div
                key={p.odv}
                className={styles.participantCard}
                role="listitem"
                aria-label={`${p.displayName}: ${room.revealed ? `voted ${p.vote ?? 'unknown'}` : p.hasVoted ? 'has voted' : 'waiting to vote'}`}
              >
                <div className={styles.voteIndicator} aria-hidden="true">
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
          <section className={styles.stats} aria-label="Vote statistics" aria-live="polite">
            <div className={styles.statItem}>
              <span className={styles.statLabel} id="stat-average">Average</span>
              <span className={styles.statValue} aria-labelledby="stat-average">{room.stats.average}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel} id="stat-mode">Most Common</span>
              <span className={styles.statValue} aria-labelledby="stat-mode">{room.stats.mode}</span>
            </div>
          </section>
        )}

        {/* Voting Section */}
        {!room.revealed && (
          <section className={styles.voting} aria-labelledby="voting-heading">
            <h3 id="voting-heading">Your Vote</h3>
            <div className={styles.voteCards} role="group" aria-label="Vote options">
              {VOTE_VALUES.map((value) => (
                <button
                  key={value}
                  className={`${styles.voteCard} ${selectedVote === value ? styles.selected : ''}`}
                  onClick={() => handleVote(value)}
                  aria-pressed={selectedVote === value}
                  aria-label={`Vote ${value === '?' ? 'unsure' : value} points`}
                >
                  {value}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Host Controls */}
        {room.isHost && (
          <section className={styles.hostControls} aria-label="Host controls">
            {!room.revealed ? (
              <button
                onClick={handleReveal}
                className={styles.revealBtn}
                disabled={isRevealing}
                aria-label="Reveal all votes"
                aria-busy={isRevealing}
              >
                {isRevealing ? 'Revealing...' : 'Reveal Votes'}
              </button>
            ) : (
              <button
                onClick={handleReset}
                className={styles.resetBtn}
                disabled={isResetting}
                aria-label="Reset votes and start next round"
                aria-busy={isResetting}
              >
                {isResetting ? 'Preparing...' : 'Next Round'}
              </button>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default Room;
