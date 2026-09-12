import { useState, useRef, useEffect } from 'react';
import { useMultiplayerStore } from '../state/useMultiplayerStore';
import './ProximityChat.css';

export function ProximityChat() {
  const isChatOpen = useMultiplayerStore((s) => s.isChatOpen);
  const setChatOpen = useMultiplayerStore((s) => s.setChatOpen);
  const chatMessages = useMultiplayerStore((s) => s.chatMessages);
  const sendChat = useMultiplayerStore((s) => s.sendChat);

  const [inputVal, setInputVal] = useState('');
  const [channel, setChannel] = useState<'proximity' | 'session'>('proximity');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages, isChatOpen]);

  if (!isChatOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    sendChat(inputVal.trim(), channel);
    setInputVal('');
  };

  return (
    <div className="proximity-chat-container">
      <div className="proximity-chat-header">
        <div className="proximity-chat-tabs">
          <button
            type="button"
            className={`proximity-tab ${channel === 'proximity' ? 'proximity-tab--active' : ''}`}
            onClick={() => setChannel('proximity')}
            title="Messages visible only to nearby developers"
          >
            Proximity
          </button>
          <button
            type="button"
            className={`proximity-tab ${channel === 'session' ? 'proximity-tab--active' : ''}`}
            onClick={() => setChannel('session')}
            title="Messages broadcast to the entire city"
          >
            City
          </button>
        </div>

        <button
          type="button"
          className="proximity-chat-close"
          onClick={() => setChatOpen(false)}
          aria-label="Close chat"
        >
          &times;
        </button>
      </div>

      <div className="proximity-chat-messages" ref={scrollRef}>
        {chatMessages.length === 0 ? (
          <div className="proximity-empty-hint">No messages yet. Say hello to developers nearby!</div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className="proximity-message-line">
              <span className="proximity-sender">{msg.senderName}:</span>
              <span className="proximity-text">{msg.text}</span>
            </div>
          ))
        )}
      </div>

      <form className="proximity-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="proximity-chat-input"
          placeholder={channel === 'proximity' ? 'Chat with nearby devs...' : 'Broadcast to city...'}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          maxLength={140}
          autoFocus
        />
        <button type="submit" className="proximity-chat-send" disabled={!inputVal.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
