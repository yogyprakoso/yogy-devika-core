export interface Room {
  roomCode: string;
  hostId: string;
  topic: string;
  revealed: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface Participant {
  roomCode: string;
  odv: string; // Cognito user sub
  displayName: string;
  vote: number | string | null; // null if not voted, string for "?"
  joinedAt: number;
}

export interface RoomState {
  roomCode: string;
  topic: string;
  revealed: boolean;
  isHost: boolean;
  participants: ParticipantView[];
  stats?: VoteStats;
}

export interface ParticipantView {
  displayName: string;
  odv: string;
  hasVoted: boolean;
  vote: number | string | null; // Only visible after reveal
}

export interface VoteStats {
  average: number;
  mode: number | string;
}

export type VoteValue = 1 | 2 | 3 | 5 | 8 | 13 | 21 | '?';
