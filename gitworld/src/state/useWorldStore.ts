import { create } from 'zustand';
import type { CityWorldModel, ViewMode, QualityPreset, CameraMode } from '../world/cityTypes';
import type { RepoWorldModel } from '../world/repoWorldTypes';

export type Screen = 'landing' | 'loading' | 'city' | 'repo' | 'error';
export type DataSource = 'live' | 'public' | 'demo' | null;

export interface ActiveRepo {
  repoWorld: RepoWorldModel;
  /** The CityBuilding id the player entered through, so exiting can re-focus it. */
  buildingId: string;
}

export interface CodeViewerTarget {
  repoFullName: string;
  filePath?: string;
  fileName?: string;
  language?: string;
}

interface WorldStore {
  screen: Screen;
  source: DataSource;
  world: CityWorldModel | null;
  errorMessage: string | null;
  selectedBuildingId: string | null;
  hoveredBuildingId: string | null;
  searchOpen: boolean;
  legendOpen: boolean;
  activeRepo: ActiveRepo | null;
  codeViewer: CodeViewerTarget | null;

  createRepoOpen: boolean;
  setCreateRepoOpen: (v: boolean) => void;

  // 3D and Display settings
  viewMode: ViewMode;
  qualityPreset: QualityPreset;
  cameraMode: CameraMode;
  reducedMotion: boolean;
  reducedEffects: boolean;
  settingsOpen: boolean;

  setViewMode: (v: ViewMode) => void;
  setQualityPreset: (q: QualityPreset) => void;
  setCameraMode: (c: CameraMode) => void;
  setReducedMotion: (v: boolean) => void;
  setReducedEffects: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;

  setScreen: (s: Screen) => void;
  setWorld: (world: CityWorldModel, source: DataSource) => void;
  setError: (message: string) => void;
  selectBuilding: (id: string | null) => void;
  hoverBuilding: (id: string | null) => void;
  setSearchOpen: (v: boolean) => void;
  setLegendOpen: (v: boolean) => void;
  enterRepo: (repoWorld: RepoWorldModel, buildingId: string) => void;
  exitRepo: () => void;
  openCodeViewer: (target: CodeViewerTarget) => void;
  closeCodeViewer: () => void;
  logout: () => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  screen: 'landing',
  source: null,
  world: null,
  errorMessage: null,
  selectedBuildingId: null,
  hoveredBuildingId: null,
  searchOpen: false,
  legendOpen: false,
  createRepoOpen: false,
  activeRepo: null,
  codeViewer: null,

  viewMode: '3d',
  qualityPreset: 'balanced',
  cameraMode: 'orbit',
  reducedMotion: false,
  reducedEffects: false,
  settingsOpen: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setQualityPreset: (qualityPreset) => set({ qualityPreset }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setReducedEffects: (reducedEffects) => set({ reducedEffects }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  setCreateRepoOpen: (createRepoOpen) => set({ createRepoOpen }),
  setScreen: (screen) => set({ screen }),
  setWorld: (world, source) => set({ world, source, screen: 'city' }),
  setError: (errorMessage) => set({ errorMessage, screen: 'error' }),
  selectBuilding: (selectedBuildingId) => set({ selectedBuildingId }),
  hoverBuilding: (hoveredBuildingId) => set({ hoveredBuildingId }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setLegendOpen: (legendOpen) => set({ legendOpen }),
  enterRepo: (repoWorld, buildingId) =>
    set({ activeRepo: { repoWorld, buildingId }, screen: 'repo', selectedBuildingId: null, searchOpen: false }),
  exitRepo: () => set({ activeRepo: null, screen: 'city' }),
  openCodeViewer: (codeViewer) => set({ codeViewer }),
  closeCodeViewer: () => set({ codeViewer: null }),
  logout: () =>
    set({
      screen: 'landing',
      source: null,
      world: null,
      activeRepo: null,
      selectedBuildingId: null,
      hoveredBuildingId: null,
      codeViewer: null,
      errorMessage: null,
      searchOpen: false,
      legendOpen: false,
      createRepoOpen: false,
      settingsOpen: false,
    }),
}));

