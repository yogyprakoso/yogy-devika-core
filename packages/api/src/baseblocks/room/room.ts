import {
  Room,
  Participant,
  RoomState,
  ParticipantView,
  VoteStats,
  RoomAdminView,
} from '@baseline/types/room';

/**
 * Map Room + Participants to RoomState for API response
 */
export const RoomStateMapper = (
  room: Room,
  participants: Participant[],
  currentUserSub: string
): RoomState => {
  const isHost = room.hostId === currentUserSub;
  const currentParticipant = participants.find((p) => p.odv === currentUserSub);
  const isParticipant = !!currentParticipant;

  const participantViews: ParticipantView[] = participants.map((p) => ({
    displayName: p.displayName,
    odv: p.odv,
    hasVoted: p.vote !== null,
    // Only show vote if revealed
    vote: room.revealed ? p.vote : null,
  }));

  const state: RoomState = {
    roomCode: room.roomCode,
    topic: room.topic,
    revealed: room.revealed,
    isHost,
    isParticipant,
    myVote: currentParticipant?.vote ?? null,
    participants: participantViews,
  };

  // Calculate stats after reveal
  if (room.revealed) {
    state.stats = calculateVoteStats(participants);
  }

  return state;
};

/**
 * Calculate voting statistics
 */
export const calculateVoteStats = (participants: Participant[]): VoteStats => {
  const numericVotes = participants
    .map((p) => p.vote)
    .filter((v): v is number => typeof v === 'number');

  if (numericVotes.length === 0) {
    return { average: 0, mode: 0 };
  }

  // Calculate average
  const sum = numericVotes.reduce((a, b) => a + b, 0);
  const average = Math.round((sum / numericVotes.length) * 10) / 10;

  // Calculate mode (most common value)
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  let mode: number = numericVotes[0];

  for (const vote of numericVotes) {
    frequency[vote] = (frequency[vote] || 0) + 1;
    if (frequency[vote] > maxFreq) {
      maxFreq = frequency[vote];
      mode = vote;
    }
  }

  return { average, mode };
};

/**
 * Map Room to RoomAdminView for admin dashboard
 */
export const RoomAdminMapper = (
  room: Room,
  participantCount: number
): RoomAdminView => {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    topic: room.topic,
    revealed: room.revealed,
    participantCount,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
  };
};
