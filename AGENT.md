# Claude Build Prompt — GitWorld 3D

## Version 2.1 Refinement Pass

This is a refinement and fidelity pass on the GitWorld 3D experience. Preserve the existing product scope and architecture, but raise the bar for visual polish, UI restraint, ecological storytelling, and repository-to-building accuracy. The result must feel cohesive rather than feature-stacked.

The most important rule for this pass is:

> **Every visible detail must either help the user navigate, explain the repository, or make the world feel alive. Nothing should feel randomly decorated or clumsily overlaid.**

## Version 2 Product Upgrade

You are a senior product designer, 3D creative technologist, and full-stack engineer. You are extending **GitWorld**, an application that transforms a user’s GitHub account into an explorable city, into a polished **3D architectural world**.

Version 1 established the core metaphor: repositories become buildings, organizations become districts, contributors become people, activity becomes visible life, issues become warning markers, pull requests become construction, forks become satellite buildings, and dependencies become roads.

Version 2 must make those buildings genuinely explorable in 3D. This is not a simple “add three-dimensional cubes” pass. It is a visual and interaction upgrade that should make the user feel as if they are walking through a living architectural model of their software history.

The final result should feel like a premium interactive product and a hackathon-winning experience. It must be visually impressive within seconds, but it must also be understandable, responsive, stable, and useful.

> **Build a city that happens to be made from GitHub, not a data dashboard wearing 3D graphics.**

---

## Product Objective

Create a 3D view in which the user can understand their GitHub account spatially and architecturally:

- A repository is not merely a labeled box. It is a distinct building with scale, silhouette, material, condition, and activity.
- Stars influence prominence and architectural prestige.
- Repository size influences physical mass without allowing one repository to overwhelm the entire city.
- Language influences architectural character, color, facade treatment, and roof geometry.
- Commit recency influences visible life, lighting, animation, and environmental condition.
- Organizations form districts with shared public spaces, signage, terrain, and color identity.
- Contributors appear as small agents near active projects.
- Issues look like visible problems in the building or surrounding site.
- Pull requests appear as active construction.
- Forks become smaller buildings or additions nearby.
- Dependencies become roads, bridges, paths, or illuminated connections.

The central emotional arc remains:

1. “Wait… this is my GitHub?”
2. “That building is my biggest project?”
3. “I remember this old abandoned structure.”
4. “Those roads are my dependencies.”
5. “I want to walk through the rest of my city.”

---

## What to Build

Implement a 3D city mode that can be entered from the existing GitWorld experience.

The product should support two complementary views:

### 3D Explore Mode

This is the hero experience for Version 2. The user can orbit, pan, zoom, and optionally walk through the world. The camera should support a polished isometric or low-angle perspective by default, with smooth transitions between overview and close inspection.

### 2D Map Mode

Preserve the existing 2D mode as a fast map and navigation view. The user should be able to switch between 2D and 3D without losing their selected repository, camera target, or current location.

The mode switch should feel like changing the city’s presentation layer rather than navigating to a separate application.

Do not remove or regress the original 2D city until the 3D view is stable.

---

## Non-Negotiable Experience Quality

This is a hackathon-quality product, not a technical WebGL demonstration.

The result must have:

- A distinctive visual identity from the first frame.
- Buildings with meaningful silhouette variation rather than repeated cubes.
- Consistent architectural rules tied to real repository data.
- Smooth camera motion and clear interaction feedback.
- A readable UI that stays subordinate to the world.
- Beautiful transitions between overview, exploration, selection, and inspection.
- Strong loading, error, empty, and degraded-performance states.
- A compelling demo mode that works without GitHub credentials.
- A scene that remains attractive with both dense and sparse repository data.
- Good performance on ordinary laptops.
- A clear path to extend the renderer without rewriting the data model.

Avoid:

- Generic low-poly scenes with no product meaning.
- Random buildings that do not correspond to repository data.
- A wall of floating labels.
- Excessive bloom, glow, lens flare, or particle effects.
- Dark scenes where architecture and text are difficult to read.
- Photorealism that makes the data metaphor harder to understand.
- A separate 3D toy disconnected from the existing GitWorld product.
- A dashboard overlay that dominates the viewport.

---

## Recommended Technical Stack

Use a browser-friendly 3D stack with a clear separation between data, world generation, simulation, and rendering.

Preferred options:

- React + TypeScript.
- Vite or the existing project’s current frontend toolchain.
- Three.js through React Three Fiber, unless the existing architecture has a strong reason to use raw Three.js.
- Drei or equivalent helpers for cameras, controls, instancing, environment lighting, and interaction.
- Zustand or the existing state layer for world, camera, selection, and simulation state.
- React Query or equivalent for GitHub API fetching and caching.
- HTML/CSS UI layered above the WebGL canvas.

