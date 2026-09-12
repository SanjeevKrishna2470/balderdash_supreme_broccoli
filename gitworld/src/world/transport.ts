import type {
  ClientAuth,
  ConnectionState,
  RemotePlayerState,
  PlayerSnapshot,
  EmoteId,
} from './realtimeTypes';

export interface RealtimeTransport {
  connect(sessionId: string, auth: ClientAuth): Promise<void>;
  disconnect(): void;
  send(message: any): void;
  onMessage(type: string, handler: (message: any) => void): () => void;
  onConnectionChange(handler: (state: ConnectionState) => void): () => void;
  getConnectionState(): ConnectionState;
}

/**
 * Production WebSocket Transport
 * Connects to the backend server with automatic exponential backoff reconnection.
 */
export class WebSocketTransport implements RealtimeTransport {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private messageHandlers = new Map<string, Set<(message: any) => void>>();
  private connectionHandlers = new Set<(state: ConnectionState) => void>();
  private reconnectAttempt = 0;
  private reconnectTimer: any = null;
  private currentSessionId = 'shared:city';
  private currentAuth: ClientAuth | null = null;
  private intentionalClose = false;
  private url: string;

  constructor(url = 'ws://localhost:4000/ws') {
    this.url = url;
  }

  public async connect(sessionId: string, auth: ClientAuth): Promise<void> {
    this.intentionalClose = false;
    this.currentSessionId = sessionId;
    this.currentAuth = auth;
    this.setState('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.reconnectAttempt = 0;
          this.setState('connected');

          // Send session join immediately
          this.send({
            type: 'session.join',
            clientVersion: '1.0',
            sessionId: this.currentSessionId,
            districtId: 'town',
            player: {
              id: auth.playerId,
              username: auth.username,
              displayName: auth.displayName,
              avatarUrl: auth.avatarUrl,
              profileColorSeed: auth.profileColorSeed ?? 42,
            },
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type) {
              const handlers = this.messageHandlers.get(data.type);
              if (handlers) {
                handlers.forEach((h) => h(data));
              }
              const wildcards = this.messageHandlers.get('*');
              if (wildcards) {
                wildcards.forEach((h) => h(data));
              }
            }
          } catch {
            // Ignore malformed message
          }
        };

        this.ws.onclose = () => {
          if (!this.intentionalClose) {
            this.scheduleReconnect();
          } else {
            this.setState('disconnected');
          }
        };

        this.ws.onerror = () => {
          if (this.state === 'connecting') {
            reject(new Error('WebSocket connection failed'));
          }
        };
      } catch (err) {
        this.scheduleReconnect();
        reject(err);
      }
    });
  }

  public disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }

  public send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          ...message,
          protocolVersion: 1,
          messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sessionId: this.currentSessionId,
          sentAt: Date.now(),
        })
      );
    }
  }

  public onMessage(type: string, handler: (message: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  public onConnectionChange(handler: (state: ConnectionState) => void): () => void {
    this.connectionHandlers.add(handler);
    handler(this.state);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  private setState(state: ConnectionState) {
    this.state = state;
    this.connectionHandlers.forEach((h) => h(state));
  }

  private scheduleReconnect() {
    this.setState('reconnecting');
    this.reconnectAttempt++;
    const delay = Math.min(12000, 1000 * Math.pow(1.5, this.reconnectAttempt));

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.currentAuth && !this.intentionalClose) {
        this.connect(this.currentSessionId, this.currentAuth).catch(() => {});
      }
    }, delay);
  }
}

/**
 * Local Simulation Transport for Hackathon Demos and Offline Presentation
 * Simulates 5 realistic fellow developers walking, browsing storefronts, and sending emotes.
 */
export class LocalSimulationTransport implements RealtimeTransport {
  private state: ConnectionState = 'simulated';
  private messageHandlers = new Map<string, Set<(message: any) => void>>();
  private connectionHandlers = new Set<(state: ConnectionState) => void>();
  private simInterval: any = null;
  private currentSessionId = 'demo:world';

  // Seeded believable simulated developer bots
  private simulatedPlayers: RemotePlayerState[] = [
    {
      id: 'sim-dev-alex',
      username: 'alex_rust',
      displayName: 'Alex Rivers',
      profileColorSeed: 104,
      position: { x: 90, y: 110 },
      velocity: { x: 0, y: 0 },
      facing: { x: 0, y: 1 },
      walkPhase: 0,
      isWalking: false,
      presenceState: 'online',
      lastSeen: Date.now(),
      currentDistrict: 'town',
    },
    {
      id: 'sim-dev-sophia',
      username: 'sophia_ml',
      displayName: 'Sophia Chen',
      profileColorSeed: 215,
      position: { x: -70, y: 140 },
      velocity: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      walkPhase: 0,
      isWalking: false,
      presenceState: 'online',
      lastSeen: Date.now(),
      currentDistrict: 'town',
    },
    {
      id: 'sim-dev-marcus',
      username: 'marcus_go',
      displayName: 'Marcus Vance',
      profileColorSeed: 88,
      position: { x: 260, y: 130 },
      velocity: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      walkPhase: 0,
      isWalking: false,
      presenceState: 'online',
      lastSeen: Date.now(),
      currentDistrict: 'trending_street',
    },
    {
      id: 'sim-dev-zoe',
      username: 'zoe_web',
      displayName: 'Zoe Thorne',
      profileColorSeed: 142,
      position: { x: 340, y: 90 },
      velocity: { x: 0, y: 0 },
      facing: { x: -1, y: 0 },
      walkPhase: 0,
      isWalking: false,
      presenceState: 'online',
      lastSeen: Date.now(),
      currentDistrict: 'trending_street',
    },
    {
      id: 'sim-dev-kenji',
      username: 'kenji_sys',
      displayName: 'Kenji Sato',
      profileColorSeed: 301,
      position: { x: 420, y: 160 },
      velocity: { x: 0, y: 0 },
      facing: { x: 0, y: -1 },
      walkPhase: 0,
      isWalking: false,
      presenceState: 'online',
      lastSeen: Date.now(),
      currentDistrict: 'trending_street',
    },
  ];

