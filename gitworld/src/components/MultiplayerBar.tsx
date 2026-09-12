import { useMultiplayerStore } from '../state/useMultiplayerStore';
import type { CameraPerspective } from '../world/cityTypes';
import './MultiplayerBar.css';

interface Props {
  viewMode: '2d' | '3d';
  perspective?: CameraPerspective;
  onTogglePerspective?: () => void;
}

export function MultiplayerBar({
  viewMode,
  perspective = 'orbit',
  onTogglePerspective,
}: Props) {
  const connectionState = useMultiplayerStore((s) => s.connectionState);
  const remotePlayers = useMultiplayerStore((s) => s.remotePlayers);
  const isEmotePickerOpen = useMultiplayerStore((s) => s.isEmotePickerOpen);
  const setEmotePickerOpen = useMultiplayerStore((s) => s.setEmotePickerOpen);
  const isChatOpen = useMultiplayerStore((s) => s.isChatOpen);
  const setChatOpen = useMultiplayerStore((s) => s.setChatOpen);

  const playerCount = 1 + remotePlayers.size;

  const statusLabel =
    connectionState === 'connected'
      ? 'Live GitWorld'
      : connectionState === 'connecting'
      ? 'Connecting...'
      : 'Offline / Single Player';

  const statusDotClass =
    connectionState === 'connected'
      ? 'multiplayer-dot--online'
      : connectionState === 'connecting'
      ? 'multiplayer-dot--connecting'
      : 'multiplayer-dot--offline';

  return (
    <aside className="multiplayer-bar" aria-label="Multiplayer and Perspective Controls">
      {/* 1. Connection Status & Live Presence */}
      <div className="multiplayer-status-pill" title={`Session status: ${statusLabel}`}>
        <span className={`multiplayer-dot ${statusDotClass}`} />
        <span className="multiplayer-status-text">{statusLabel}</span>
        <span className="multiplayer-badge" title="Active developers in world">
          {playerCount} {playerCount === 1 ? 'dev' : 'devs'}
        </span>
      </div>

      {/* 2. Emote Picker Toggle Button */}
      <button
        type="button"
        className={`multiplayer-btn ${isEmotePickerOpen ? 'multiplayer-btn--active' : ''}`}
        onClick={() => setEmotePickerOpen(!isEmotePickerOpen)}
        title="Trigger an emote gesture"
      >
        <span className="multiplayer-btn-icon">⚡</span>
        <span className="multiplayer-btn-label">Emote</span>
      </button>

      {/* 3. Proximity Chat Toggle Button */}
      <button
        type="button"
        className={`multiplayer-btn ${isChatOpen ? 'multiplayer-btn--active' : ''}`}
        onClick={() => setChatOpen(!isChatOpen)}
        title="Open proximity chat"
      >
        <span className="multiplayer-btn-icon">💬</span>
        <span className="multiplayer-btn-label">Chat</span>
      </button>

      {/* 4. First Person POV Toggle (3D Mode) */}
      {viewMode === '3d' && onTogglePerspective && (
        <button
          type="button"
          className={`multiplayer-btn multiplayer-btn--pov ${perspective === 'first_person' ? 'multiplayer-btn--active' : ''}`}
          onClick={onTogglePerspective}
          title="Toggle First-Person Minecraft-style POV (Key: V)"
        >
          <span className="multiplayer-btn-icon">👁</span>
          <span className="multiplayer-btn-label">
            {perspective === 'first_person' ? '1st Person' : 'Orbit 3D'}
          </span>
          <kbd className="multiplayer-kbd">V</kbd>
        </button>
      )}
    </aside>
  );
}
