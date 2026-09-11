# Claude Build Prompt — GitWorld World Extensions

## Scope

You are extending **GitWorld**, an application that transforms GitHub activity into an explorable world. This prompt combines all non-3D world-extension features into one cohesive build:

1. A proper personalized avatar for the authenticated user.
2. A spacious small-town layout with roads, paths, districts, entrances, and landmarks.
3. Repository buildings whose size and character depend on real project signals.
4. Enterable repository worlds generated from actual repository structure and metadata.
5. A shared world where users can travel to other people’s public, opt-in repositories.
6. A river boundary with bridge and boat crossing routes.
7. A construction district where users can create a real GitHub repository.
8. A river exit mechanic that returns users to a safe location when they intentionally jump into the river.

This is **separate from the GitWorld 3D upgrade**. Do not make the implementation depend on Three.js, WebGL, or fully 3D rendering. Build for the existing 2D or 2.5D world and keep the data model compatible with a future 3D renderer.

The core product principle is:

> **The user should feel like they are walking through their own software town, visiting other developers’ worlds, entering repositories, and starting new projects in a physical place.**

Do not create a dashboard with decorative game elements. Build a world whose layout, buildings, paths, interiors, and interactions explain the software behind it.

---

## Product Story

The user begins in a personal town generated from their GitHub account.

Their avatar walks through a spacious neighborhood where repositories have room to breathe. Roads connect districts and buildings. Larger or more important projects occupy larger plots. Active projects feel alive; dormant projects feel quiet but remain part of the user’s history.

When the user approaches a repository, they can enter it. The repository becomes a second, smaller world whose neighborhoods and buildings are generated from the actual codebase structure.

At the edge of the town, a road leads to a river. A bridge and a boat cross the river into a construction district where the user can create a real GitHub repository. The creation flow should feel like breaking ground on a new project.

Other roads lead toward a shared public world. The user can travel far enough to discover public, opt-in repositories and other developers’ GitWorlds. Those worlds must be privacy-safe, spatially coherent, and loaded progressively rather than rendered as one infinite map.

The experience should communicate:

> **GitWorld does not only visualize what you have built. It gives you a place to explore what you built, visit what others built, and begin building what comes next.**

---

## Non-Negotiable Quality Bar

The result should feel like a finalist-level hackathon product rather than a prototype.

The world must have:

- A recognizable player avatar.
- Comfortable walking scale.
- Spacious, stable town layouts.
- Roads and paths that lead somewhere meaningful.
- Clear district structure.
- Distinct repository entrances.
- Smooth transitions between town, repository, public world, and construction district.
- A repository interior that feels spatial rather than like a file browser.
- Strong loading, error, empty, permission, and rate-limit states.
- A compelling demo mode without GitHub credentials.
- Accessible alternatives to canvas-only navigation.
- Privacy-safe behavior for private repositories and source code.

Avoid:

- Dense grids where buildings touch each other.
- Random placement that changes on every reload.
- Tiny avatars that disappear at normal zoom.
- Decorative roads disconnected from navigation logic.
- Raw JSON or file trees presented as the main repository experience.
- Unlimited source-code fetching.
- Exposing secrets or private repository data.
- Infinite procedural space with no landmarks or destinations.
- A generic Create button disconnected from the world.

---

## 1. Personalized User Avatar

### Avatar Identity

Create a dedicated avatar for the authenticated GitHub user.

Use the user’s GitHub identity where appropriate:

- GitHub profile image may appear as a portrait, badge, or face treatment if permitted.
- Username should be available contextually and through accessible labels.
- A stable user seed may influence clothing, palette, accessory, or silhouette.
- The avatar must remain attractive when no profile image is available.

Do not simply display a circular profile image as a cursor. Build a character treatment that belongs to the world.

### Avatar System

Use reusable layered components that work with the current 2D or 2.5D renderer:

- Head or portrait treatment.
- Body and clothing.
- Hair or silhouette.
- Small identity accessory.
- Ground shadow or marker.
- Directional facing.
- Idle and walking states.
- Focus or selection ring.