  // Autonomous wander waypoints for simulated players
  private simTargets: Map<string, { x: number; y: number; waitTimer: number }> = new Map();

  public async connect(sessionId: string, _auth: ClientAuth): Promise<void> {
    this.currentSessionId = sessionId;
    this.state = 'simulated';
    this.connectionHandlers.forEach((h) => h('simulated'));

    // Initialize targets
    this.simulatedPlayers.forEach((p) => {
      this.simTargets.set(p.id, { x: p.position.x, y: p.position.y, waitTimer: Math.random() * 3 + 1 });
    });

    // Notify session accepted with initial simulated players
    setTimeout(() => {
      this.dispatch('session.accepted', {
        type: 'session.accepted',
        protocolVersion: 1,
        sessionId: this.currentSessionId,
        playerId: _auth.playerId,
        worldVersion: '1.0',
        players: this.simulatedPlayers,
      });
    }, 100);

    // Start autonomous simulation loop (runs at 15 Hz)
    if (this.simInterval) clearInterval(this.simInterval);
    let tickCount = 0;

    this.simInterval = setInterval(() => {
      tickCount++;
      const dt = 0.066;

      this.simulatedPlayers.forEach((p) => {
        let t = this.simTargets.get(p.id);
        if (!t) return;

        t.waitTimer -= dt;
        if (t.waitTimer <= 0) {
          // Pick a new wander target around town or Trending Street
          const isTrendingBot = p.currentDistrict === 'trending_street' || Math.random() > 0.6;
          if (isTrendingBot) {
            t.x = 240 + Math.random() * 260;
            t.y = 80 + Math.random() * 140;
          } else {
            t.x = -120 + Math.random() * 240;
            t.y = 60 + Math.random() * 180;
          }
          t.waitTimer = 4 + Math.random() * 6; // Stay at destination for a few seconds
        }

        const dx = t.x - p.position.x;
        const dy = t.y - p.position.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 8) {
          const speed = 75; // world units per sec
          const nx = dx / dist;
          const ny = dy / dist;
          p.facing = { x: nx, y: ny };
          p.velocity = { x: nx * speed, y: ny * speed };
          p.position.x += nx * speed * dt;
          p.position.y += ny * speed * dt;
          p.isWalking = true;
          p.walkPhase += dt * 7;
        } else {
          p.velocity = { x: 0, y: 0 };
          p.isWalking = false;
        }

        // Broadcast simulated player snapshot
        const snapshot: PlayerSnapshot = {
          inputSequence: tickCount,
          position: { ...p.position },
          velocity: { ...p.velocity },
          facing: { ...p.facing },
          walkPhase: p.walkPhase,
          isWalking: p.isWalking,
          timestamp: Date.now(),
        };

        this.dispatch('player.updated', {
          type: 'player.updated',
          protocolVersion: 1,
          playerId: p.id,
          snapshot,
        });

        // Occasional simulated emote (e.g. wave or celebrate)
        if (tickCount % 160 === 0 && Math.random() < 0.35) {
          const emotes: EmoteId[] = ['wave', 'celebrate', 'curious', 'thanks', 'point'];
          const picked = emotes[Math.floor(Math.random() * emotes.length)];
          this.dispatch('player.emote', {
            type: 'player.emote',
            protocolVersion: 1,
            playerId: p.id,
            emoteId: picked,
            startedAt: Date.now(),
            durationMs: 3000,
          });
        }
      });
    }, 66);
  }

  public disconnect(): void {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.state = 'disconnected';
    this.connectionHandlers.forEach((h) => h('disconnected'));
  }

  public send(message: any): void {
    // In local simulation, if player transitions district, echo transition accepted
    if (message.type === 'world.transition.request') {
      setTimeout(() => {
        this.dispatch('world.transition.accepted', {
          type: 'world.transition.accepted',
          protocolVersion: 1,
          destinationId: message.destinationId,
          nextSessionId: message.destinationId === 'trending_street' ? 'trending:street' : 'demo:world',
        });
      }, 80);
    }

    // Echo local player emotes back so UI can display them seamlessly
    if (message.type === 'player.emote') {
      this.dispatch('player.emote', {
        type: 'player.emote',
        protocolVersion: 1,
        playerId: 'local-player',
        emoteId: message.emoteId,
        startedAt: Date.now(),
        durationMs: 3000,
      });
    }

    // Echo chat if sent
    if (message.type === 'chat.send') {
      this.dispatch('chat.received', {
        type: 'chat.received',
        protocolVersion: 1,
        senderId: 'local-player',
        senderName: 'You',
        channel: message.channel || 'proximity',
        text: message.text,
        sentAt: Date.now(),
      });
    }
  }

  public onMessage(type: string, handler: (message: any) => void): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  public onConnectionChange(handler: (state: ConnectionState) => void): () => void {
    this.connectionHandlers.add(handler);
    handler(this.state);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  public getConnectionState(): ConnectionState {
    return this.state;
  }

  private dispatch(type: string, message: any) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.forEach((h) => h(message));
    }
    const wildcards = this.messageHandlers.get('*');
    if (wildcards) {
      wildcards.forEach((h) => h(message));
    }
  }
}
