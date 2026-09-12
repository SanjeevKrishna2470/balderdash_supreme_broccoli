import { useCallback, useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { Loading } from './components/Loading';
import { RepoPanel } from './components/RepoPanel';
import { RepoWorldPanel } from './components/RepoWorldPanel';
import { RepoHeader } from './components/RepoHeader';
import { TopBar } from './components/TopBar';
import { SearchOverlay } from './components/SearchOverlay';
import { ErrorScreen } from './components/ErrorScreen';
import { MobileControls } from './components/MobileControls';
import { CodeViewerModal } from './components/CodeViewerModal';
import { CreateRepoModal } from './components/CreateRepoModal';
import { CityCanvas, type CityCanvasHandle } from './render/CityCanvas';
import { RepoCanvas, type RepoCanvasHandle } from './render/RepoCanvas';
import { useWorldStore } from './state/useWorldStore';
import { buildCity } from './world/worldBuilder';
import { buildRepoWorld } from './world/repoWorldBuilder';
import { fetchRepoTree } from './world/repoApi';
import { getDemoRepos, getDemoUser } from './world/mockRepos';
import { fetchSession, beginGithubLogin, beginPrivateAccess, fetchUserByUsername, logout, setAuthToken } from './world/api';
import type { CityBuilding } from './world/cityTypes';

export default function App() {
  const screen = useWorldStore((s) => s.screen);
  const world = useWorldStore((s) => s.world);
  const source = useWorldStore((s) => s.source);
  const selectedBuildingId = useWorldStore((s) => s.selectedBuildingId);
  const errorMessage = useWorldStore((s) => s.errorMessage);
  const activeRepo = useWorldStore((s) => s.activeRepo);
  const setWorld = useWorldStore((s) => s.setWorld);
  const setScreen = useWorldStore((s) => s.setScreen);
  const setError = useWorldStore((s) => s.setError);
  const selectBuilding = useWorldStore((s) => s.selectBuilding);
  const searchOpen = useWorldStore((s) => s.searchOpen);
  const setSearchOpen = useWorldStore((s) => s.setSearchOpen);
  const legendOpen = useWorldStore((s) => s.legendOpen);
  const setLegendOpen = useWorldStore((s) => s.setLegendOpen);
  const createRepoOpen = useWorldStore((s) => s.createRepoOpen);
  const setCreateRepoOpen = useWorldStore((s) => s.setCreateRepoOpen);
  const enterRepo = useWorldStore((s) => s.enterRepo);
  const exitRepo = useWorldStore((s) => s.exitRepo);
  const codeViewer = useWorldStore((s) => s.codeViewer);
  const openCodeViewer = useWorldStore((s) => s.openCodeViewer);
  const closeCodeViewer = useWorldStore((s) => s.closeCodeViewer);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [repoHoveredId, setRepoHoveredId] = useState<string | null>(null);
  const [repoSelectedId, setRepoSelectedId] = useState<string | null>(null);
  const [repoStatus, setRepoStatus] = useState<{ kind: 'idle' | 'loading' | 'error'; message?: string }>({
    kind: 'idle',
  });

  const canvasRef = useRef<CityCanvasHandle>(null);
  const repoCanvasRef = useRef<RepoCanvasHandle>(null);

  const handleRepoCreated = useCallback((newRepo: any) => {
    if (!world) return;
    const existingRepos = world.buildings.map((b) => b.repo);
    if (!existingRepos.some((r) => r.id === newRepo.id)) {
      const updatedCity = buildCity([newRepo, ...existingRepos], world.user);
      setWorld(updatedCity, source || 'demo');
      selectBuilding(String(newRepo.id));
      setTimeout(() => {
        canvasRef.current?.flyToBuilding(String(newRepo.id));
      }, 150);
    }
  }, [world, source, setWorld, selectBuilding]);

  const enterDemo = useCallback(() => {
    setScreen('loading');
    setTimeout(() => {
      const city = buildCity(getDemoRepos(), getDemoUser());
      setWorld(city, 'demo');
    }, 900);
  }, [setScreen, setWorld]);

  const signIn = useCallback(async (redirectIfMissing = true) => {
    setScreen('loading');
    try {
      const session = await fetchSession();
      if (!session) {
        if (redirectIfMissing) {
          beginGithubLogin();
        } else {
          setError('Your GitHub session was not available after authorization. Please try signing in again.');
        }
        return;
      }
      const city = buildCity(session.repos, {
        username: session.username,
        displayName: session.displayName,
        avatarUrl: session.avatarUrl,
        htmlUrl: session.htmlUrl,
      });
      setWorld(city, 'live');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach GitHub.');
    }
  }, [setScreen, setWorld, setError]);

  const exploreUsername = useCallback(
    async (username: string) => {
      setScreen('loading');
      try {
        const session = await fetchUserByUsername(username);
        const city = buildCity(session.repos, {
          username: session.username,
          displayName: session.displayName,
          avatarUrl: session.avatarUrl,
          htmlUrl: session.htmlUrl,
        });
        setWorld(city, 'public');
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not load GitHub user "${username}".`);
      }
    },
    [setScreen, setWorld, setError]
  );

  // Enter a repository's interior world. Triggered either by pressing [E] near
  // a building in the city, or by the "Explore repository interior" button in
  // its info panel. The city canvas stays mounted (paused) underneath so its
  // camera and player position are exactly as left when the person returns.
  const enterRepoWorld = useCallback(
    async (buildingId: string) => {
      const building = world?.buildings.find((b) => b.id === buildingId);
      if (!building) return;

      setRepoStatus({ kind: 'loading' });
      try {
        const [owner, repoName] = building.repo.fullName.split('/');
        const tree = await fetchRepoTree(owner, repoName);
        const repoWorld = buildRepoWorld(tree);
        enterRepo(repoWorld, building.id);
        setRepoStatus({ kind: 'idle' });
      } catch (err) {
        setRepoStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Could not open this repository right now.',
        });
      }
    },
    [world, enterRepo]
  );

  const handleExitRepo = useCallback(() => {
    setRepoSelectedId(null);
    setRepoHoveredId(null);
    exitRepo();
  }, [exitRepo]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // Ignore network errors on logout
    }
    setAuthToken(null);
    useWorldStore.getState().logout();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const token = params.get('token');

    if (token) {
      setAuthToken(token);
    }

    if (!auth) return;

    // Strip the query params immediately so a refresh doesn't replay this.
    window.history.replaceState({}, '', window.location.pathname);

    if (auth === 'success') {
      // Do not restart OAuth automatically after a callback. If the session or
      // API is temporarily unavailable, show a recoverable error instead of
      // sending the browser through an OAuth loop.
      signIn(false);
    } else if (auth === 'denied') {
      setError('Sign-in was cancelled before GitHub granted access.');
    } else if (auth === 'error') {
      setError('GitHub sign-in failed. Please try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // City-screen keyboard shortcuts
  useEffect(() => {
    if (screen !== 'city') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (typing) return;
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        else if (selectedBuildingId) selectBuilding(null);
        else if (legendOpen) setLegendOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, searchOpen, selectedBuildingId, legendOpen, setSearchOpen, selectBuilding, setLegendOpen]);

  // Repo-screen keyboard shortcuts: Escape closes code viewer, then file panel, then backs out to town.
  // Q or Backspace immediately backs out to town when not typing.
  useEffect(() => {
    if (screen !== 'repo') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (typing) return;
      if (e.key === 'Escape') {
        if (codeViewer) closeCodeViewer();
        else if (repoSelectedId) setRepoSelectedId(null);
        else handleExitRepo();
      } else if ((e.key === 'q' || e.key === 'Q' || e.key === 'Backspace') && !codeViewer && !repoSelectedId) {
        handleExitRepo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, repoSelectedId, codeViewer, closeCodeViewer, handleExitRepo]);

  const hoveredBuilding = world?.buildings.find((b) => b.id === hoveredId) ?? null;
  const selected = world?.buildings.find((b) => b.id === selectedBuildingId) ?? null;

  const enteredBuilding: CityBuilding | null =
    (activeRepo && world?.buildings.find((b) => b.id === activeRepo.buildingId)) ?? null;
  const enteredDistrictName =
    (enteredBuilding && world?.districts.find((d) => d.id === enteredBuilding.districtId)?.name) || 'District';
  const repoHoveredBuilding = activeRepo?.repoWorld.buildings.find((b) => b.id === repoHoveredId) ?? null;
  const repoSelectedBuilding = activeRepo?.repoWorld.buildings.find((b) => b.id === repoSelectedId) ?? null;

  const handleSelectFromSearch = useCallback(
    (id: string) => {
      selectBuilding(id);
      setSearchOpen(false);
      canvasRef.current?.flyToBuilding(id);
    },
    [selectBuilding, setSearchOpen]
  );

  const handleSelectFromRepoSearch = useCallback((id: string) => {
    setRepoSelectedId(id);
    repoCanvasRef.current?.flyToBuilding(id);
  }, []);

  return (
    <div style={{ height: '100%' }}>
      {screen === 'landing' && (
        <Landing onEnterDemo={enterDemo} onSignIn={signIn} onExploreUsername={exploreUsername} />
      )}
      {screen === 'loading' && <Loading slow={false} />}
      {screen === 'error' && <ErrorScreen message={errorMessage} onRetry={signIn} onDemo={enterDemo} />}

      {(screen === 'city' || screen === 'repo') && world && (
        <div style={{ position: 'relative', height: '100%' }}>
          {/* City canvas stays mounted across the transition so camera + player position
              are preserved exactly; it's just paused and visually hidden while in a repo. */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: screen === 'city' ? 1 : 0,
              pointerEvents: screen === 'city' ? 'auto' : 'none',
            }}
          >
            <CityCanvas
              ref={canvasRef}
              world={world}
              selectedBuildingId={selectedBuildingId}
              onHover={setHoveredId}
              onSelect={(id) => selectBuilding(id)}
              onEnter={enterRepoWorld}
              onOpenCreateRepo={() => setCreateRepoOpen(true)}
              active={screen === 'city'}
            />
          </div>

          {screen === 'city' && (
            <>
              <TopBar
                user={world.user}
                source={source}
                hoveredName={hoveredBuilding?.repo.name ?? null}
                legendOpen={legendOpen}
                onToggleLegend={() => setLegendOpen(!legendOpen)}
                onOpenSearch={() => setSearchOpen(true)}
                onOpenCreateRepo={source === 'public' ? undefined : () => setCreateRepoOpen(true)}
                onLogout={source === 'live' ? handleLogout : undefined}
                onLeaveRealm={source === 'public' ? () => useWorldStore.getState().logout() : undefined}
                onEnablePrivate={source === 'live' ? beginPrivateAccess : undefined}
              />

              {searchOpen && (
                <SearchOverlay
                  buildings={world.buildings}
                  onClose={() => setSearchOpen(false)}
                  onSelect={handleSelectFromSearch}
                />
              )}

              <RepoPanel
                building={selected}
                onClose={() => selectBuilding(null)}
                onEnter={(b) => enterRepoWorld(b.id)}
                onBrowseCode={(b) => openCodeViewer({ repoFullName: b.repo.fullName })}
              />

              <MobileControls onMove={(dx, dy) => canvasRef.current?.nudgePlayer(dx, dy)} />
            </>
          )}

          {screen === 'repo' && activeRepo && (
            <>
              <RepoCanvas
                ref={repoCanvasRef}
                world={activeRepo.repoWorld}
                selectedBuildingId={repoSelectedId}
                onHover={setRepoHoveredId}
                onSelect={(id) => setRepoSelectedId(id)}
                onExit={handleExitRepo}
                onInspect={(b) => {
                  openCodeViewer({
                    repoFullName: activeRepo.repoWorld.repoFullName,
                    filePath: b.path,
                    fileName: b.name,
                    language: b.language,
                  });
                }}
              />

              <RepoHeader
                world={activeRepo.repoWorld}
                districtName={enteredDistrictName}
                hoveredName={repoHoveredBuilding?.name ?? null}
                onExit={handleExitRepo}
                onSelectBuilding={handleSelectFromRepoSearch}
                onLogout={handleLogout}
              />

              <RepoWorldPanel
                building={repoSelectedBuilding}
                onClose={() => setRepoSelectedId(null)}
                onViewCode={(b) => {
                  if (activeRepo) {
                    openCodeViewer({
                      repoFullName: activeRepo.repoWorld.repoFullName,
                      filePath: b.path,
                      fileName: b.name,
                      language: b.language,
                    });
                  }
                }}
              />

              <MobileControls onMove={(dx, dy) => repoCanvasRef.current?.nudgePlayer(dx, dy)} />
            </>
          )}


          {repoStatus.kind !== 'idle' && (
            <div
              role="status"
              style={{
                position: 'absolute',
                left: '50%',
                bottom: 28,
                transform: 'translateX(-50%)',
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(23,22,43,0.92)',
                border: `1px solid ${repoStatus.kind === 'error' ? 'rgba(217,128,95,0.5)' : 'rgba(89,173,162,0.4)'}`,
                color: '#f1ead9',
                padding: '10px 18px',
                borderRadius: 999,
                fontSize: 13,
                maxWidth: '90vw',
              }}
            >
              <span>
                {repoStatus.kind === 'loading'
                  ? 'Reading the repository structure…'
                  : repoStatus.message ?? 'Could not open this repository.'}
              </span>
              {repoStatus.kind === 'error' && (
                <button
                  onClick={() => setRepoStatus({ kind: 'idle' })}
                  style={{ background: 'transparent', color: '#a7a3c4', border: 'none', fontSize: 13 }}
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {codeViewer && (
        <CodeViewerModal target={codeViewer} onClose={closeCodeViewer} />
      )}

      {createRepoOpen && (
        <CreateRepoModal
          onClose={() => setCreateRepoOpen(false)}
          onRepoCreated={handleRepoCreated}
        />
      )}
    </div>
  );
}
