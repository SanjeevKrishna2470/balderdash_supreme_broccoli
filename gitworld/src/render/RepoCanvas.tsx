import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { RepoWorldModel, RepoBuilding } from '../world/repoWorldTypes';
import {
  createCamera,
  stepCamera,
  flyTo,
  worldToScreen,
  screenToWorld,
  clampZoom,
  type CameraState,
} from './camera';
import { drawBackground, drawGround, drawPlayerAvatar } from './draw';
import {
  drawRepoRootPlaza,
  drawRepoDistrict,
  drawRepoPath,
  drawRepoBuilding,
  drawRepoBuildingHeader,
  drawRepoExitPortal,
  drawLanguageBar,
} from './drawRepo';

export interface RepoCanvasHandle {
  flyToBuilding: (id: string) => void;
  nudgePlayer: (dx: number, dy: number) => void;
}

interface Props {
  world: RepoWorldModel;
  selectedBuildingId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onInspect?: (building: RepoBuilding) => void;
  onExit?: () => void;
}

const PLAYER_SPEED = 220;
const VIEW_MARGIN = 160;

export const RepoCanvas = forwardRef<RepoCanvasHandle, Props>(function RepoCanvas(
  { world, selectedBuildingId, onHover, onSelect, onInspect, onExit },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const camRef = useRef<CameraState>(createCamera(world.spawnPoint.x, world.spawnPoint.y, 0.85));
  const playerRef = useRef({ x: world.spawnPoint.x, y: world.spawnPoint.y });
  const facingRef = useRef({ x: 0, y: -1 });
  const keysRef = useRef<Set<string>>(new Set());
  const nudgeRef = useRef({ x: 0, y: 0 });
  const clickTargetRef = useRef<{ x: number; y: number } | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedBuildingId);
  const nearBuildingRef = useRef<RepoBuilding | null>(null);
  const nearPortalRef = useRef<boolean>(false);


  const walkPhaseRef = useRef(0);
  const isWalkingRef = useRef(false);

  const dragRef = useRef<{ active: boolean; moved: boolean; lastX: number; lastY: number }>({
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });
  const sizeRef = useRef({ vw: 1, vh: 1, dpr: 1 });
  const lastTsRef = useRef<number | null>(null);
  const followingRef = useRef(true);

  useEffect(() => {
    selectedIdRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  useImperativeHandle(ref, () => ({
    flyToBuilding(id: string) {
      const b = world.buildings.find((x) => x.id === id);
      if (!b) return;
      followingRef.current = false;
      flyTo(camRef.current, b.x, b.y, clampZoom(1.6));
    },
    nudgePlayer(dx: number, dy: number) {
      nudgeRef.current.x += dx;
      nudgeRef.current.y += dy;
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      sizeRef.current = { vw: rect.width, vh: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Keyboard input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (e.key === 'e' || e.key === 'E') {
        if (nearPortalRef.current) {
          e.preventDefault();
          onExit?.();
          return;
        }
        if (nearBuildingRef.current) {
          e.preventDefault();
          onInspect?.(nearBuildingRef.current);
          return;
        }
      }

      if ((e.key === 'q' || e.key === 'Q') && onExit) {
        e.preventDefault();
        onExit();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      keysRef.current.add(e.key.toLowerCase());
      clickTargetRef.current = null;
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [onInspect, onExit]);



  // Mouse input: hover, click-select, drag-pan, wheel-zoom, click-to-move
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const findBuildingAt = (wx: number, wy: number): RepoBuilding | null => {
      let best: RepoBuilding | null = null;
      let bestDist = Infinity;
      for (const b of world.buildings) {
        const halfW = b.footprint / 2 + 8;
        const top = b.y - b.heightPx - 8;
        const bottom = b.y + 16;
        if (wx < b.x - halfW || wx > b.x + halfW || wy < top || wy > bottom) continue;
        const d = Math.hypot(wx - b.x, wy - b.y);
        if (d < bestDist) {
          bestDist = d;
          best = b;
        }
      }
      return best;
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
        const cam = camRef.current;
        cam.x -= dx / cam.zoom;
        cam.y -= dy / cam.zoom;
        cam.targetX = cam.x;
        cam.targetY = cam.y;
        cam.flying = false;
        followingRef.current = false;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        return;
      }
      const { vw, vh } = sizeRef.current;
      const w = screenToWorld(camRef.current, vw, vh, sx, sy);
      const hit = findBuildingAt(w.x, w.y);
      const id = hit?.id ?? null;
      if (id !== hoveredIdRef.current) {
        hoveredIdRef.current = id;
        onHover(id);
      }
    };

    const onDown = (e: MouseEvent) => {
      dragRef.current = { active: true, moved: false, lastX: e.clientX, lastY: e.clientY };
    };

    const onUp = (e: MouseEvent) => {
      if (!dragRef.current.moved) {
        if (hoveredIdRef.current) {
          onSelect(hoveredIdRef.current);
        } else {
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const { vw, vh } = sizeRef.current;
          clickTargetRef.current = screenToWorld(camRef.current, vw, vh, sx, sy);
        }
      }
      dragRef.current.active = false;
    };

    const onLeave = () => {
      if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        onHover(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camRef.current;
      followingRef.current = false;
      cam.flying = false;
      const factor = Math.exp(-e.deltaY * 0.0016);
      cam.targetZoom = clampZoom(cam.zoom * factor);
      cam.zoom = cam.targetZoom;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [world, onHover, onSelect]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const tick = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(64, ts - last);
      lastTsRef.current = ts;

      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      dx += nudgeRef.current.x;
      dy += nudgeRef.current.y;
      nudgeRef.current.x = 0;
      nudgeRef.current.y = 0;

      if (dx === 0 && dy === 0 && clickTargetRef.current) {
        const cdx = clickTargetRef.current.x - playerRef.current.x;
        const cdy = clickTargetRef.current.y - playerRef.current.y;
        const dist = Math.hypot(cdx, cdy);
        if (dist > 6) {
          dx = cdx / dist;
          dy = cdy / dist;
        } else {
          clickTargetRef.current = null;
        }
      }

      const isMoving = dx !== 0 || dy !== 0;
      isWalkingRef.current = isMoving;

      if (isMoving) {
        const len = Math.hypot(dx, dy) || 1;
        const nx = dx / len;
        const ny = dy / len;
        facingRef.current = { x: nx, y: ny };
        playerRef.current.x += nx * PLAYER_SPEED * (dt / 1000);
        playerRef.current.y += ny * PLAYER_SPEED * (dt / 1000);
        followingRef.current = true;
        walkPhaseRef.current += (dt / 1000) * 1.5;
      } else {
        walkPhaseRef.current += (dt / 1000) * 0.8;
      }

      // Soft collision with file/directory buildings
      for (const b of world.buildings) {
        const dist = Math.hypot(playerRef.current.x - b.x, playerRef.current.y - b.y);
        const minDist = b.footprint * 0.42;
        if (dist < minDist && dist > 0.001) {
          const push = minDist - dist;
          playerRef.current.x += ((playerRef.current.x - b.x) / dist) * push;
          playerRef.current.y += ((playerRef.current.y - b.y) / dist) * push;
        }
      }

      const cam = camRef.current;
      if (followingRef.current) flyTo(cam, playerRef.current.x, playerRef.current.y);
      stepCamera(cam, dt);

      const { vw, vh, dpr } = sizeRef.current;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawBackground(ctx, vw, vh);
      drawGround(ctx, cam, vw, vh, world.bounds);

      for (const d of world.districts) drawRepoDistrict(ctx, cam, vw, vh, d);
      for (const path of world.paths) drawRepoPath(ctx, cam, vw, vh, path);
      drawRepoRootPlaza(ctx, cam, vw, vh, world.centralPlaza, world.projectType, ts);

      // Check proximity to Exit Town Portal
      const portalX = world.spawnPoint.x;
      const portalY = world.spawnPoint.y + 24;
      const distToPortal = Math.hypot(playerRef.current.x - portalX, playerRef.current.y - portalY);
      const nearPortal = distToPortal < 55;
      nearPortalRef.current = nearPortal;

      // Draw Exit Town Portal
      drawRepoExitPortal(ctx, cam, vw, vh, { x: portalX, y: portalY }, nearPortal, ts);


      const margin = VIEW_MARGIN;
      const visible = (wx: number, wy: number) => {
        const p = worldToScreen(cam, vw, vh, wx, wy);
        return p.x > -margin && p.x < vw + margin && p.y > -margin && p.y < vh + margin;
      };

      const sortedBuildings = world.buildings.filter((b) => visible(b.x, b.y)).sort((a, b) => a.y - b.y);

      // Proximity detection for building in range
      const nearBuilding = sortedBuildings.reduce<{ b: RepoBuilding | null; d: number }>(
        (acc, b) => {
          const d = Math.hypot(playerRef.current.x - b.x, playerRef.current.y - b.y);
          const threshold = b.footprint * 1.5;
          if (d < threshold && d < acc.d) return { b, d };
          return acc;
        },
        { b: null, d: Infinity }
      );
      nearBuildingRef.current = nearBuilding.b;

      // Draw building bodies & roofs
      for (const b of sortedBuildings) {
        drawRepoBuilding(ctx, cam, vw, vh, b, {
          hovered: hoveredIdRef.current === b.id || nearBuilding.b?.id === b.id,
          selected: selectedIdRef.current === b.id,
          t: ts,
        });
      }

      // Draw non-emphasized building headers first
      for (const b of sortedBuildings) {
        const isEmphasized =
          hoveredIdRef.current === b.id ||
          selectedIdRef.current === b.id ||
          nearBuilding.b?.id === b.id;
        if (!isEmphasized) {
          drawRepoBuildingHeader(ctx, cam, vw, vh, b, {
            hovered: false,
            selected: false,
            near: false,
          });
        }
      }

      // Draw emphasized building header on top so it is crisp and never occluded
      const topBuilding =
        sortedBuildings.find((b) => b.id === hoveredIdRef.current) ??
        sortedBuildings.find((b) => b.id === selectedIdRef.current) ??
        nearBuilding.b;

      if (topBuilding) {
        drawRepoBuildingHeader(ctx, cam, vw, vh, topBuilding, {
          hovered: hoveredIdRef.current === topBuilding.id,
          selected: selectedIdRef.current === topBuilding.id,
          near: nearBuilding.b?.id === topBuilding.id,
        });
      }

      drawPlayerAvatar(ctx, vw, vh, facingRef.current, cam.zoom, null, walkPhaseRef.current, isWalkingRef.current, 42);


      drawLanguageBar(ctx, vw, vh, world.languages);

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [world]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'grab' }} />
    </div>
  );
});
