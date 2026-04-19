export interface Profile {
  displayName: string;
  avatar?: string;
}

export interface Deck {
  id?: string;
  title: string;
  creatorId: string;
  whiteCards: string[];
  blackCards: string[];
  createdAt: any;
}

export type GameStatus = 'waiting' | 'playing' | 'voting' | 'ended';

export interface Session {
  id?: string;
  hostId: string;
  deckId: string;
  status: GameStatus;
  currentBlackCard: string | null;
  round: number;
  timerEnd?: number;
  createdAt: any;
}

export interface Participant {
  userId: string;
  displayName: string;
  hand: string[];
  selectedCard: string | null;
  score: number;
  isReady: boolean;
  hasVoted: boolean;
  votedFor: string | null;
}

export interface ChatMessage {
  id?: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: any;
}
