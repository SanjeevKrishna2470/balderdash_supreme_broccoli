import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

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

export interface ConnectedPlayer {
  ws: WebSocket;
  identity: PublicPlayerIdentity;
  sessionId: string;
  districtId: string;
  snapshot: PlayerSnapshot;
  presenceState: 'online' | 'idle' | 'away' | 'in-repository' | 'in-menu';
  lastSeen: number;
  lastEmoteTime: number;
  lastChatTime: number;
  movementCountWindow: number;
  movementWindowStart: number;
}

export class RealtimeSessionServer {
  private wss: WebSocketServer;
  private players = new Map<string, ConnectedPlayer>();
  private rooms = new Map<string, Set<string>>(); // sessionId -> Set<playerId>
  private disconnectTimers = new Map<string, NodeJS.Timeout>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket) => {
      let boundPlayerId: string | null = null;

      ws.on('message', (raw: string) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (!msg || typeof msg !== 'object') return;

          switch (msg.type) {
            case 'session.join': {
              const { player, districtId, sessionId } = msg;
              if (!player?.id || !player?.username) return;

              boundPlayerId = player.id;
              const targetSession = sessionId || 'shared:city';

              // Cancel pending disconnect timer if reconnecting
              const pendingTimer = this.disconnectTimers.get(player.id);
              if (pendingTimer) {
                clearTimeout(pendingTimer);
                this.disconnectTimers.delete(player.id);
              }

              // Remove from existing room if already present
              const existingPlayer = this.players.get(player.id);
              if (existingPlayer) {
                this.leaveRoom(player.id, existingPlayer.sessionId);
              }

              const initialSnapshot: PlayerSnapshot = {
                inputSequence: 0,
                position: { x: 0, y: 0 },
                velocity: { x: 0, y: 0 },
                facing: { x: 0, y: 1 },
                walkPhase: 0,
                isWalking: false,
                timestamp: Date.now(),
              };

              const connectedPlayer: ConnectedPlayer = {
                ws,
                identity: {
                  id: player.id,
                  username: String(player.username).slice(0, 32),
                  displayName: player.displayName ? String(player.displayName).slice(0, 32) : undefined,
                  avatarUrl: player.avatarUrl ? String(player.avatarUrl).slice(0, 256) : undefined,
                  profileColorSeed: typeof player.profileColorSeed === 'number' ? player.profileColorSeed : 42,
                },
                sessionId: targetSession,
                districtId: districtId || 'town',
                snapshot: initialSnapshot,
                presenceState: 'online',
                lastSeen: Date.now(),
                lastEmoteTime: 0,
                lastChatTime: 0,
                movementCountWindow: 0,
                movementWindowStart: Date.now(),
              };

              this.players.set(player.id, connectedPlayer);
              this.joinRoom(player.id, targetSession);

              // Gather current occupants in this session
              const occupants: any[] = [];
              const roomPlayerIds = this.rooms.get(targetSession) || new Set();
              for (const pid of roomPlayerIds) {
                if (pid === player.id) continue;
                const p = this.players.get(pid);
                if (p) {
                  occupants.push({
                    ...p.identity,
                    position: p.snapshot.position,
                    velocity: p.snapshot.velocity,
                    facing: p.snapshot.facing,
                    walkPhase: p.snapshot.walkPhase,
                    isWalking: p.snapshot.isWalking,
                    presenceState: p.presenceState,
                    currentDistrict: p.districtId,
                    lastSeen: p.lastSeen,
                  });
                }
              }

              // Send session acceptance to new player
              ws.send(
                JSON.stringify({
                  type: 'session.accepted',
                  protocolVersion: 1,
                  sessionId: targetSession,
                  playerId: player.id,
                  worldVersion: '1.0',
                  players: occupants,
                })
              );

              // Broadcast new player joined to room members
              this.broadcastToRoom(
                targetSession,
                {
                  type: 'player.joined',
                  protocolVersion: 1,
                  player: {
                    ...connectedPlayer.identity,
                    position: initialSnapshot.position,
                    velocity: initialSnapshot.velocity,
                    facing: initialSnapshot.facing,
                    walkPhase: initialSnapshot.walkPhase,
                    isWalking: initialSnapshot.isWalking,
                    presenceState: 'online',
                    currentDistrict: districtId,
                    lastSeen: Date.now(),
                  },
                },
                player.id
              );
              break;
            }

            case 'player.snapshot': {
              if (!boundPlayerId) return;
              const player = this.players.get(boundPlayerId);
              if (!player) return;

              const now = Date.now();
              // Rate limit: max 30 snapshots per second
              if (now - player.movementWindowStart > 1000) {
                player.movementCountWindow = 0;
                player.movementWindowStart = now;
              }
              player.movementCountWindow++;
              if (player.movementCountWindow > 30) return;

              const s = msg.snapshot;
              if (!s || typeof s.position?.x !== 'number' || typeof s.position?.y !== 'number') return;

              // Validate & clamp bounds (max 3500 world units)
              const clampedX = Math.max(-2000, Math.min(2000, s.position.x));
              const clampedY = Math.max(-2000, Math.min(2000, s.position.y));

              player.snapshot = {
                inputSequence: typeof s.inputSequence === 'number' ? s.inputSequence : 0,
                position: { x: clampedX, y: clampedY },
                velocity: {
                  x: typeof s.velocity?.x === 'number' ? s.velocity.x : 0,
                  y: typeof s.velocity?.y === 'number' ? s.velocity.y : 0,
                },
                facing: {
                  x: typeof s.facing?.x === 'number' ? s.facing.x : 0,
                  y: typeof s.facing?.y === 'number' ? s.facing.y : 1,
                },
                walkPhase: typeof s.walkPhase === 'number' ? s.walkPhase : 0,
                isWalking: Boolean(s.isWalking),
                timestamp: now,
              };
              player.lastSeen = now;

              // Broadcast update to room peers
              this.broadcastToRoom(
                player.sessionId,
                {
                  type: 'player.updated',
                  protocolVersion: 1,
                  playerId: boundPlayerId,
                  snapshot: player.snapshot,
                },
                boundPlayerId
              );
              break;
            }

            case 'player.emote': {
              if (!boundPlayerId) return;
              const player = this.players.get(boundPlayerId);
              if (!player) return;

              const now = Date.now();
              if (now - player.lastEmoteTime < 1200) return; // Rate limit 1.2s
              player.lastEmoteTime = now;

              const emoteId = String(msg.emoteId || 'wave').slice(0, 20);
              this.broadcastToRoom(player.sessionId, {
                type: 'player.emote',
                protocolVersion: 1,
                playerId: boundPlayerId,
                emoteId,
                startedAt: now,
                durationMs: 3000,
              });
              break;
            }

            case 'chat.send': {
              if (!boundPlayerId) return;
              const player = this.players.get(boundPlayerId);
              if (!player) return;

              const now = Date.now();
              if (now - player.lastChatTime < 1500) return; // Rate limit 1.5s
              player.lastChatTime = now;

              const rawText = String(msg.text || '').trim();
              if (!rawText || rawText.length > 120) return;

              // Sanitize basic control characters
              const cleanText = rawText.replace(/[<>]/g, '');

              this.broadcastToRoom(player.sessionId, {
                type: 'chat.received',
                protocolVersion: 1,
                senderId: boundPlayerId,
                senderName: player.identity.username,
                channel: msg.channel === 'session' ? 'session' : 'proximity',
                text: cleanText,
                position: player.snapshot.position,
                sentAt: now,
              });
              break;
            }

            case 'world.transition.request': {
              if (!boundPlayerId) return;
              const player = this.players.get(boundPlayerId);
              if (!player) return;

              const dest = String(msg.destinationId || 'town');
              const nextSessionId = msg.targetSessionId || (dest === 'trending_street' ? 'trending:street' : 'shared:city');

              // Move room
              this.leaveRoom(boundPlayerId, player.sessionId);
              player.sessionId = nextSessionId;
              player.districtId = dest;
              this.joinRoom(boundPlayerId, nextSessionId);

              // Acknowledge transition to player
              ws.send(
                JSON.stringify({
                  type: 'world.transition.accepted',
                  protocolVersion: 1,
                  playerId: boundPlayerId,
                  destinationId: dest,
                  nextSessionId,
                })
              );

              // Notify next session occupants
              this.broadcastToRoom(
                nextSessionId,
                {
                  type: 'player.joined',
                  protocolVersion: 1,
                  player: {
                    ...player.identity,
                    position: player.snapshot.position,
                    velocity: player.snapshot.velocity,
                    facing: player.snapshot.facing,
                    walkPhase: player.snapshot.walkPhase,
                    isWalking: false,
                    presenceState: player.presenceState,
                    currentDistrict: dest,
                    lastSeen: Date.now(),
                  },
                },
                boundPlayerId
              );
              break;
            }
          }
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        if (!boundPlayerId) return;
        const player = this.players.get(boundPlayerId);
        if (!player) return;

        const pid = boundPlayerId;
        const sid = player.sessionId;

        // Start 10s grace period for reconnection
        const timer = setTimeout(() => {
          this.leaveRoom(pid, sid);
          this.players.delete(pid);
          this.disconnectTimers.delete(pid);
          this.broadcastToRoom(sid, {
            type: 'player.left',
            protocolVersion: 1,
            playerId: pid,
            reason: 'disconnected',
          });
        }, 10000);

        this.disconnectTimers.set(pid, timer);
      });
    });
  }

  private joinRoom(playerId: string, sessionId: string) {
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, new Set());
    }
    this.rooms.get(sessionId)!.add(playerId);
  }

  private leaveRoom(playerId: string, sessionId: string) {
    const room = this.rooms.get(sessionId);
    if (room) {
      room.delete(playerId);
      if (room.size === 0) {
        this.rooms.delete(sessionId);
      }
    }
  }

  private broadcastToRoom(sessionId: string, payload: any, exceptPlayerId?: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const data = JSON.stringify(payload);
    for (const pid of room) {
      if (pid === exceptPlayerId) continue;
      const player = this.players.get(pid);
      if (player && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    }
  }
}
