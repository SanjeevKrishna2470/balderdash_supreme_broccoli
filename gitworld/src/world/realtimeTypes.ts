/**
 * GitWorld Realtime Multiplayer Protocol Specification
 * Protocol Version: 1
 */

export const REALTIME_PROTOCOL_VERSION = 1;

export type PresenceState = 'online' | 'idle' | 'away' | 'in-repository' | 'in-menu';

export interface PublicPlayerIdentity {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  profileColorSeed: number;
}

export interface PlayerSnapshot {
  inputSequence: number;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: { x: number; y: number };
  walkPhase: number;
  isWalking: boolean;
  timestamp: number;
}

export interface RemotePlayerState extends PublicPlayerIdentity {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: { x: number; y: number };
  walkPhase: number;
  isWalking: boolean;
  presenceState: PresenceState;
  currentEmote?: {
    emoteId: string;
    label: string;
    startedAt: number;
    durationMs: number;
  } | null;
  currentChat?: {
    text: string;
    sentAt: number;
    durationMs: number;
  } | null;
  lastSeen: number;
  currentDistrict?: string;
}

export type EmoteId = 'wave' | 'point' | 'follow' | 'celebrate' | 'curious' | 'thanks';

export interface EmoteDefinition {
  id: EmoteId;
  icon: string;
  label: string;
  durationMs: number;
}

export const AVAILABLE_EMOTES: EmoteDefinition[] = [
  { id: 'wave', icon: '👋', label: 'Wave', durationMs: 3000 },
  { id: 'point', icon: '👉', label: 'Point', durationMs: 2500 },
  { id: 'follow', icon: '🏃', label: 'Follow Me', durationMs: 3500 },
  { id: 'celebrate', icon: '🎉', label: 'Celebrate', durationMs: 3500 },
  { id: 'curious', icon: '🔍', label: 'Inspect', durationMs: 3000 },
  { id: 'thanks', icon: '🙏', label: 'Thanks', durationMs: 2500 },
];

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'simulated';

export interface ClientAuth {
  playerId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  profileColorSeed?: number;
  token?: string;
}

export interface BaseRealtimeMessage {
  type: string;
  protocolVersion: number;
  messageId: string;
  sessionId: string;
  senderId?: string;
  sentAt: number;
}

// Client -> Server Messages
export type ClientMessagePayload =
  | {
      type: 'session.join';
      clientVersion: string;
      player: PublicPlayerIdentity;
      districtId: string;
    }
  | {
      type: 'player.snapshot';
      snapshot: PlayerSnapshot;
    }
  | {
      type: 'player.emote';
      emoteId: EmoteId;
    }
  | {
      type: 'player.interact';
      targetId: string;
    }
  | {
      type: 'world.transition.request';
      destinationId: string;
      targetSessionId?: string;
    }
  | {
      type: 'presence.update';
      state: PresenceState;
    }
  | {
      type: 'chat.send';
      channel: 'proximity' | 'session';
      text: string;
    };

export type ClientMessage = BaseRealtimeMessage & ClientMessagePayload;

// Server -> Client Messages
export type ServerMessagePayload =
  | {
      type: 'session.accepted';
      sessionId: string;
      playerId: string;
      worldVersion: string;
      players: RemotePlayerState[];
    }
  | {
      type: 'player.joined';
      player: RemotePlayerState;
    }
  | {
      type: 'player.updated';
      playerId: string;
      snapshot: PlayerSnapshot;
    }
  | {
      type: 'player.left';
      playerId: string;
      reason?: string;
    }
  | {
      type: 'player.emote';
      playerId: string;
      emoteId: EmoteId;
      startedAt: number;
      durationMs: number;
    }
  | {
      type: 'player.interaction';
      playerId: string;
      targetId: string;
    }
  | {
      type: 'world.transition.accepted';
      playerId: string;
      destinationId: string;
      nextSessionId?: string;
    }
  | {
      type: 'chat.received';
      senderId: string;
      senderName: string;
      channel: 'proximity' | 'session';
      text: string;
      position?: { x: number; y: number };
      sentAt: number;
    }
  | {
      type: 'error';
      code: string;
      message: string;
      retryable: boolean;
    };

export type ServerMessage = BaseRealtimeMessage & ServerMessagePayload;