Keep the implementation renderer-agnostic where reasonable. The following layers must remain separate:

1. **GitHub layer** — OAuth, API requests, caching, rate-limit handling, and GitHub-specific shapes.
2. **Normalization layer** — GitHub responses to internal types.
3. **World-generation layer** — normalized data to deterministic `WorldModel`.
4. **Simulation layer** — movement, animation state, agents, activity, and camera targets.
5. **3D scene layer** — building geometry, materials, lights, roads, terrain, and effects.
6. **UI layer** — search, repository panel, mode switcher, legend, loading, errors, and settings.

Do not put GitHub API calls inside building components or Three.js scene objects.

---

## 3D Art Direction

### Overall Style

Create a **stylized architectural 3D world** with clean forms, carefully controlled materials, and a slightly editorial feel.

The world should feel closer to a beautifully designed architectural visualization or interactive museum model than to a conventional video game.

Use:

- Soft stylized geometry.
- Low-to-medium polygon complexity.
- Carefully beveled edges where they improve readability.
- Matte and semi-matte materials.
- Controlled ambient occlusion.
- Soft shadows.
- Subtle emissive windows for active repositories.
- Restrained atmospheric depth.
- Clear ground planes and district boundaries.
- A cohesive palette with language-specific accents.

The city must remain legible at three scales:

| Scale | What the user should understand |
|---|---|
| Far overview | District structure, landmarks, roads, and overall city shape |
| Mid-distance | Repository identity, building tier, activity, language style, and surrounding context |
| Close inspection | Facade details, windows, issues, construction, contributors, and interaction targets |

### Camera and Projection

Use a polished perspective camera or a carefully tuned orthographic/isometric camera as the default. Choose the camera model that best supports both architectural beauty and navigation.

Recommended behavior:

- Start with a high three-quarter overview of the city.
- Use smooth orbit, pan, and zoom controls.
- Keep the horizon and verticals stable enough to preserve spatial understanding.
- Prevent the camera from clipping through terrain or buildings.
- Set sensible minimum and maximum zoom distances.
- Use damping for orbit and pan controls.
- Animate camera targets rather than teleporting.
- Support a “focus selected repository” action.
- Keep a clear reset-to-city-overview action.

If a first-person walking camera is included, treat it as an optional exploration mode rather than the only navigation method. The user must always have a reliable overview camera.

### Lighting

Lighting must communicate time, activity, and hierarchy without turning into a visual-effects demo.

Use a restrained lighting system such as:

- Soft environment or hemisphere light.
- One broad directional key light.
- Ambient occlusion or a lightweight approximation.
- Emissive windows and accents for active repositories.
- Subtle district-specific fill colors.
- Optional dusk-to-night transition when entering close exploration.

Use bloom only if it materially improves the active-state metaphor. Keep it subtle and provide a reduced-effects fallback.

### Materials

Create a small material system rather than assigning arbitrary colors to every building.

A building material should be a function of:

- Language palette.
- Activity state.
- Repository tier.
- District identity.
- Condition or age.
- Controlled seed-based variation.

Inactive buildings should become cooler, less saturated, or more weathered. They should not simply become invisible or uniformly gray.

---

## Repository Building System

The most important Version 2 feature is a convincing procedural building system.

### Building Identity

Each repository must have a stable architectural identity derived from its stable repository ID.

Use a seeded generator to choose:

- Base footprint ratio.
- Height variation.
- Roof profile.
- Window arrangement.
- Accent placement.
- Entrance position.
- Courtyard or annex presence.
- Signage treatment.
- Vegetation or wear details.

The same repository must produce the same core building on every reload.

Do not generate an entirely random building every time. Users should be able to recognize their projects.

### Building Tier

Map stars into a clear architectural hierarchy:

| Star tier | Suggested architectural interpretation |
|---|---|
| 0 stars | Small workshop, shed, studio, or compact house |
| 1–10 | Townhouse, small office, or neighborhood building |
| 10–100 | Mid-rise office, civic building, or active studio |
| 100–1000 | High-rise, campus building, or prominent tower |
| 1000+ | Landmark, observatory, headquarters, or signature tower |

Use logarithmic scaling. A highly starred repository should be prominent, but it must not make every other project feel irrelevant.

### Repository Size

Use repository size to influence footprint and mass. Apply clamped, logarithmic, or normalized scaling.

Do not let a large binary repository become an absurdly massive building. Use sensible limits and document the normalization rule.

### Language Architecture Styles

