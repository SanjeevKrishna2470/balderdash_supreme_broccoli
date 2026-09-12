# GitWorld 3D (Version 2.1 Refinement Pass) — Final Deliverables & Documentation

---

## 1. Working GitWorld 3D Web Application

GitWorld 3D transforms a developer’s GitHub account into an explorable, living 3D architectural city. Repositories become distinctive, procedurally generated buildings whose scale, silhouette, materials, and condition reflect real repository data. Long-dormant projects undergo deterministic ecological aging (grass, shrubs, trees, vines, and weathered patinas).

- **Frontend**: React 19 + TypeScript + Three.js + Vite.
- **Backend**: Node.js + Express (OAuth, session management, repository normalizer).
- **Core Modes**:
  - **3D Explore Mode**: Hero experience with smooth damped orbit, pan, zoom, click-inspection, fly-to transitions, and day/night atmospheric depth.
  - **2D Map Mode**: Preserved tactical overview with instant, context-preserving switching.

---

## 2. Local Setup Guide & Required Environment Variables

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation
From the repository root (`useless_project_temp1`):

```bash
# 1. Install backend dependencies
cd server
npm install

# 2. Install frontend dependencies
cd ../gitworld
npm install
```

### Environment Variables

#### Backend (`server/.env`):
```env
PORT=5000
CLIENT_URL=http://localhost:5173
SESSION_SECRET=your_development_session_secret_key_here
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/callback
NODE_ENV=development
```

#### Frontend (`gitworld/.env`):
```env
VITE_API_BASE=http://localhost:5000
```

### Running Locally
```bash
# In terminal 1 (Backend):
cd server
npm run dev

# In terminal 2 (Frontend):
cd gitworld
npm run dev
```
Open `http://localhost:5173` in any modern WebGL-enabled browser.

---

## 3. Demo Mode (Zero Credentials Required)

GitWorld 3D includes a rich seeded demo mode that works instantly without requiring GitHub credentials, OAuth setup, or personal access tokens:

- Click **"Explore Demo City"** on the landing page.
- Loads a diverse software portfolio representing multiple districts, languages (TypeScript, Python, Rust, Go, C++, Ruby, HTML/CSS), and activity tiers:
  - **Landmark Tower**: Highly starred flagship project (`hypergrid`) with illuminated spires, active contributor agents, and glowing dependency paths.
  - **Overgrown / Dormant Project**: Abandoned side project (`retro-gl`) untouched for 3+ years, featuring weathered facades, dense procedural grass, shrubs, mature trees, and creeping ivy.
  - **Active Work with Pull Requests**: Repository under active construction (`nexus-core`) with scaffolding lattices and rooftop cranes.
  - **Open Issues**: Buildings with visible orange/red hazard beacons and caution cones.
  - **Forks / Satellites**: High-fork projects displaying satellite outposts on the building plot.

---

## 4. 3D Rendering & World-Generation Architecture

The system maintains a clean 6-layer separation:

```text
┌─────────────────────────────────────────────────────────┐
│                     UI Layer                            │
│  TopBar (3D/2D switcher, settings, search, overview)   │
│  RepoPanel (traceable profile, stats, actions)          │
└───────────────────────────▲─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                  Simulation Layer                       │
│  Camera orbit/pan damping, raycasting, selection state  │
│  Zustand store (useWorldStore)                          │
└───────────────────────────▲─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                 3D Scene Layer (Three.js)               │
│  City3DCanvas: ACESFilmic tonemapping, fog, lights      │
│  Procedural Buildings, Vegetation, Roads, Agents        │
└───────────────────────────▲─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│              World Generation Layer                     │
│  buildCity: Deterministic radial district packing       │
│  visualProfile: Traceable BuildingVisualProfile         │
└───────────────────────────▲─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│               Normalization Layer                       │
│  RepositoryNormalizer: Maps GitHub API to Repository    │
└───────────────────────────▲─────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────┐
│                   GitHub Layer                          │
│  OAuth, caching, rate-limit fallback, mock fallback     │
└─────────────────────────────────────────────────────────┘
```

- **Render Loop Decoupled from React**: Three.js runs its own high-performance `requestAnimationFrame` loop, reading refs without triggering cascading React re-renders.
- **Resource Disposal**: Geometries and materials are disposed on unmount, preventing WebGL memory leaks.

---

