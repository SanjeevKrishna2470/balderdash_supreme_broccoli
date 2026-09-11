# GitWorld (frontend)

Turns a GitHub account into an explorable 2D city. See `src/App.tsx` for the
screen flow and `CLAUDE.md`-style brief this was built against.

## Run it

```bash
npm install
npm run dev
```

Demo mode (the "Try the demo city" button on the landing screen) works with
zero configuration — it never touches the network.

Live mode expects a backend at `VITE_API_BASE` (defaults to
`http://localhost:5000`) exposing:

- `GET /api/auth/github` — redirects into the GitHub OAuth flow
- `GET /api/auth/me` — `{ isAuthenticated, user }`
- `GET /api/repos` — normalized `RepositoryModel[]` (requires an authenticated session)

Set `VITE_API_BASE` in a `.env` file if your backend runs somewhere else.

## Architecture

- `src/world/` — pure, deterministic world generation (`worldBuilder.ts`) from
  normalized `RepositoryModel[]` data, independent of rendering.
- `src/render/` — canvas camera, drawing primitives, and the `CityCanvas`
  component that owns the simulation loop (movement, hover/select hit-testing,
  fly-to).
- `src/state/` — Zustand store for screen/world/UI state.
- `src/components/` — React chrome: landing, loading, error, top bar, search,
  repo detail panel, mobile controls.