Implement a real lookup table for common languages. At minimum support a substantial set such as JavaScript, TypeScript, Python, Go, Rust, Java, C++, C#, Ruby, PHP, Swift, Kotlin, Dart, HTML/CSS, and a fallback.

Each language should influence several related visual properties:

- Primary and secondary color.
- Roof profile.
- Window rhythm.
- Edge softness or angularity.
- Accent material.
- Small architectural motif.

Example direction, not a rigid requirement:

| Language family | Architectural direction |
|---|---|
| JavaScript / TypeScript | Warm modern glass, lively windows, modular volumes |
| Python | Soft geometric forms, warm accent lighting, layered terraces |
| Rust | Angular, robust, copper or ember accents |
| Go | Clean efficient blocks, teal accents, strong horizontal lines |
| Java / Kotlin | Structured campus or tower forms, orderly window rhythm |
| C / C++ | Heavy industrial or infrastructural forms, strong foundations |
| Ruby | Refined warm facade, rounded corners, boutique character |
| Swift | Bright minimal forms, elegant glass and pale accents |
| HTML / CSS | Colorful facade panels, modular grid motifs |
| Unknown | Neutral but polished fallback architecture |

Do not create cartoon stereotypes. The mapping should be subtle enough to feel coherent as a city.

### Activity States

Activity is a core storytelling system.

#### Active: commits in the last 30 days

Show some combination of:

- Warm lit windows.
- Subtle movement in windows or signage.
- Small contributor agents nearby.
- Light smoke, steam, or activity cues only if stylistically appropriate.
- Open doors, active entrances, or animated road traffic.
- Brighter material response.

#### Quiet: commits 30–180 days ago

Show:

- Partial lighting.
- Fewer visible agents.
- Calm surroundings.
- Reduced motion.
- A building that is still clearly maintained.

#### Dormant: more than 180 days ago

Show:

- Dark windows or minimal light.
- Cooler materials.
- Subtle overgrowth, dust, weathering, or closed entrances.
- No exaggerated decay that makes the repository look deleted.
- A quiet but recognizable landmark in the user’s personal history.

Activity must be communicated visually before the user reads text.

### Issues

Open issues should appear as physical problems rather than number badges.

Possible treatments:

- Small warning marker near the entrance.
- Scaffolding or repair cones.
- Flickering sign.
- Visible crack or highlighted facade section.
- Subtle pulsing beacon.

Scale the visual intensity up to a cap. Never cover the building with dozens of icons.

### Pull Requests

Open pull requests should appear as construction:

- Scaffolding.
- Temporary cranes or platforms.
- Construction lights.
- Workers or contributors nearby.
- A partially completed annex or facade section.

The construction overlay should be recognizable at mid-distance but remain visually tasteful.

### Forks

Only show satellite buildings for the most heavily forked repositories or a capped top-N set.

Satellite buildings should:

- Use a smaller version of the parent architectural vocabulary.
- Sit within the parent building’s local site.
- Have a visual relationship to the parent without becoming clutter.
- Communicate that the project has spread outward.

### Contributors

Represent contributors as simplified low-cost agents.

Agents should:

- Use instancing or shared geometry where possible.
- Have restrained idle and walking animations.
- Cluster near active repositories.
- Move slowly and purposefully.
- Remain readable without distracting from buildings.
- Be capped globally and prioritized by repository activity.

Do not spend the MVP on detailed humanoid characters. The metaphor matters more than character fidelity.


## Repository Fidelity and Ecological Aging

A building must look like the repository it represents, not like a generic procedural asset with a repository name attached.

### Traceable Building Generation

Create an explicit `BuildingVisualProfile` during normalization or world generation. It should record the data inputs responsible for the building’s visible properties.

At minimum, track:

- Repository ID and stable seed.
- Building tier and size inputs.
- Dominant and secondary languages.
- Detected project type.
- Code-category composition.
- Activity state and last meaningful commit date.
- Stars, forks, contributor count, and issue/PR state.
- Directory and file complexity.
- Whether tests, documentation, infrastructure, or assets were detected.
- Selected architectural style and its reason codes.
- Selected condition and ecological-aging level.

A developer should be able to inspect a debug view and answer: “Why does this building look this way?” Do not let visual properties emerge from arbitrary random choices.

### Repository-to-Architecture Rules

The building must express multiple repository signals at once without becoming visually noisy:

