import { create } from 'zustand';
import type {
  ConnectionState,
  RemotePlayerState,
  PlayerSnapshot,
  EmoteId,
  ClientAuth,
} from '../world/realtimeTypes';
import { PlayerSnapshotInterpolator } from '../world/remotePlayerInterpolation';
import type { RealtimeTransport } from '../world/transport';
import { WebSocketTransport, LocalSimulationTransport } from '../world/transport';
import type { TrendingRepositoryManifest, TrendingStorefrontBuilding } from '../world/trendingTypes';

export interface ChatMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  channel: 'proximity' | 'session';
  text: string;
  position?: { x: number; y: number };
  sentAt: number;
}

interface MultiplayerState {
  transport: RealtimeTransport | null;
  connectionState: ConnectionState;
  sessionId: string;
  currentDistrict: 'town' | 'trending_street';
  remotePlayers: Map<string, RemotePlayerState>;
  interpolators: Map<string, PlayerSnapshotInterpolator>;
  activeEmotes: Map<string, { emoteId: EmoteId; startedAt: number }>;
  chatMessages: ChatMessageItem[];
  trendingManifest: TrendingRepositoryManifest[];
  selectedStorefront: TrendingStorefrontBuilding | null;
  isEmotePickerOpen: boolean;
  isChatOpen: boolean;

  // Actions
  initTransport: (auth: ClientAuth, preferWs?: boolean) => Promise<void>;
  disconnectTransport: () => void;
  sendSnapshot: (snapshot: PlayerSnapshot) => void;
  sendEmote: (emoteId: EmoteId) => void;
  sendChat: (text: string, channel?: 'proximity' | 'session') => void;
  transitionDistrict: (district: 'town' | 'trending_street') => void;
  selectStorefront: (sf: TrendingStorefrontBuilding | null) => void;
  setEmotePickerOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setTrendingManifest: (manifests: TrendingRepositoryManifest[]) => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  transport: null,
  connectionState: 'disconnected',
  sessionId: 'shared:city',
  currentDistrict: 'town',
  remotePlayers: new Map(),
  interpolators: new Map(),
  activeEmotes: new Map(),
  chatMessages: [],
  trendingManifest: [],
  selectedStorefront: null,
  isEmotePickerOpen: false,
  isChatOpen: false,

