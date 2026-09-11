# GitWorld Project Structural Summary

## 1. System Overview

GitWorld is split into two independent applications stored in one repository:

| Application | Directory | Runtime | Deployment role |
|---|---|---|---|
| Frontend | `gitworld/` | React and Vite in the browser | Serves the interactive GitWorld application |
| Backend | `server/` | Node.js and Express | Provides API routes, GitHub OAuth, sessions, repository access, world data, and settings |

The frontend and backend have separate `package.json` files, dependency trees, TypeScript configurations, and build processes. The frontend is deployed as a Render Static Site. The backend is deployed as a Render Web Service.

## 2. Repository Structure

```text
repository-root/
├── gitworld/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── index.css
│       ├── types.ts
│       ├── components/
│       ├── render/
│       ├── state/
│       ├── styles/
│       └── world/
│
├── server/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   └── src/
│       ├── server.ts
│       ├── config.ts
│       ├── types.ts
│       ├── middleware/
│       ├── routes/
│       └── services/
│
├── README.md
├── AGENT.md
└── .gitignore
```

The `dist/` and `node_modules/` directories are generated or installed directories. The `.gitignore` file excludes `node_modules/`, `dist/`, `.env`, and `.env.local`.

## 3. Frontend Structure

The frontend entry point is `gitworld/src/main.tsx`. It mounts the React application into the HTML element with the `root` identifier.

`gitworld/src/App.tsx` is the main application coordinator. It selects between the landing, loading, error, city, and repository screens. It also coordinates session lookup, GitHub login initiation, username exploration, repository entry, repository exit, search, logout, and code viewing.

### Frontend areas

| Area | Location | Responsibility |
|---|---|---|
| Application coordinator | `src/App.tsx` | Connects application state, API calls, screen transitions, and UI components |
| UI components | `src/components/` | Landing screen, loading state, error screen, top bar, repository panels, search, code viewer, and controls |
| World rendering | `src/render/` | Draws the city and repository worlds and handles canvas interaction |
| Client state | `src/state/` | Stores the current screen, world, selected building, active repository, and related UI state |
| World builders | `src/world/` | Converts repository and user data into city and repository-world models |
| API helpers | `src/world/api.ts` and `src/world/repoApi.ts` | Requests authentication, user, repository, tree, file, and public-world data |
| Mock data | `src/world/mockRepos.ts` and related files | Supports demo mode and fallback content |
| Types | `src/types.ts` and world-specific type files | Defines frontend data models |

### Frontend dependencies

The frontend package uses React, React DOM, Zustand, Vite, TypeScript, the React Vite plugin, and Oxlint. The production frontend build command is:

```bash
npm run build
```

That command runs TypeScript project compilation followed by `vite build`. The generated static files are written to `gitworld/dist`.

## 4. Backend Structure

The backend entry point is `server/src/server.ts`. It creates the Express application, configures proxy trust, configures CORS, parses JSON, configures cookie sessions, registers routes, exposes the health endpoint, and starts the HTTP server.

The backend reads configuration from environment variables through `server/src/config.ts`. The defined settings include the port, frontend client URL, session secret, GitHub OAuth client ID, GitHub OAuth client secret, and GitHub callback URL.

### Backend areas

| Area | Location | Responsibility |
|---|---|---|
| Server entry point | `src/server.ts` | Express setup, middleware, route mounting, and server startup |
| Configuration | `src/config.ts` | Environment-variable loading and default values |
| Session and auth types | `src/middleware/auth.ts` | Request session typing and authenticated-route guard |
| Authentication routes | `src/routes/auth.ts` | OAuth start, OAuth callback, current session, mock login, and logout |
| Repository routes | `src/routes/repos.ts` | Repository lists, repository creation, trees, contents, files, and related data |
| World routes | `src/routes/world.ts` | User worlds and public-world data |
| User routes | `src/routes/user.ts` | User profile and RPG-style statistics |
| Settings routes | `src/routes/settings.ts` | Game settings and preferences |
| GitHub service | `src/services/github.ts` | GitHub API requests, response caching, repository data, trees, files, and languages |
| World generator | `src/services/worldGenerator.ts` | Server-side world generation support |
| Classifier | `src/services/classifier.ts` | Repository and code classification |
| Normalizers | `src/services/normalizer.ts` and `src/services/repoTreeNormalizer.ts` | Converts GitHub responses into application models |

## 5. Backend Routes

The backend mounts the following route groups:

| Route | Defined by | Function |
|---|---|---|
| `GET /api/health` | `server.ts` | Returns backend health status and a timestamp |
| `/api/auth/*` | `routes/auth.ts` | Starts OAuth, receives the OAuth callback, returns session state, supports mock login, and logs out |
| `/api/world/*` | `routes/world.ts` | Returns generated personal and public world information |
| `/api/repos/*` | `routes/repos.ts` | Returns repositories and repository structure, reads files, and handles repository creation |
| `/api/user/*` | `routes/user.ts` | Returns developer profile and statistics |
| `/api/settings/*` | `routes/settings.ts` | Reads and updates game settings |

The backend root path `/` is not the application homepage. The backend is an API service. The frontend homepage is served by the Render Static Site.