- Stars influence civic prominence, facade quality, and landmark treatment.
- Repository size and file complexity influence mass, footprint, and number of wings or annexes.
- Contributor count influences visible occupancy, entrances, and nearby people.
- Dominant language controls the architectural vocabulary and palette.
- Secondary languages appear as restrained accent materials or secondary wings.
- Project type influences the building’s functional silhouette.
- Frontend-heavy projects may have public-facing facades and display surfaces.
- Backend or API-heavy projects may have service wings, utility structures, or connected infrastructure.
- Data-heavy projects may have archives, towers, or storage volumes.
- Tests create laboratories or inspection spaces.
- Documentation creates a library, visitor center, or public information wing.
- Infrastructure and deployment create utility links, towers, or launch structures.
- Open pull requests create construction overlays.
- Open issues create localized repair or warning details.
- Forks create satellite structures only for capped high-signal repositories.
- Dependencies create paths, roads, pipes, or bridges to related projects.

No single signal should completely define the building. The goal is a coherent architectural composition whose details reinforce one another.

### Building Personality and Variation

Use deterministic variation within a constrained style family:

- Choose from a small set of related massing grammars.
- Vary roofline, entrance, window rhythm, setbacks, courtyards, and annexes by seed.
- Use materials and props to communicate data rather than adding random ornament.
- Keep enough negative space around the building to make its silhouette legible.
- Ensure a user can recognize a repository after revisiting it.

The building must retain its identity when its activity changes. Activity can alter lighting, occupancy, and condition, but should not randomly rebuild the core architecture.

### Ecological Aging System

Long-dormant repositories should gradually become old, quiet places with natural overgrowth. Use time since the most recent meaningful commit as a primary signal, while also considering repository age and activity history.

Suggested states:

| Time since meaningful activity | Environmental state | Visual treatment |
|---|---|---|
| 0–30 days | Active | Maintained paths, lit windows, active entrances, small groups of contributors, clean grounds |
| 30–180 days | Quiet | Partial lighting, fewer people, calm grounds, light maintenance variation |
| 180–365 days | Aging | Cooler materials, dim entrances, small grass patches, early vines, a few leaves or weeds near edges |
| 1–3 years | Overgrown | Noticeable grass, shrubs, young trees, vines on selected walls, cracked or softened paths, more closed windows |
| 3+ years | Old building | Mature trees, dense grass, ivy or vines, weathered facade, moss-like ground accents, broken or blocked paths, almost no activity |

These thresholds should be configurable and based on real timestamps. Do not label a repository “abandoned” unless the UI can explain the underlying inactivity. Use “dormant” or “quiet” for the product language.

### Overgrowth Rules

Overgrowth must be spatially believable and performance-conscious:

- Place grass and weeds around plot edges, cracks, path borders, and unused corners.
- Place shrubs near foundations and behind low walls.
- Place trees in larger plots and farther from entrances, not randomly in front of doors.
- Use vines selectively on older facade surfaces.
- Keep the primary building silhouette visible.
- Allow paths to become slightly narrower or visually softened, but never make the building unreachable.
- Use seeded placement so the same old repository grows in the same way on reload.
- Scale density with available plot space, age, and condition rather than with random noise.
- Use instancing or shared geometry for grass, shrubs, and trees.
- Reduce environmental detail at distance through level of detail.

Do not turn every dormant repository into a dramatic ruin. A small project should become a modest old house or workshop; a major project should remain a recognizable landmark with an aged campus or overgrown grounds.

### Seasonal and Respectful Decay

The tone should be reflective, not punitive. The world is showing project history, not judging the developer.

Avoid:

- Cartoon cobwebs everywhere.
- Fire, collapse, or destruction without real data.
- Extreme ruin states for repositories that are merely paused.
- Vegetation that obscures repository identity.
- Decay that implies deletion, failure, or security problems.

Allow activity to restore the environment gradually:

- New commits can turn on windows.
- Maintained paths can become clearer over time.
- Grass and vines can recede subtly.
- Contributors can return.
- Construction can appear near active changes.

Activity changes should animate gently, but the core building identity and location must remain stable.

---

## Districts, Terrain, and Roads

### Districts

Organizations should create coherent districts rather than arbitrary colored regions.

A district can include:

- A distinct ground material or border.
- A subtle sign or monument.
- A shared color accent.
- A recognizable layout grammar.
- Small public spaces or courtyards.
- A district label visible at appropriate zoom.

Personal projects should use a “Personal” district with a different but harmonious treatment.

Do not make districts look like disconnected islands. The full city should feel like one place.

### Terrain

Use terrain sparingly. A mostly planar city is acceptable if the composition is strong.

Potential terrain features:

- Gentle elevation changes.
- Parks or plazas.
- Water channels or bridges.
- Shared courtyards.
- Footpaths.
- Landmark platforms.

Terrain must not obscure buildings, create navigation confusion, or consume performance for decoration.

### Roads and Dependencies

Dependencies should become understandable physical connections.

Use:

- Roads, paths, pipes, bridges, or illuminated lines depending on the visual language.
- Stronger visual emphasis for important or selected connections.
- Reduced opacity for distant or inactive connections.
- Smooth reveal animation when a repository is selected.
- A clear fallback when dependency data is unavailable.

Prioritize dependencies that can be identified reliably, such as same-account repositories referencing each other or lightweight manifest relationships. Do not block the build on deep dependency resolution.

When a repository is selected, its immediate dependency roads should become easier to see while unrelated roads recede.

---

## Deterministic 3D Layout

The 3D city must preserve the deterministic layout requirement from Version 1.

Implement:

- Stable seeds based on repository IDs and district IDs.
- Deterministic district placement.
- Stable repository locations within districts.
- Stable rotation and architectural variation.
- Stable landmark selection.
- Stable satellite placement.
- Stable road routing where the underlying dependency data is unchanged.

Do not use an uncontrolled physics simulation for the primary layout. Physics may be used for small ambient effects, but not for city placement.

Recommended layout strategy:

1. Generate district anchors from organization identifiers.
2. Assign each repository to a district.
3. Place buildings using a deterministic grid, spiral, Voronoi-inspired packing, or constrained rings.
4. Reserve the largest visual anchors for top-tier repositories.
5. Route roads along stable paths between buildings.
6. Add small seeded offsets for organic variation.
7. Validate that important buildings do not overlap or become unreachable.

The user should be able to build a mental map of their projects.

---

## Interaction Model

### Overview Navigation

Support:

- Orbit or rotate around the city.
- Pan across the city.
- Zoom in and out.
- Reset to overview.
- Focus selected repository.
- Smooth camera fly-to from search.

Controls should be discoverable without permanently covering the world. Use a compact controls hint during the first session and allow it to be dismissed.

### Building Interaction

On hover:

- Highlight the building with an outline, shadow, elevation, or material shift.
- Show a compact repository label.
- Highlight its immediate roads subtly.

On click:

- Select the building.
- Move the camera to a comfortable inspection angle.
- Open the repository detail panel.
- Reveal nearby dependency connections.
- Pause or reduce unrelated scene motion if needed for focus.

On approach in optional walking mode:

- Trigger the same contextual inspection behavior.
- Never make proximity the only way to access repository information.

### Repository Detail Panel

The panel must feel like an in-world inspection surface.

It should include:

- Repository name and owner.
- Description.
- Primary language.
- Activity state in plain language.
- Stars, forks, open issues, open pull requests, last activity, and contributors.
- A compact visual relationship summary when applicable.
- Clear “Open on GitHub” action.
- Close action and Escape support.

The panel should use a dark, calm surface with subtle translucency or a solid high-contrast backing. The 3D world should remain visible behind it.

Do not turn the panel into a large analytics dashboard. The building is the visualization; the panel provides context.

### Search

Search should work in both 2D and 3D.

When the user searches for a repository:

1. Show matching results in a compact command-palette-like surface.
2. Use keyboard navigation.
3. Preview the repository’s language color and building tier.
4. Animate the camera through the city toward the target.
5. Arrive at a good inspection angle.
6. Select the building and open the panel.
7. Highlight related dependency roads if available.

Support no-result and ambiguous-match states with clear language.

### Mode Switching

Add a visible but restrained 2D/3D mode switcher.

The transition should:

- Preserve the selected repository.
- Preserve the current logical location.
- Transition camera contextually rather than abruptly resetting.
- Avoid re-fetching all GitHub data.
- Feel like the same city changing form.

If a full spatial morph is too expensive, use a well-designed fade, camera move, and matching selection state. Do not leave the user in an apparently unrelated location.

---

## UI System

The canvas is the hero. UI should support orientation, discovery, and inspection without becoming a second product layered on top.

Include:

- Compact top-level identity or user chip.
- Search control.
- 2D/3D mode switcher.
- Reset view control.
- Minimal legend or world key.
- Optional settings for reduced motion, reduced effects, and quality level.
- Repository inspection panel.
- First-use controls hint.

Use a consistent UI system:

- One primary accent.
- One active-selection treatment.
- One danger/warning treatment.
- Consistent border radius and elevation.
- Strong focus states.
- Accessible text contrast.
- Keyboard navigation.
- Clear disabled and loading states.

Avoid putting a card around every piece of information. Let the world carry the visual meaning.


## UI Refinement: Calm, Layered, and Never Clunky

The city is the primary interface. The UI must feel like a carefully designed instrument for exploring the world, not a collection of controls placed on top of a canvas.

### UI Hierarchy

Organize interface elements into three layers:

1. **Orientation layer** — persistent but quiet controls such as search, user identity, 2D/3D mode, and reset view.
2. **Context layer** — temporary labels, hover hints, path prompts, and selection indicators that appear only when relevant.
3. **Inspection layer** — the repository detail panel, settings, errors, and focused workflows that appear when the user asks for them.