## 5. Building-Generation Rules, Visual Profile & Ecological Aging

### Traceable Visual Profile (`BuildingVisualProfile`)
Every building generates a deterministic visual profile tracking exact inputs:
- `repoId` & `stableSeed`
- `tier` & `tierReason` (stars + size logarithmic scaling)
- `dominantLanguage` & `architecturalMotif`
- `projectType` (frontend, backend, library, CLI, data, documentation, fullstack)
- `ecologicalState` & `ecologicalAgeDescription`
- `overgrowthLevel` (0.0 to 1.0) & `weatheringFactor` (0.0 to 1.0)
- `signalsSummary`: Bulleted explanations visible in the UI under **"Why does this building look this way?"**.

### Architectural Grammars & Motifs
- **Massing Grammars**: `central_tower` (landmark), `stepped_setback` (art-deco), `l_shaped` (courtyard), `terraced_pavilion` (cantilevered decks), `modular_compound` (twin towers with skybridge).
- **Language Architectural Motifs**:
  - **TypeScript**: Vertical spire crown, cyan/slate palette, modern glass.
  - **JavaScript**: Modular geometric blocks, warm amber illumination.
  - **Python**: Layered terraces, hemispherical cupola/dome, emerald accents.
  - **Go**: Cylindrical utility silos, bright cyan energy.
  - **Rust**: Faceted angular peak, sturdy foundations, copper/ember accents.
  - **Java / Kotlin**: Orderly campus tower, structured facade rhythm.
  - **C / C++**: Industrial exoskeleton framework and infrastructure foundation.
  - **Ruby**: Refined rounded boutique volumes, crimson warmth.
  - **HTML / CSS**: Multi-tiered colorful facade panels and rooftop garden.

### Ecological Aging System
Aging is calculated deterministically from time since last push:

| Days Inactive | Ecological State | Grounds & Foliage | Facade Condition |
|---|---|---|---|
| 0–30 days | **Active** | Maintained stone plazas, clean curbs, lit warm windows | Pristine, vibrant accent colors |
| 30–180 days | **Quiet** | Calm maintained lawns, slight softening | Dim entrances, calm tones |
| 180–365 days | **Aging** | Small grass tufts, early climbing vines on lower walls | Cooler, slightly weathered |
| 1–3 years | **Overgrown** | Noticeable grass blades, shrubs, young trees, creeping ivy | Weathered desaturation, closed doors |
| 3+ years | **Old building**| Dense grass, mature trees along perimeter, climbing ivy | Weathered patina, mossy foundation accents |

*Foliage is placed strictly away from entrance doorways so buildings remain accessible.*

---

## 6. UI Refinement Summary: Calm, Layered, and Never Clunky

- **Hierarchy & Safe Zones**:
  1. **Orientation Layer**: Fixed top bar with wordmark, badge, 3D/2D pill switcher, camera overview reset, settings gear, and profile avatar.
  2. **Context Layer**: Hover repository name in the top bar center; glowing yellow building selection outline; pulsating dependency highway lines.
  3. **Inspection Layer**: Focused `RepoPanel` anchored on the right (converting to a smooth bottom sheet on mobile screens `< 640px`).
- **Progressive Disclosure**:
  - Uncluttered viewports: no walls of floating text.
  - The repository panel provides a dedicated **"Why does this building look this way?"** accordion revealing the complete visual profile without cluttering primary stats.
- **Anti-Clunk Decisions**:
  - Clicking empty ground closes the inspection panel without jarring camera jerks.
  - Switching between 3D and 2D preserves the selected building and camera focus.
  - Reduced Motion replaces fly-to animations with immediate cuts and stops pulsating glows.

---

## 7. Performance Strategy

- **Instanced Foliage & Agents**:
  - `InstancedMesh` used for grass tufts, shrubs, tree trunks/canopies, wall vines, and contributor agent bodies/heads, consolidating thousands of objects into single draw calls.
- **Quality Presets**:
  - **High**: Full directional soft shadows (2048x2048 shadow map, PCFSoftShadowMap), full vegetation density, 4 agents per active building, 2x pixel ratio.
  - **Balanced** (Default): Optimized shadows (1024x1024), balanced density, steady 60 FPS on standard laptops.
  - **Performance**: Shadows disabled, essential vegetation only, 1 agent per active building, reduced particle passes.