The avatar must be recognizable at both town scale and close range.

### Movement

Support:

- WASD and arrow keys.
- Smooth acceleration and deceleration.
- Directional facing.
- Idle, walk, arrival, boarding, disembarking, and interaction states.
- Soft collision or separation from buildings and major props.
- Movement along paths without requiring pixel-perfect alignment.
- Camera follow with gentle look-ahead.
- Click-to-move or tap-to-move where practical.

Walking should feel calm and intentional. Do not make the avatar so fast that the town becomes a menu.

### Interaction Feedback

When the avatar approaches an interactable object:

- Highlight the destination or entrance.
- Show a short contextual prompt.
- Support keyboard interaction such as Enter or E.
- Support clicking and touch where possible.
- Preserve an accessible HTML alternative for important actions.

---

## 2. Spacious Small-Town Layout

### Spatial Philosophy

The personal world must feel like a small, walkable town rather than a compressed city grid.

Use a sequence of readable spaces:

- Arrival plaza.
- Main street.
- Neighborhood roads.
- Organization districts.
- Personal project areas.
- Parks, courtyards, or quiet buffers.
- Repository plots.
- Riverside edge.
- Shared-world road.
- Construction district access.

Every important building needs a visible approach and a clear entrance.

### Deterministic Spacing

Implement explicit spacing constraints:

- Buildings must never overlap.
- Every building receives a buffer based on its footprint and tier.
- Large projects receive larger plots and wider approaches.
- Landmark repositories receive additional negative space.
- Paths must be wide enough for the avatar and contextual effects.
- Important buildings must not be hidden behind one another.
- The layout must remain stable across reloads.

Use deterministic packing, relaxed grids, rings, or a stable town-layout algorithm. Do not use uncontrolled physics as the primary layout system.

### Town Structure

Use this logical hierarchy:

```text
Arrival Plaza
  ├── Main Roads
  │     ├── Organization Districts
  │     ├── Personal Projects District
  │     ├── Public World Road
  │     └── Riverside / Construction Road
  └── Repository Plots
```

Do not place every important project directly in the center. Create a welcoming composition with varied distances and clear orientation.

### Paths and Navigation Graph

Create a real path system, not decorative lines.

Paths should:

- Connect the arrival point to major districts.
- Connect districts to repository plots.
- Lead to building entrances.
- Form readable loops and intersections.
- Avoid unnecessary dead ends.
- Have hierarchy: main roads, district streets, and footpaths.
- Support avatar movement, click-to-move, search navigation, and route highlighting.

Represent the town as a navigation graph with nodes for arrival points, district entrances, repository entrances, landmarks, river crossings, and public-world gates.

Use the graph for:

- Click-to-move.
- Search and destination navigation.
- Path highlighting.
- Travel-time estimates.
- Future route suggestions.
- Accessible landmark navigation.

### Environmental Details

Use restrained, seeded details such as:

- Street lamps.
- Trees and planted areas.
- Benches.
- District signs.
- Fences and gates.
- Utility elements.
- Small plazas.
- Mailboxes or notice boards.

Environmental details may express project state:

- Active projects have more light, people, and movement.
- Dormant projects are quieter and less maintained.
- Documentation-heavy projects can have a library or notice board.
- Pull requests can create temporary construction zones.

Do not add random clutter.

---

## 3. Repository Building Importance and Size

Building size must communicate project significance and complexity.

### Inputs

Use a normalized, clamped, documented combination of:

- Repository size.
- Stars using logarithmic scaling.
- Forks with capped influence.
- Contributor count.
- Commit volume or recency.
- File count.
- Directory count.
- Dependency count.
- Language composition.
- Project type.

Do not let every metric independently increase size. Use a weighted model.

Example:

```text
importance = weighted(
  log(stars + 1),
  log(forks + 1),
  log(contributors + 1),
  normalized(repositorySize),
  normalized(fileCount),
  normalized(commitActivity)
)

buildingTier = clamp(importance, minimumTier, maximumTier)
plotSize = basePlot + tierScale + complexityBuffer
```

