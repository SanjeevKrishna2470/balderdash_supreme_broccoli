import './ErrorScreen.css';

interface Props {
  message: string | null;
  onRetry: () => void;
  onDemo: () => void;
}

export function ErrorScreen({ message, onRetry, onDemo }: Props) {
  return (
    <div className="error-screen">
      <div className="error-card">
        <span className="error-eyebrow">GitWorld couldn&rsquo;t be built</span>
        <h1 className="error-title">The city didn&rsquo;t come together.</h1>
        <p className="error-message">
          {message ?? 'GitHub could not be reached, or the request was rate-limited. Nothing was lost — try again in a moment.'}
        </p>
        <div className="error-actions">
          <button className="error-retry" onClick={onRetry}>
            Try again
          </button>
          <button className="error-demo" onClick={onDemo}>
            Explore the demo city instead
          </button>
        </div>
      </div>
    </div>
  );
}