  initTransport: async (auth: ClientAuth, preferWs = true) => {
    // Teardown existing
    const existing = get().transport;
    if (existing) existing.disconnect();

    let transport: RealtimeTransport;
    const initialSession = get().currentDistrict === 'trending_street' ? 'trending:street' : 'shared:city';

    if (preferWs) {
      transport = new WebSocketTransport();
    } else {
      transport = new LocalSimulationTransport();
    }

    set({ transport, sessionId: initialSession });

    transport.onConnectionChange((state) => {
      set({ connectionState: state });
    });

    // Wire message handlers
    transport.onMessage('session.accepted', (msg) => {
      const pMap = new Map<string, RemotePlayerState>();
      const iMap = new Map<string, PlayerSnapshotInterpolator>();

      if (Array.isArray(msg.players)) {
        msg.players.forEach((p: RemotePlayerState) => {
          if (p.id !== auth.playerId) {
            pMap.set(p.id, p);
            const interp = new PlayerSnapshotInterpolator();
            interp.pushSnapshot({
              inputSequence: 0,
              position: p.position,
              velocity: p.velocity,
              facing: p.facing,
              walkPhase: p.walkPhase,
              isWalking: p.isWalking,
              timestamp: Date.now(),
            });
            iMap.set(p.id, interp);
          }
        });
      }
      set({ remotePlayers: pMap, interpolators: iMap });
    });

    transport.onMessage('player.joined', (msg) => {
      const p = msg.player;
      if (!p || p.id === auth.playerId) return;

      const pMap = new Map(get().remotePlayers);
      const iMap = new Map(get().interpolators);

      pMap.set(p.id, p);
      const interp = new PlayerSnapshotInterpolator();
      interp.pushSnapshot({
        inputSequence: 0,
        position: p.position,
        velocity: p.velocity,
        facing: p.facing,
        walkPhase: p.walkPhase,
        isWalking: p.isWalking,
        timestamp: Date.now(),
      });
      iMap.set(p.id, interp);

      set({ remotePlayers: pMap, interpolators: iMap });
    });

    transport.onMessage('player.updated', (msg) => {
      const { playerId, snapshot } = msg;
      if (!playerId || !snapshot) return;

      const interp = get().interpolators.get(playerId);
      if (interp) {
        interp.pushSnapshot(snapshot);
      }

      const p = get().remotePlayers.get(playerId);
      if (p) {
        p.position = snapshot.position;
        p.velocity = snapshot.velocity;
        p.facing = snapshot.facing;
        p.walkPhase = snapshot.walkPhase;
        p.isWalking = snapshot.isWalking;
        p.lastSeen = Date.now();
      }
    });

    transport.onMessage('player.left', (msg) => {
      const { playerId } = msg;
      if (!playerId) return;

      const pMap = new Map(get().remotePlayers);
      const iMap = new Map(get().interpolators);
      pMap.delete(playerId);
      iMap.delete(playerId);

      set({ remotePlayers: pMap, interpolators: iMap });
    });

    transport.onMessage('player.emote', (msg) => {
      const { playerId, emoteId } = msg;
      if (!playerId || !emoteId) return;

      const emotes = new Map(get().activeEmotes);
      emotes.set(playerId, { emoteId, startedAt: Date.now() });
      set({ activeEmotes: emotes });

      // Clean up after 3.2s
      setTimeout(() => {
        const updated = new Map(get().activeEmotes);
        updated.delete(playerId);
        set({ activeEmotes: updated });
      }, 3200);
    });

    transport.onMessage('chat.received', (msg) => {
      const item: ChatMessageItem = {
        id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        senderId: msg.senderId,
        senderName: msg.senderName,
        channel: msg.channel || 'proximity',
        text: msg.text,
        position: msg.position,
        sentAt: msg.sentAt || Date.now(),
      };

      set((state) => ({
        chatMessages: [...state.chatMessages.slice(-20), item],
      }));

      // Auto-expire chat bubble after 4.5s
      setTimeout(() => {
        set((state) => ({
          chatMessages: state.chatMessages.filter((c) => c.id !== item.id),
        }));
      }, 4500);
    });

    try {
      await transport.connect(initialSession, auth);
    } catch {
      // Fallback seamlessly to local simulation transport if server is offline
      if (preferWs) {
        get().initTransport(auth, false);
      }
    }
  },

  disconnectTransport: () => {
    get().transport?.disconnect();
    set({
      transport: null,
      connectionState: 'disconnected',
      remotePlayers: new Map(),
      interpolators: new Map(),
    });
  },

  sendSnapshot: (snapshot: PlayerSnapshot) => {
    get().transport?.send({
      type: 'player.snapshot',
      snapshot,
    });
  },

  sendEmote: (emoteId: EmoteId) => {
    get().transport?.send({
      type: 'player.emote',
      emoteId,
    });
    set({ isEmotePickerOpen: false });
  },

  sendChat: (text: string, channel = 'proximity') => {
    if (!text.trim()) return;
    get().transport?.send({
      type: 'chat.send',
      channel,
      text: text.trim().slice(0, 120),
    });
    set({ isChatOpen: false });
  },

  transitionDistrict: (district: 'town' | 'trending_street') => {
    const nextSession = district === 'trending_street' ? 'trending:street' : 'shared:city';
    set({ currentDistrict: district, sessionId: nextSession });
    get().transport?.send({
      type: 'world.transition.request',
      destinationId: district,
      targetSessionId: nextSession,
    });
  },

  selectStorefront: (sf) => set({ selectedStorefront: sf }),
  setEmotePickerOpen: (open) => set({ isEmotePickerOpen: open }),
  setChatOpen: (open) => set({ isChatOpen: open }),
  setTrendingManifest: (manifests) => set({ trendingManifest: manifests }),
}));
