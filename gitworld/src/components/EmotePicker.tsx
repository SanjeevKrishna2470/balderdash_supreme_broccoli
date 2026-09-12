import { useMultiplayerStore } from '../state/useMultiplayerStore';
import { AVAILABLE_EMOTES, type EmoteId } from '../world/realtimeTypes';
import './EmotePicker.css';

export function EmotePicker() {
  const isEmotePickerOpen = useMultiplayerStore((s) => s.isEmotePickerOpen);
  const setEmotePickerOpen = useMultiplayerStore((s) => s.setEmotePickerOpen);
  const sendEmote = useMultiplayerStore((s) => s.sendEmote);

  if (!isEmotePickerOpen) return null;

  const handleSelect = (emoteId: EmoteId) => {
    sendEmote(emoteId);
    setEmotePickerOpen(false);
  };

  return (
    <div className="emote-picker-backdrop" onClick={() => setEmotePickerOpen(false)}>
      <div
        className="emote-picker-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Choose an Emote"
      >
        <div className="emote-picker-header">
          <span className="emote-picker-title">Developer Gestures</span>
          <button
            type="button"
            className="emote-picker-close"
            onClick={() => setEmotePickerOpen(false)}
            aria-label="Close emote picker"
          >
            &times;
          </button>
        </div>

        <div className="emote-picker-grid">
          {AVAILABLE_EMOTES.map((emote) => (
            <button
              key={emote.id}
              type="button"
              className="emote-picker-item"
              onClick={() => handleSelect(emote.id)}
              title={emote.label}
            >
              <span className="emote-icon">{emote.icon}</span>
              <span className="emote-label">{emote.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