Never show all three layers at full intensity simultaneously. When an inspection panel opens, reduce the visual intensity of unrelated controls and background effects.

### Composition Rules

Use a consistent layout grid and safe zones:

- Keep persistent controls inside one compact top bar or one compact side rail, not scattered around the viewport.
- Reserve one predictable area for transient notices and prompts.
- Keep the repository panel anchored consistently on desktop and use a bottom sheet on narrow screens.
- Do not place controls over the player avatar, building entrances, or important landmarks.
- Maintain generous spacing between controls; do not compress unrelated actions into tiny icon buttons.
- Use one primary action per surface. Secondary actions should be visually quieter.
- Keep the number of persistent controls low enough that the city remains visible.
- Align labels, buttons, and panel sections to a shared spacing system.

### Visual Language

Define design tokens before building the full UI:

- One type scale with clear display, heading, body, metadata, and caption levels.
- A small spacing scale.
- A restrained radius scale.
- A small elevation and shadow system.
- A clear border and divider treatment.
- One primary accent, one selection accent, one warning accent, and one success accent.
- Consistent motion durations and easing curves.

Do not give every component its own gradient, border radius, shadow, or accent color. Repetition is what makes the interface feel like one product.

### Labels and Tooltips

Use progressive disclosure instead of permanent labels:

- At far zoom, show only district names, landmarks, and selected destinations.
- At mid zoom, reveal a repository name only on hover, proximity, or selection.
- At close zoom, show meaningful building and area labels with enough contrast to read.
- Hide labels that would overlap or compete with one another.
- Prefer one concise label over several badges.
- Use tooltips only for unfamiliar controls, never as a substitute for clear button design.

Labels should sit in a stable screen-space treatment rather than jittering with every camera movement. They must remain readable against the scene and disappear gracefully when no longer useful.

### Repository Panel Refinement

The repository panel should be a single focused inspection surface, not a stack of cards.

Use this order:

1. Repository identity and activity state.
2. Description and project type.
3. One visual summary of the building’s meaning.
4. Essential facts such as stars, forks, contributors, issues, pull requests, language mix, and last activity.
5. Clear primary action: Open on GitHub or Enter repository.
6. Quiet secondary actions and close behavior.

Use grouping, whitespace, and typography instead of excessive borders. The panel should be scannable in three seconds and explorable for thirty seconds.

When the panel opens:

- Dim the world gently rather than hiding it.
- Reduce ambient motion slightly, but do not freeze the entire city unless needed.
- Keep the selected building visible whenever possible.
- Move the camera to a comfortable inspection angle before or during panel entry.
- Avoid abrupt width changes, layout shifts, or stacked animations.

### Interaction Feedback

Every action needs one clear response:

- Hover changes the building and shows one concise label.
- Selection changes the building, camera framing, and panel state together.
- Search shows an active result and a clear travel destination.
- Loading shows the world assembling.
- Errors preserve context and offer recovery.
- Disabled actions explain why they are unavailable.
- Focus states are visible but stylistically integrated.

Avoid simultaneous pulses, glows, bouncing labels, camera motion, and panel animation. Choose one primary motion cue and keep the rest restrained.

### Motion and Anti-Clunk Rules

Use motion to communicate causality, not to decorate every state.

- Use one coherent transition when entering a repository.
- Avoid repeated camera re-centering when the user is already looking at a selected building.
- Do not animate panels from multiple directions at once.
- Keep hover effects subtle and reversible.
- Avoid screen shake, excessive parallax, and constant particle motion.
- Respect reduced-motion preferences by replacing travel animations with short fades or direct focus changes.
- Ensure a user can dismiss or reverse every temporary UI state.

### Responsive UI

On smaller screens, keep the same hierarchy rather than shrinking the desktop interface:

- Convert the repository panel into a bottom sheet.
- Move persistent controls into a compact, reachable toolbar.
- Use a single expandable control cluster instead of many floating buttons.
- Increase touch targets while reducing visual density.
- Keep the selected building or avatar visible behind the sheet when possible.

Before completion, inspect the app at common laptop, tablet, and narrow mobile widths. Fix overlap and awkward wrapping rather than accepting automatic browser layout.

---

## Responsive and Accessibility Requirements

### Desktop

Desktop is the primary target. Support common laptop resolutions and trackpads.

The scene should remain usable if the browser viewport is not full-screen.

### Tablet and Mobile

On smaller screens:

- Use touch-friendly orbit, pan, and zoom controls.
- Provide a compact movement option only if walking mode is enabled.
- Convert the repository panel into a bottom sheet or full-height sheet.
- Keep the search control easily reachable.
- Reduce scene density and effects automatically if necessary.
- Preserve the ability to understand district, building, and selection hierarchy.

### Accessibility

Support:

- Keyboard navigation for all HTML controls.
- Visible focus states.
- Escape to close overlays.
- Reduced motion preference.
- Reduced visual-effects preference.
- Meaningful accessible labels for controls.
- Sufficient text contrast.
- A non-color-only explanation of activity states in the repository panel.
- A fallback list/search interface so repository information is not inaccessible to users who cannot use the 3D canvas.

The 3D world is the primary visual experience, but essential information must not be locked exclusively inside WebGL.

---

## Performance and Rendering Strategy

Performance is part of the design quality.

Implement from the beginning:

- Instanced geometry for repeated windows, trees, agents, lamps, and small props.
- Shared geometries and materials.
- Frustum culling or equivalent visibility management.
- Level of detail for distant buildings.
- Simplified district representation at far zoom.
- Reduced contributor and prop counts on lower quality settings.
- Texture atlases only when they materially reduce draw calls.
- Lazy loading for optional assets.
- Avoid large uncompressed textures.
- Avoid per-frame React state updates for animation.
- Keep the render loop independent from most UI updates.
- Dispose of resources when switching worlds or rebuilding scene fragments.
- Use a capped pixel ratio.
- Detect lower-performance devices and choose a lower quality preset.

Provide at least three quality modes:

| Mode | Behavior |
|---|---|
| High | Full shadows, richer effects, more agents and details |
| Balanced | Moderate shadows, capped effects, normal scene density |
| Performance | Reduced shadows, simplified materials, fewer agents and props |

The app must remain visually coherent in Performance mode.

If WebGL is unavailable or fails, show a graceful fallback to the 2D map rather than a broken blank screen.

---

## Loading, Error, and Fallback Experience

### 3D Loading

Do not show a blank canvas with a spinner.

Show the city being assembled through purposeful stages such as:

- “Preparing your districts.”
- “Constructing repository landmarks.”
- “Lighting active projects.”
- “Connecting dependencies.”

Use a partial scene or silhouette while assets and data load. Keep progress honest.

### GitHub API Errors

Explain errors in user language. Preserve already-loaded data where possible.

Handle:

- OAuth failure.
- Rate limits.
- Partial repository data.
- Missing language data.
- Missing dependency data.
- Empty accounts.
- Network interruptions.
- WebGL initialization failure.

### Demo Mode

Include a realistic seeded demo world with:

- Several districts.
- A landmark repository.
- Active, quiet, and dormant buildings.
- Multiple languages.
- Contributors.
- Open issues.
- Pull-request construction.
- Satellite buildings.
- Dependency roads.
- At least one visually surprising building.

Demo mode must use the same normalized data, world-generation, simulation, and rendering pipeline as real GitHub data. It should not be a separate fake implementation.

---

## Suggested Implementation Phases

### Phase 1: 3D Foundation

- Establish the 3D renderer and camera system.
- Render a small handcrafted district.
- Create the base building geometry system.
- Establish lighting, materials, shadows, atmosphere, and design tokens.
- Build the 3D scene shell and UI overlay layer.

### Phase 2: Real World Model

- Connect the existing GitHub normalization layer.
- Extend `WorldModel` with 3D-specific properties.
- Generate deterministic districts and building transforms.
- Render real repositories as distinct buildings.
- Preserve stable layout across reloads.

### Phase 3: Data-Driven Architecture

- Implement star and size scaling.
- Implement language styles.
- Implement active, quiet, and dormant states.
- Implement issue markers, construction, and satellite buildings.
- Add dependency roads.
- Add contributor agents.

### Phase 4: Navigation and Inspection

- Add orbit, pan, zoom, and reset.
- Add building hover and selection.
- Add camera focus and fly-to.
- Add repository panel.
- Add search.
- Add optional walking mode only after overview navigation feels excellent.

### Phase 5: 2D/3D Continuity

- Add mode switcher.
- Preserve selection and logical location.
- Match camera targets between modes.
- Ensure neither mode feels like an afterthought.

### Phase 6: Optimization and Polish

- Add instancing and level of detail.
- Add quality presets.
- Test lower-end hardware.
- Test sparse and dense accounts.
- Refine lighting, motion, panel layout, typography, transitions, and error states.
- Remove placeholder content and dead controls.

---

## Out of Scope for Version 2

Do not allow these to delay the core 3D city:

- Multiplayer.
- Public world browsing.
- Shared worlds.
- Real-time collaborative editing.
- Full physics-based city simulation.
- Deep dependency resolution across every package ecosystem.
- Fully modeled interiors for every repository.
- Photorealistic assets.
- Complex character customization.
- VR or AR support.
- Full day/night timeline mode.
- Advanced traffic simulation.
- Procedural terrain that obscures the data.

Architect for future extensibility, but ship the core 3D experience first.

---

## Acceptance Criteria

The build is successful only if:

- A user can enter a working 3D city from real GitHub data or demo mode.
- Repository buildings have visible architectural variation tied to repository data.
- Star count, size, language, activity, issues, pull requests, forks, contributors, and dependencies have physical or architectural expression.
- The same account produces a stable 3D layout across reloads.
- The city is attractive at overview, mid-distance, and close inspection scales.
- Camera controls feel smooth and predictable.
- Building selection is clear and satisfying.
- Search can focus the camera on a repository.
- The repository detail panel remains readable while preserving the world behind it.
- 2D and 3D modes preserve user context.
- The scene remains responsive on ordinary laptops.
- Quality settings and reduced-effects options work.
- WebGL failure falls back gracefully to 2D.
- Mobile or narrow-screen behavior is usable.
- Essential repository information remains accessible outside the canvas.
- Sparse accounts still produce a deliberate, attractive neighborhood.
- Loading, error, empty, and rate-limit states are designed and recoverable.
- No generic dashboard takes over the product.
- The UI has a clear hierarchy, consistent spacing, restrained labels, and no overlapping controls.
- The interface remains readable and uncluttered while the repository panel is open.
- Motion is coordinated, reversible, and reduced when the user enables reduced motion.
- Every major building has a traceable visual profile derived from real repository data.
- A developer can explain why a selected building has its size, style, activity, and condition.
- Repositories untouched for years visibly develop grass, shrubs, trees, vines, moss-like ground accents, and weathering in proportion to age and available space.
- Overgrowth is deterministic, does not hide entrances, and does not overwhelm the building’s identity.
- Active work can gradually restore lighting, paths, and environmental maintenance.
- The final experience creates the reaction: **“I’ve never seen my GitHub like this before.”**

---

## Final Deliverables

Produce:

1. A working GitWorld 3D web app.
2. A local setup guide with required environment variables.
3. A demo mode that works without GitHub credentials.
4. A concise explanation of the 3D rendering and world-generation architecture.
5. A description of the building-generation rules, repository-fidelity profile, language style system, and ecological-aging rules.
6. A UI refinement summary covering hierarchy, spacing, responsive behavior, motion, labels, and anti-clunk decisions.
7. A performance strategy explaining instancing, culling, level of detail, and quality presets.
8. A list of known limitations.
9. A prioritized roadmap for interiors, time-of-day, analytics mode, achievements, sharing, multiplayer, and real-time event streaming.
10. A two-minute judge’s walkthrough.
11. A short explanation of the design choices that make Version 2 feel like an evolution of GitWorld rather than a separate 3D demo.

Before declaring completion, evaluate the product like a hackathon judge:

- Start from a clean load.
- Enter demo mode without reading the source code.
- Watch the first ten seconds.
- Orbit from overview to a landmark.
- Select an active building.
- Select a dormant building.
- Search for a repository.
- Inspect dependencies.
- Switch to 2D and back to 3D.
- Test an account with very few repositories.
- Test reduced-effects or Performance mode.
- Test the experience at a narrow viewport.
- Look for clipping, unreadable labels, excessive visual noise, awkward camera moves, broken focus states, dead controls, overlapping UI, inconsistent spacing, and labels that obscure buildings.
- Compare at least one active repository, one quiet repository, and one repository untouched for multiple years. Verify that the ecological aging is visible, tasteful, deterministic, and rooted in timestamps.
- Open a building debug or explanation view and verify that its visible features can be traced to real normalized repository signals.
- Fix problems instead of merely documenting them.

## Final Instruction

Make the 3D city feel like a physical memory palace for a developer’s work.

The user should not merely inspect metrics. They should recognize their history in the architecture:

- The project they are proud of is a landmark.
- The abandoned side project is still standing quietly in a distant district, with grass, trees, and slow natural overgrowth reclaiming its grounds.
- The active repository is visibly alive.
- The dependency graph is a network of roads.
- The entire city feels uniquely theirs.

**Do not make a 3D dashboard. Make GitHub inhabitable, visually calm, ecologically alive, and faithful to the repositories it represents.**

---

## Reference

[1]: file:///home/ubuntu/gitworld-claude-build-prompt.md "GitWorld Version 1 Claude build prompt"
[2]: file:///home/ubuntu/upload/gitworld-manus-prompt.md "Original GitWorld product brief supplied by the user"