### Semantics

The user should intuitively read:

- Small project = modest building and compact plot.
- Serious project = larger structure with more activity.
- Major project = landmark or campus-like project.
- Complex project = larger plot with room for internal neighborhoods.
- Dormant project = may remain physically important while appearing quiet.

Do not equate age with insignificance.

Use more than height to communicate importance:

- Footprint.
- Entrance treatment.
- Signage.
- Lighting.
- Courtyard size.
- Annexes.
- Path prominence.
- Landmark framing.

---

## 4. Entering a Repository

Every repository building needs a clear threshold.

When the user approaches or selects it:

- Highlight the entrance.
- Show the repository name.
- Show a short action prompt.
- Support click, Enter, and E.
- Animate entry.
- Preserve the route back to the town.

The transition can be a camera push-in, doorway effect, portal, fade, or world transformation. It should feel like entering a place rather than opening a modal.

### Repository World

A repository becomes a visual map of its actual structure.

Represent:

- Repository root.
- Top-level directories.
- Important files.
- Primary and secondary languages.
- Frontend and backend areas.
- Tests.
- Documentation.
- Configuration and tooling.
- Assets and media.
- Infrastructure and deployment.
- Dependencies.
- Recent activity.
- Contributors.

Use aggregation and progressive disclosure. Do not render every file individually in a large repository.

### Spatial Grammar

Use a consistent mapping:

| Repository element | World element |
|---|---|
| Repository root | Central plaza, campus, or town hall |
| Top-level directories | Neighborhoods or blocks |
| Important files | Buildings or civic structures |
| Entry points | Central or landmark buildings |
| Tests | Labs or quality-control district |
| Documentation | Library or visitor center |
| Configuration | Utilities and infrastructure |
| Build/deployment | Factory, launchpad, or transit system |
| Scripts | Workshops |
| Assets/media | Studios, galleries, or warehouses |
| Dependencies | Roads, bridges, or service connections |
| Generated/vendor code | Aggregated restricted utility zone |

### Repository Scale

| Zoom level | Representation |
|---|---|
| Repository overview | Major neighborhoods, languages, entry points, activity, and dependencies |
| Directory level | Top-level files, directory buildings, category landmarks, and local paths |
| Close level | Important files, recent activity, contributors, and contextual metadata |

Large repositories should feel substantial, not cluttered. Group repetitive, generated, vendor, and media files.

---

## 5. Reading the Actual Repository

Inspect the actual repository structure and metadata where the authenticated user is authorized to access it.

### Data to Collect

Use GitHub Contents, Git Trees, GraphQL, or a secure server-side clone as appropriate.

Collect a bounded profile containing:

- Default branch.
- Root tree.
- File paths.
- File extensions.
- Language composition.
- File sizes.
- Directory sizes and counts.
- Likely entry points.
- Package manifests and lockfiles.
- Configuration files.
- Tests and test patterns.
- Documentation files.
- Build and deployment files.
- Recent commits.
- Contributors where available.
- Internal dependencies or relationships where reliable.

### Bounds and Caching

Never recursively fetch unlimited source code.

Implement:

- Maximum file count.
- Maximum total bytes.
- Maximum file size for content inspection.
- Directory-depth limits.
- Pagination.
- Caching.
- Conditional requests or ETags.
- Exclusions for build outputs, vendor directories, generated files, binaries, media, and lockfile noise.
- Progressive “inspect deeper” actions.

The repository world must become usable quickly, with deeper sections loading progressively.

### Code Classification

Create an explainable deterministic classifier based on path, extension, filename, manifest, framework markers, build tooling, and test conventions.

Categories should include:

- Application code.
- Frontend/UI.
- Backend/API.
- Data/models.
- Tests.
- Documentation.
- Configuration.
- Build/tooling.
- Scripts/automation.
- Assets/media.
- Infrastructure/deployment.
- Generated/vendor.
- Unknown.