## 6. Authentication Flow

The frontend starts authentication by navigating to the backend authentication route. The backend constructs a GitHub authorization URL using the configured client ID, callback URL, and requested OAuth scope.

The normal OAuth route is:

```text
GET /api/auth/github
```

The callback route is:

```text
GET /api/auth/callback
```

After GitHub returns an authorization code, the backend exchanges the code for an access token. It then requests the authenticated GitHub profile, stores the access token and user profile in the server-side cookie session, and redirects to the frontend with an authentication result query parameter.

The frontend subsequently calls:

```text
GET /api/auth/me
```

The response includes an `isAuthenticated` flag, the authenticated user when available, and gatekeeper state.

The frontend then calls:

```text
GET /api/repos
```

to obtain repository data for the world.

The frontend API helper uses the `VITE_API_BASE` environment variable as the backend origin. Its local fallback is `http://localhost:5000` when that variable is absent during a frontend build.

## 7. Public and Private Repository Access

The repository contains support for a public-only default and an optional private-repository authorization flow.

The normal OAuth route requests:

```text
read:user public_repo
```

The optional private-access route is:

```text
GET /api/auth/github/private
```

That route requests:

```text
read:user repo
```

The session can record whether private access was enabled. The repository route selects the public-user repository endpoint by default and the authenticated-user repository endpoint when the session indicates private access.

The frontend exposes a private-access action in the top bar for live sessions. Selecting that action starts the optional private-permission OAuth flow.

## 8. Data Flow for World Generation

For a live signed-in session, the data flow is:

```text
GitHub OAuth
    ↓
Backend session
    ↓
/api/auth/me
    ↓
/api/repos
    ↓
RepositoryNormalizer
    ↓
Frontend buildCity(...)
    ↓
CityWorldModel
    ↓
CityCanvas
```

For repository inspection, the flow is:

```text
City repository building
    ↓
Frontend fetchRepoTree(owner, repo)
    ↓
Backend repository tree route or public GitHub fallback
    ↓
RepoTreeNormalizer / frontend tree builder
    ↓
buildRepoWorld(...)
    ↓
RepoCanvas
```

For demo mode, the frontend uses local mock repositories and a mock user. Demo mode does not require GitHub OAuth.

## 9. Render Deployment Structure

The two applications are deployed separately.

### Frontend Static Site

```text
Root Directory: gitworld
Build Command: npm install && npm run build
Publish Directory: dist
```

The frontend requires:

```env
VITE_API_BASE=https://<backend-service>.onrender.com
```

### Backend Web Service

```text
Root Directory: server
Build Command: npm install && npm run build
Start Command: npx tsx src/server.ts
Health Check Path: /api/health
```

The backend requires values equivalent to:

```env
NODE_ENV=production
CLIENT_URL=https://<frontend-service>.onrender.com
SESSION_SECRET=<secret>
GITHUB_CLIENT_ID=<oauth-client-id>
GITHUB_CLIENT_SECRET=<oauth-client-secret>
GITHUB_CALLBACK_URL=https://<backend-service>.onrender.com/api/auth/callback
```

The frontend URL is used as the CORS origin and post-authentication redirect destination. The backend URL is used as the OAuth callback host and frontend API base.

## 10. Observed Runtime Responses

The following responses and behaviors have been observed during deployment testing:

| Observation | Meaning of the observation |
|---|---|
| `/api/health` returned `status: ok` | The deployed backend responded to the health route |
| `/api/auth/me` returned `isAuthenticated: true` for the account `SanjeevKrishna2470` | At that time, the backend returned an authenticated session for that request |
| `/api/auth/me` returned HTTP `200` with `isAuthenticated: false` | At that time, the route responded but did not identify an authenticated session for that request |
| GitHub returned a secondary rate-limit message | GitHub rejected requests because of its secondary request limit |
| The browser displayed a CORS error with a trailing slash | The configured CORS origin differed from the browser origin string |
| The live frontend bundle contained the deployed backend origin and `credentials: include` | The checked deployed JavaScript bundle had those values |

These observations describe responses at particular times. They do not by themselves establish the state of later requests, cookies, deployments, or GitHub limits.

## 11. Current Verification Checklist

The following checks identify the state of each layer without combining them into one conclusion:

| Layer | Direct check |
|---|---|
| Frontend availability | Open `https://<frontend-service>.onrender.com` |
| Backend availability | Open `https://<backend-service>.onrender.com/api/health` |
| Frontend API origin | Inspect the frontend bundle or the Network request URL |
| OAuth redirect | Inspect the redirect from `/api/auth/github` |
| Session response | Inspect the JSON response from `/api/auth/me` |
| Session transport | Inspect the request headers for the session cookie |
| Repository loading | Inspect the status and body of `/api/repos` |
| GitHub request limits | Inspect backend logs and GitHub response status/body |
| Deployed source version | Compare the Render deployment commit with the repository commit |

## References

[1]: https://github.com/SanjeevKrishna2470/useless_project_temp1 "GitWorld source repository"

[2]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps "GitHub OAuth app authorization documentation"

[3]: https://render.com/docs "Render documentation"