- **Frustum Culling**: Three.js standard bounding sphere culling automatically active on all meshes.
- **Graceful Degradation**: Automated WebGL detection: if WebGL initialization fails, GitWorld seamlessly falls back to 2D Map Mode with a helpful notification.

---

## 8. Known Limitations

1. **Dependency Resolution Scope**: In-world dependencies are derived from same-account relationships, package manifests, and forks. Deep multi-package lockfile resolution is omitted to prevent GitHub API rate-limit exhaustion.
2. **Terrain Elevation**: The terrain uses gentle district plaza elevations rather than complex mountainous procedural heightmaps to keep building footprints and road connections clean.
3. **Internal Room Modeling**: While repository interiors are fully explorable via the 2D RepoCanvas, the 3D mode focuses on the exterior architectural city.

---

## 9. Prioritized Roadmap

1. **Phase 1: 3D Repository Interiors**: Transition smoothly from 3D exterior building doors into stylized 3D interior rooms (file rooms, dependency libraries, and commit galleries).
2. **Phase 2: Day / Night / Season Cycle**: Real-time celestial simulation matching the user's local timezone (dawn, midday sun, golden dusk, starlit night with window glows).
3. **Phase 3: Analytics Heatmap Mode**: Overlay visual heatmaps onto facades showing test coverage, churn rate, vulnerability warnings, and PR turnaround times.
4. **Phase 4: City Sharing & Multiplayer Spectator**: Generate shareable read-only city links with avatar presence to tour colleagues through project architecture.
5. **Phase 5: Real-Time Webhook Streaming**: Live Git commit animations where new commits trigger visible delivery trucks arriving at buildings and turning on lights in real-time.

---

## 10. Two-Minute Judge's Walkthrough

1. **Minute 0:00 – 0:20 | First Frame & Overview**:
   - Launch app -> Click **"Explore Demo City"**.
   - Observe the 3D isometric city from above: distinct district plazas, glowing road networks, and towering architectural landmarks.
2. **Minute 0:20 – 0:50 | Architectural Storytelling & Navigation**:
   - Orbit and zoom into `hypergrid`: Note the towering spires, radiant blue glass, active contributor agents, and illuminated windows.
   - Click to select: Notice the smooth camera framing, road highlight pulse, and details panel opening.
   - Expand **"Why does this building look this way?"**: Show the judge the exact data signals driving its height, spire motif, and active state.
3. **Minute 0:50 – 1:20 | Ecological Aging & Inactive Repositories**:
   - Pan over to `retro-gl`: Untouched for over 3 years.
   - Note the weathered facade, dense grass, shrubs, mature trees growing around the plot edges, and climbing ivy vines.
   - Inspect `nexus-core`: Notice the yellow scaffolding lattice and rooftop construction crane driven by open pull requests.
4. **Minute 1:20 – 1:45 | Search & 2D/3D Continuity**:
   - Press `/` to open Search -> Type `hypergrid` -> Press Enter.
   - Watch the camera fly gracefully across the city to frame the building.
   - Click **"2D"** in the top bar: Note how the selected building remains framed on the 2D tactical map.
   - Click **"3D"**: Smoothly transitions back into the living 3D architectural model.
5. **Minute 1:45 – 2:00 | Settings & Accessibility**:
   - Open Settings gear -> Switch to **Performance** or toggle **Reduced Motion**.
   - Conclude: *"This is GitWorld 3D: not a dashboard, but a living architectural memory palace of software history."*

---

## 11. Design Evolution: Why Version 2 Feels Like GitWorld

Version 2.1 is designed not as a disconnected 3D tech demo, but as a direct architectural elevation of GitWorld's core metaphor:

1. **Spatial Continuity**: The 2D map and 3D world share the exact same deterministic coordinate systems, seed math, district boundaries, and repository IDs.
2. **Subordinate UI**: The interface uses the same typography, tokens, and dark aesthetic, treating the 3D canvas as the hero and the UI as a calm, precise lens.
3. **Metaphor Fidelity**: Every single geometric detail answers a question about the code:
   - *"How big is this?"* -> Building mass and tier.
   - *"What is it written in?"* -> Language facade and roof motif.
   - *"Is anyone working on it?"* -> Window emissive warmth and milling contributor agents.
   - *"Is it paused?"* -> Trees, vines, and ecological aging slowly reclaiming the grounds.
   - *"What does it connect to?"* -> Luminous dependency roadways.