Store category, confidence, source rule, and metadata in the normalized model.

### Code-Type Effects

Code categories must affect both world structure and UI:

| Code type | Spatial interpretation | UI interpretation |
|---|---|---|
| Frontend/UI | Storefronts, public-facing buildings, screens | UI/frontend category |
| Backend/API | Service buildings or control centers | API/service indicators |
| Data/models | Archives, data halls, reservoirs | Data layer summary |
| Tests | Labs or inspection yards | Test signal |
| Documentation | Library or public information center | Documentation signal |
| Configuration | Utilities or substations | Environment/tooling summary |
| Build/deployment | Factory or launchpad | Delivery/build signal |
| Scripts | Workshops | Automation category |
| Assets/media | Studios or galleries | Asset summary |
| Infrastructure | Network or operations district | Deployment signal |

The visual mapping should be understandable without reading every file name.

### Privacy

Treat source code as sensitive:

- Only inspect repositories the user is authorized to access.
- Keep OAuth tokens server-side.
- Do not send private code to third-party AI systems by default.
- Exclude `.env`, private keys, credentials, certificates, tokens, and obvious secret-bearing paths.
- Do not display secret-like content.
- Prefer metadata and path-based classification for the MVP.
- Sanitize text before rendering.
- Minimize retention of private source data.

A public repository should still be represented primarily through structure and metadata, not by copying its entire source code into the shared world.

---

## 6. Repository UI and Activity

The repository world should remain explorable while providing useful context.

Include:

- Breadcrumb: town → district → repository.
- Repository name and owner.
- Back-to-town action.
- Search or quick navigation.
- Project type.
- Dominant languages.
- Approximate codebase size.
- Major code categories.
- Recent activity.
- Contributors.
- Documentation and test signals.
- Dependency summary.

When selecting a file or directory, show a contextual surface with:

- Name and path.
- Category.
- Size or file count.
- Language.
- Last activity.
- Mapped role.
- Expand or inspect-deeper action.
- View-on-GitHub link.

Do not expose raw API objects as the primary UI.

Recent activity should appear as:

- Active paths or lit areas near recently changed code.
- Contributor presence near active directories.
- Construction near pull-request areas.
- Quiet zones for untouched code.

---

## 7. Shared World and Other People’s Repositories

The user should be able to walk far enough to reach another person’s public repository, but do not create one infinite browser-rendered map.

### World Model

Each user has a personal town. Beyond it are shared public regions containing repositories and user worlds whose owners have opted in.

```text
Personal Town
   ↓
Open Source Road
   ↓
Community Region
   ↓
Public Repository District
   ↓
Another User’s Opt-In World
```

Use visible gates, roads, bridges, plazas, signs, and region transitions rather than random infinite space.

### Public Visibility

Repository creation and public-world publication are separate decisions.

Support visibility levels:

| Visibility | What others can see |
|---|---|
| Hidden | Nothing |
| Public landmark | Public repository name, metadata, building, GitHub link |
| Explorable world | Sanitized directory structure, categories, project type, activity |
| Fully customized | Owner-approved public descriptions and visual customization |

Private repositories must never appear publicly. Organization repositories require appropriate permissions. Owners must be able to hide or remove their public world.

Do not make public-world publication automatic solely because a GitHub repository is public.

### Public World Manifest

Generate a sanitized server-side manifest:

```ts
interface PublicWorldManifest {
  worldId: string;
  repositoryId: string;
  ownerHandle: string;
  repositoryName: string;
  displayName: string;
  visibility: "landmark" | "explorable" | "custom";
  regionId: string;
  cellId: string;
  buildingTier: number;
  projectType?: string;
  primaryLanguage?: string;
  languageMix: Record<string, number>;
  stars: number;
  forks: number;
  contributorCount?: number;
  activityState: "active" | "quiet" | "dormant";
  hasDocumentation: boolean;
  hasTests: boolean;
  codeCategories: string[];
  worldSeed: number;
  updatedAt: string;
}
```

The client should receive sanitized public manifests, not arbitrary GitHub responses or another user’s OAuth data.

### Global Placement

Use deterministic spatial regions and cells based on opaque world IDs. Do not expose raw account IDs or repository IDs in visible coordinates.

Cluster public worlds into meaningful districts such as:

- Open Source Commons.
- JavaScript Neighborhood.
- Python Tools District.
- Rust Systems Quarter.
- AI Research Campus.
- Indie Game Alley.
- Developer Tools Boulevard.
- Featured Hackathon Worlds.

Use interest-based neighborhoods rather than pure randomness.

### Streaming and Travel

When the user approaches a public-world boundary:

1. Begin loading the next region in the background.
2. Show a physical transition such as a gate, road, tunnel, plaza, or bridge.
3. Stream the region before the user arrives.
4. Transfer the user without a jarring screen replacement.
5. Update the location breadcrumb.
6. Preserve a route back home.

Load public worlds in tiers:

- Personal town: detailed.
- Nearby landmarks: medium detail.
- Distant regions: simplified silhouettes or markers.
- Full repository world: load on approach, search, or entry.

### Arrival at Another Repository

When the user reaches another public repository:

- Show a recognizable building and entrance plaza.
- Display an arrival label.
- Identify the owner and project.
- Show public activity and project type.
- Offer entry into the sanitized repository world if allowed.
- Provide a View on GitHub action.
- Offer a route back to the user’s town.

Do not expose private code or unauthorized details.

### Navigation Beyond Walking

Support:

- Search for public repositories.
- Explore nearby worlds.
- Region map.
- Featured destinations.
- Recently visited worlds.
- Language and category filters.
- Return-home action.
- Breadcrumbs such as `Your Town / Open Source Road / Python District / Project World`.

Walking should create discovery, but it must not be the only way to navigate.

---

## 8. River Boundary, Bridge, and Boat

The river connects the user’s town to the construction district and can also function as a world boundary.

### Riverside Layout

Place the river in a clear, intentional location with:

- Town-side riverbank.
- Bridge entrance.
- Boat dock.
- Small boat or ferry.
- Construction-side riverbank.
- Signage.
- Paths to both crossings.
- A route from the opposite bank to the construction site.

The river should have restrained animation such as flowing water, ripples, reeds, or reflections.

### Bridge

The bridge should be the reliable route:

- Wide and easy to cross.
- Clear collision boundaries.
- Visible destination.
- Smooth crossing behavior.
- Keyboard, mouse, and touch support.
- No precision platforming.

### Boat

The boat should be the charming optional route:

1. Approach the dock.
2. Show “Board boat.”
3. Press Enter, E, click, or tap.
4. Avatar boards.
5. Boat follows a stable predefined route.
6. Camera follows briefly.
7. Avatar disembarks at the opposite dock.

Do not require manual steering for the MVP. The bridge must remain available as a reliable fallback.

### River Exit

If the user intentionally enters or jumps into deep water:

1. Show a splash, ripple, or falling animation.
2. Give a short grace period or cancel opportunity where appropriate.
3. Begin a “Leaving world” transition.
4. Return the avatar to the previous safe location.
5. If no safe location exists, return to the town arrival plaza.
6. Preserve world state, avatar state, and any safe form state.

Recommended water behavior:

- Shallow edge: warning or contextual prompt.
- Deep water: exit trigger after a threshold.
- Intentional jump: begins exit sequence immediately.
- Bridge and dock zones: never trigger the exit mechanic.

Do not treat this as an error. Use copy such as “The current carried you home” or “You returned to shore.”

Add a setting to require confirmation or disable accidental river exits if necessary.

---

## 9. Construction District and Create Repository

### Concept

A repository starts as an empty plot. The construction district is where new projects are born.

After crossing the river, the user finds:

- Foundation plots.
- Blueprint table.
- Construction office.
- Crane or scaffolding.
- Materials.
- Temporary project signs.
- Construction lights.
- A clear Create Repository action.

Use the same creation flow from the construction office, blueprint table, empty plot sign, or primary button. All entry points must open one shared form.

### Creation Flow

Collect only the useful initial settings:

- Repository name.
- Description.
- Public or private visibility.
- Initialize with README.
- `.gitignore` template.
- License.
- Project type.
- Optional topics.

Project types may include web app, API/service, library/SDK, CLI, mobile app, data/ML, documentation, infrastructure, and other.

Show a live architectural preview:

- Repository name on the construction sign.
- Initial building silhouette.
- Project-category accent.
- Proposed plot.
- Visibility indicator.

Validate GitHub naming rules, required fields, conflicts, visibility, templates, and licenses before submission.

### Final Review and Confirmation

Because this creates a real external repository, require an explicit final review step.

Show the exact payload:

```text
Repository: my-new-project
Visibility: Private
Description: A short project description
Initialize README: Yes
.gitignore: Node
License: MIT
Project type: Web app
```

Use a clear final action such as **Break ground on repository** with supporting text that says the app will create the repository on GitHub.

Do not create a repository until the user confirms.

### GitHub Integration

Create the repository server-side using the authenticated user’s GitHub session.

Requirements:

- Never expose OAuth secrets or tokens in the browser.
- Request the minimum required GitHub scope.
- Explain the permission before reauthorization.
- Prevent duplicate submissions with idempotency keys or request IDs.
- Treat network timeouts as ambiguous until status is safely checked.
- Handle organization permissions explicitly.
- Preserve form data through recoverable errors.
- Do not silently create the repository under the wrong owner.

### Construction Sequence

After confirmed GitHub creation:

1. Keep the user at the site.
2. Show honest creation progress.
3. Update the sign with the new repository name.
4. Activate the foundation.
5. Animate scaffolding, lights, and materials.
6. Generate the initial repository building.
7. Show the GitHub link.
8. Offer Enter Project and Return to Town.

If the repository is empty or contains only a README, show a foundation or starter building rather than pretending a complete codebase exists.

### Repository Evolution

As the repository evolves:

- More files increase structural complexity.
- New languages add architectural accents.
- Tests create labs or quality-control structures.
- Documentation creates a library or visitor center.
- Contributors add activity.
- Stars increase prominence gradually.
- Forks create satellites.
- Pull requests create construction.
- Dependencies extend roads and utility connections.

Use staged changes and animation where practical. Preserve recognition of the project.

### Public-World Opt-In

After creation, offer a separate choice:

```text
Add this project to the public GitWorld?

[Keep private to my town]
[Show as a public landmark]
[Make the project world explorable]
```

Do not combine repository visibility and public GitWorld visibility into one checkbox.

---

## 10. Security, Privacy, and External Actions

Implement strict boundaries:

- Private repositories never appear in public regions.
- Repository source code is not sent to third-party AI services by default.
- Sensitive files are excluded from inspection and display.
- Tokens remain server-side.
- Public-world data is sanitized.
- Organization visibility requires appropriate permission.
- Owners can hide their public world.
- Repository creation requires explicit confirmation.
- Public/private defaults must not silently expose a new repository.
- Duplicate creation must be prevented.
- Creation state must recover after refresh or navigation.

The user must know when they are:

- Viewing their private town.
- Entering another person’s public world.
- Creating a real GitHub repository.
- Publishing a world manifest publicly.

---

## 11. Loading, Error, and Empty States

### Town Loading

Use meaningful stages:

- Drawing your town.
- Placing your projects.
- Opening the main streets.

Reveal the avatar early.

### Repository Loading

Show partial structure as it arrives:

- Preparing repository map.
- Reading project structure.
- Grouping code neighborhoods.
- Connecting dependencies.

### Public World Loading

Preload approaching regions and show a physical transition. Never leave the user in an unexplained blank state.

### Construction Loading

Use honest stages:

- Reviewing plans.
- Sending request to GitHub.
- Laying the foundation.
- Opening the new project.

### Error States

Handle OAuth failure, API rate limits, network failures, partial trees, unavailable repository data, WebGL-independent renderer failures, permission problems, name conflicts, organization restrictions, and timeouts.

Preserve cached worlds and entered form data where safe. Use plain language and clear recovery actions.

### Empty States

If the user has few repositories, create a small but deliberate neighborhood. If there are no repositories, show an inviting town and a route to the construction site.

---

## 12. Architecture and Data Model

Keep these layers separate:

1. GitHub API and OAuth layer.
2. Normalization layer.
3. Town and public-world generation layer.
4. Repository-tree normalization and classification layer.
5. Navigation graph and path layer.
6. Avatar and simulation layer.
7. Renderer layer.
8. UI and interaction layer.
9. Public-world registry and visibility layer.
10. Repository-creation service layer.

Suggested normalized models:

```ts
interface NormalizedUser {
  id: string;
  login: string;
  avatarUrl?: string;
  profileColorSeed: number;
}

interface NormalizedRepo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  organization?: string;
  description?: string;
  stars: number;
  forks: number;
  sizeKb: number;
  language?: string;
  languages: Record<string, number>;
  contributorCount: number;
  openIssues: number;
  openPullRequests: number;
  lastCommitAt?: string;
  defaultBranch?: string;
  projectType?: string;
  buildingTier: number;
  districtId: string;
  worldSeed: number;
}

interface RepoDirectoryNode {
  id: string;
  name: string;
  path: string;
  children: Array<RepoDirectoryNode | RepoFileNode>;
  fileCount: number;
  totalBytes: number;
  category?: CodeCategory;
  lastActivityAt?: string;
  worldSeed: number;
}

interface RepoFileNode {
  id: string;
  name: string;
  path: string;
  extension?: string;
  bytes: number;
  category: CodeCategory;
  language?: string;
  isEntryPoint?: boolean;
  isSensitive?: boolean;
  worldSeed: number;
}

interface PublicWorldManifest {
  worldId: string;
  repositoryId: string;
  ownerHandle: string;
  repositoryName: string;
  visibility: "landmark" | "explorable" | "custom";
  regionId: string;
  cellId: string;
  buildingTier: number;
  projectType?: string;
  primaryLanguage?: string;
  languageMix: Record<string, number>;
  activityState: "active" | "quiet" | "dormant";
  codeCategories: string[];
  worldSeed: number;
}
```

Use stable IDs and seeded placement for avatar appearance, town plots, paths, repository interiors, public-world cells, environmental props, and construction plots.

---

## 13. Performance and Scale

Implement from the start:

- Server-side GitHub access.
- Pagination and caching.
- Conditional requests where supported.
- Bounded repository tree inspection.
- Progressive loading.
- Aggregation for large directories.
- Viewport and zoom-based rendering limits.
- Shared geometry or sprites where appropriate.
- Stable navigation graph queries.
- Public-world region streaming.
- Sanitized manifests for shared regions.
- Limited avatars and environmental effects.
- No per-frame React updates for movement or animation.

For large repositories, show root and major directories first, group repetitive content, and allow users to expand meaningful areas.

For public worlds, use tiered loading:

- Detailed personal town.
- Medium-detail nearby landmarks.
- Simplified distant regions.
- Full repository world on entry.

---

## 14. Implementation Order

### Phase 1: Avatar and Town

- Build the personalized avatar.
- Add movement and camera follow.
- Replace dense layout with small-town spacing.
- Add districts, plots, roads, paths, and entrances.
- Add the navigation graph.

### Phase 2: Repository Importance

- Implement normalized building-size and plot-size rules.
- Add landmark framing and path hierarchy.
- Validate tiny, medium, and large repository layouts.

### Phase 3: Repository Worlds

- Fetch bounded repository trees.
- Classify files and directories.
- Generate stable repository neighborhoods.
- Add code-category architecture and repository UI.
- Add enter/return transitions.

### Phase 4: River and Construction District

- Add river, bridge, dock, boat, and construction route.
- Add safe river exit behavior.
- Add construction site and empty plot.

### Phase 5: Create Repository

- Build the blueprint form.
- Add project-type preview.
- Add validation and review.
- Add server-side GitHub creation.
- Add idempotency, permissions, retries, and recovery.
- Animate the first construction stage.

### Phase 6: Shared Public World

- Add public-world visibility settings.
- Build sanitized manifests.
- Add deterministic public regions and interest-based districts.
- Add public-world road and streaming.
- Add arrival at another person’s repository.
- Add search, region map, and return-home navigation.

### Phase 7: Polish and Testing

- Refine animation and transitions.
- Test sparse and dense accounts.
- Test small and large repositories.
- Test private data boundaries.
- Test rate limits and network failures.
- Test browser refresh during repository creation.
- Test keyboard, mouse, touch, and accessible alternatives.
- Remove placeholder content and dead controls.

---

## 15. Acceptance Criteria

The build is complete only when:

- The user has a recognizable avatar.
- The avatar moves smoothly through a spacious town.
- Buildings have meaningful spacing and clear entrances.
- Roads and paths connect real destinations.
- Large or important repositories occupy visibly larger plots.
- Building size is determined by documented real project signals.
- The user can enter a repository.
- The repository world is generated from actual authorized repository structure and metadata.
- Directories become neighborhoods and meaningful files become buildings.
- Frontend, backend, tests, docs, configuration, data, infrastructure, assets, and dependencies affect the world and UI.
- Large repositories are aggregated and progressively explorable.
- Private code and sensitive files are protected.
- The user can walk to a public-world road and reach opt-in public repositories.
- Public regions are streamed and spatially coherent.
- Another person’s repository appears as a meaningful destination rather than a random file card.
- The user can return home and preserve context.
- A river clearly separates the town from the construction district.
- The user can cross with a bridge or boat.
- Intentionally entering the river returns the user to a safe location.
- Accidental river exits are minimized and recoverable.
- The construction site is visually understandable.
- The user can create a real GitHub repository through an explicit reviewed flow.
- The creation flow prevents duplicate repositories and handles timeouts safely.
- The new repository appears as a foundation or building in the user’s town.
- Repository creation and public-world publication are separate choices.
- Loading, empty, error, permission, validation, rate-limit, and unavailable-data states are polished.
- The full feature set works in demo mode with mocked GitHub creation.
- Essential information remains accessible without canvas movement.
- The experience feels like one coherent world rather than disconnected features.

---

## 16. Demo Walkthrough

The ideal hackathon demo should take approximately three minutes:

1. Start in the user’s spacious personal town.
2. Show the personalized avatar.
3. Walk through a district and point out how building size reflects project importance.
4. Enter a repository.
5. Show how frontend, backend, tests, docs, configuration, and dependencies become neighborhoods and structures.
6. Return to the town.
7. Walk toward the river.
8. Show both the bridge and boat.
9. Cross into the construction district.
10. Open the blueprint-like Create Repository flow.
11. Choose a project type and show the architectural preview.
12. Review and explicitly confirm repository creation.
13. Show the foundation and first construction sequence.
14. Return to the town or enter the new project.
15. Travel toward the shared-world road.
16. Arrive at another public, opt-in repository.
17. Enter its public repository world.
18. Briefly demonstrate jumping into the river and returning to a safe location.

The story should be clear:

> **Your code has a home. Other people’s code has a world. New projects have a birthplace.**

## Final Instruction

Build GitWorld as an inhabitable software universe.

The avatar should feel like the user. The town should feel spacious and navigable. The paths should create curiosity. Repository buildings should communicate scale and importance. Repository interiors should reveal the actual architecture of the code. Public roads should lead to other developers’ worlds. The river should create a meaningful edge. The construction site should make new work feel tangible.

**Do not build a file explorer with a game skin. Build a world whose places explain software, community, and creation.**
