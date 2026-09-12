import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { CityWorldModel, CityBuilding } from '../world/cityTypes';
import { resolveMovement, PLAYER_CONFIG } from '../world/playerController';
import { useWorldStore } from '../state/useWorldStore';
import {
  createCamera,
  stepCamera,
  flyTo,
  worldToScreen,
  screenToWorld,
  clampZoom,
  type CameraState,
} from './camera';
import {
  drawBackground,
  drawGround,
  drawDistrict,
  drawRoad,
  drawEnvironmentProp,
  drawBuilding,
  drawInteractionPrompt,
  drawBuildingLabel,
  drawAvatar,
  drawPlayerAvatar,
  drawRiver,
  drawBridge,
  drawBoat,
  drawConstructionDistrict,
  drawPublicWorldGate,
  drawWaterSplash,
} from './draw';

export interface CityCanvasHandle {
  flyToBuilding: (id: string) => void;
  nudgePlayer: (dx: number, dy: number) => void;
  recenterOnPlayer?: () => void;
  triggerInteraction?: () => void;
}

interface Props {
  world: CityWorldModel;
  selectedBuildingId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Called when the player presses E/Enter within range of a building — enters its repo interior. */
  onEnter: (id: string) => void;
  /**
   * Whether this canvas is the foreground, interactive view. When false, the
   * game loop pauses in place (no movement, no rAF) instead of unmounting, so
   * player position and camera framing are preserved for when the person
   * returns from a repo interior.
   */
  active?: boolean;
  onOpenCreateRepo?: () => void;
  onOpenPublicWorld?: () => void;
  onRiverExit?: () => void;
  onInteractionChange?: (label: string | null) => void;
}

const PLAYER_SPEED = 220; // world units / second
const VIEW_MARGIN = 160;

export const CityCanvas = forwardRef<CityCanvasHandle, Props>(function CityCanvas(
  {
    world,
    selectedBuildingId,
    onHover,
    onSelect,
    onEnter,
    active = true,
    onOpenCreateRepo,
    onOpenPublicWorld,
    onRiverExit,
    onInteractionChange,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialPlayerPos = useWorldStore.getState().playerPosition || { x: world.spawnPoint.x, y: world.spawnPoint.y };
  const camRef = useRef<CameraState>(createCamera(initialPlayerPos.x, initialPlayerPos.y, 1));
  const playerRef = useRef({ x: initialPlayerPos.x, y: initialPlayerPos.y });
  const facingRef = useRef(useWorldStore.getState().playerFacing || { x: 0, y: 1 });
  const keysRef = useRef<Set<string>>(new Set());
  const nudgeRef = useRef({ x: 0, y: 0 });
  const clickTargetRef = useRef<{ x: number; y: number } | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(selectedBuildingId);
  const nearBuildingRef = useRef<CityBuilding | null>(null);

  // World extension state refs (AGENT.md Sections 7, 8, 9)
  const boatRef = useRef(world.boat ? { ...world.boat } : null);
  const isBoardingRef = useRef(false);
  const nearDockRef = useRef<'town' | 'construction' | null>(null);
  const nearDeskRef = useRef(false);
  const nearGateRef = useRef(false);
  const splashRef = useRef<{ x: number; y: number; progress: number } | null>(null);
  const lastRiverExitTimeRef = useRef(0);
  const lastProximityLabelRef = useRef<string | null>(null);

  const walkPhaseRef = useRef(0);
  const isWalkingRef = useRef(false);
  const avatarImgRef = useRef<HTMLImageElement | null>(null);

  const mouseWorldRef = useRef<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ active: boolean; moved: boolean; lastX: number; lastY: number }>({
    active: false,
    moved: false,
    lastX: 0,
    lastY: 0,
  });
  const sizeRef = useRef({ vw: 1, vh: 1, dpr: 1 });
  const lastTsRef = useRef<number | null>(null);
  const followingRef = useRef(true);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (active) {
      const pos = useWorldStore.getState().playerPosition;
      if (pos) {
        playerRef.current.x = pos.x;
        playerRef.current.y = pos.y;
        flyTo(camRef.current, pos.x, pos.y);
      }
      const facing = useWorldStore.getState().playerFacing;
      if (facing) {
        facingRef.current = { ...facing };
      }
      onInteractionChange?.(lastProximityLabelRef.current);
    } else {
      keysRef.current.clear();
    }
  }, [active, onInteractionChange]);

  useEffect(() => {
    if (world.boat) {
      boatRef.current = { ...world.boat };
    }
  }, [world.boat]);

  // Preload user avatar image for high-fidelity character badge
  useEffect(() => {
    if (!world.user.avatarUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = world.user.avatarUrl;
    img.onload = () => {
      avatarImgRef.current = img;
    };
  }, [world.user.avatarUrl]);

  useEffect(() => {
    selectedIdRef.current = selectedBuildingId;
  }, [selectedBuildingId]);

  const triggerInteraction = useCallback(() => {
    // 1. Board ferry boat
    if (nearDockRef.current && boatRef.current && boatRef.current.state !== 'crossing') {
      boatRef.current.state = 'crossing';
      boatRef.current.targetDock = nearDockRef.current === 'town' ? 'construction' : 'town';
      boatRef.current.progress = 0;
      isBoardingRef.current = true;
      return;
    }

    // 2. Blueprint desk in construction district
    if (nearDeskRef.current && onOpenCreateRepo) {
      onOpenCreateRepo();
      return;
    }

    // 3. Public world gateway
    if (nearGateRef.current && onOpenPublicWorld) {
      onOpenPublicWorld();
      return;
    }

    // 4. Enter repository interior
    if (nearBuildingRef.current) {
      onEnter(nearBuildingRef.current.id);
      return;
    }
  }, [onEnter, onOpenCreateRepo, onOpenPublicWorld]);

  useImperativeHandle(ref, () => ({
    flyToBuilding(id: string) {
      const b = world.buildings.find((x) => x.id === id);
      if (!b) return;
      followingRef.current = false;
      flyTo(camRef.current, b.x, b.y, clampZoom(1.5));
    },
    nudgePlayer(dx: number, dy: number) {
      nudgeRef.current.x += dx;
      nudgeRef.current.y += dy;
    },
    recenterOnPlayer() {
      followingRef.current = true;
      flyTo(camRef.current, playerRef.current.x, playerRef.current.y, clampZoom(1.0));
    },
    triggerInteraction() {
      triggerInteraction();
    },
  }));

  // Resize handling
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // hidden (inactive) — keep last known size
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

  // Input: keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Proximity interaction trigger: 'E' or 'Enter'
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        e.preventDefault();
        triggerInteraction();
        return;
      }

      keysRef.current.add(e.key.toLowerCase());
      clickTargetRef.current = null; // Keyboard cancels click-to-move
    };

    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    const onClear = () => keysRef.current.clear();

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', onClear);
    document.addEventListener('visibilitychange', onClear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', onClear);
      document.removeEventListener('visibilitychange', onClear);
    };
  }, [triggerInteraction]);

  // Input: mouse / trackpad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const findBuildingAt = (wx: number, wy: number): CityBuilding | null => {
      let best: CityBuilding | null = null;
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
      if (!activeRef.current) return;
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
      const world_ = screenToWorld(camRef.current, vw, vh, sx, sy);
      mouseWorldRef.current = world_;
      const hit = findBuildingAt(world_.x, world_.y);
      const id = hit?.id ?? null;
      if (id !== hoveredIdRef.current) {
        hoveredIdRef.current = id;
        onHover(id);
      }
    };

    const onDown = (e: MouseEvent) => {
      if (!activeRef.current) return;
      dragRef.current = { active: true, moved: false, lastX: e.clientX, lastY: e.clientY };
    };

    const onUp = (e: MouseEvent) => {
      if (!activeRef.current) return;
      if (!dragRef.current.moved) {
        if (hoveredIdRef.current) {
          onSelect(hoveredIdRef.current);
        } else {
          // Click-to-move accessibility & exploration
          const rect = canvas.getBoundingClientRect();
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const { vw, vh } = sizeRef.current;
          const targetWorld = screenToWorld(camRef.current, vw, vh, sx, sy);
          clickTargetRef.current = targetWorld;
        }
      }
      dragRef.current.active = false;
    };

    const onLeave = () => {
      if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        onHover(null);
      }
      mouseWorldRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (!activeRef.current) return;
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

  // Main game loop — paused (no rAF) while inactive so state freezes in place.
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;

    const tick = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(64, ts - last);
      lastTsRef.current = ts;

      // 1. Boat Crossing Animation (AGENT.md Section 8)
      if (boatRef.current && boatRef.current.state === 'crossing') {
        boatRef.current.progress += dt / 2400;
        const p = Math.min(1, boatRef.current.progress);
        const fromDock = boatRef.current.targetDock === 'construction' ? boatRef.current.dockTown : boatRef.current.dockConstruction;
        const toDock = boatRef.current.targetDock === 'construction' ? boatRef.current.dockConstruction : boatRef.current.dockTown;
        boatRef.current.x = fromDock.x + (toDock.x - fromDock.x) * p;
        boatRef.current.y = fromDock.y + (toDock.y - fromDock.y) * p;

        if (isBoardingRef.current) {
          playerRef.current.x = boatRef.current.x;
          playerRef.current.y = boatRef.current.y;
          useWorldStore.getState().setPlayerPosition(playerRef.current, facingRef.current);
          followingRef.current = true;
        }

        if (p >= 1) {
          boatRef.current.state = boatRef.current.targetDock === 'construction' ? 'docked_construction' : 'docked_town';
          if (isBoardingRef.current) {
            playerRef.current.y = boatRef.current.targetDock === 'construction' ? toDock.y + 18 : toDock.y - 18;
            isBoardingRef.current = false;
            useWorldStore.getState().setPlayerPosition(playerRef.current, facingRef.current);
          }
        }
      }

      // 2. Keyboard & Nudge Movement (disabled while riding ferry boat)
      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (!isBoardingRef.current) {
        if (keys.has('w') || keys.has('arrowup')) dy -= 1;
        if (keys.has('s') || keys.has('arrowdown')) dy += 1;
        if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
        if (keys.has('d') || keys.has('arrowright')) dx += 1;
        dx += nudgeRef.current.x;
        dy += nudgeRef.current.y;
      }
      nudgeRef.current.x = 0;
      nudgeRef.current.y = 0;

      // Click-to-move path interpolation
      if (!isBoardingRef.current && dx === 0 && dy === 0 && clickTargetRef.current) {
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
        const prospective = {
          x: playerRef.current.x + nx * PLAYER_SPEED * (dt / 1000),
          y: playerRef.current.y + ny * PLAYER_SPEED * (dt / 1000),
        };
        const resolved = resolveMovement(playerRef.current, prospective, PLAYER_CONFIG.collisionRadius, world);
        playerRef.current.x = resolved.x;
        playerRef.current.y = resolved.y;
        useWorldStore.getState().setPlayerPosition(playerRef.current, facingRef.current);
        followingRef.current = true;
        walkPhaseRef.current += (dt / 1000) * 1.5;
      } else {
        walkPhaseRef.current += (dt / 1000) * 0.8; // Idle breathing
      }

      // 3. River Exit Mechanic: Detect stepping into deep water (AGENT.md Section 8)
      if (world.river && !isBoardingRef.current) {
        const py = playerRef.current.y;
        const px = playerRef.current.x;
        const inRiver = py > world.river.bankNorth + 14 && py < world.river.bankSouth - 14;
        if (inRiver) {
          const onBridge =
            world.bridge &&
            px >= world.bridge.bounds.left &&
            px <= world.bridge.bounds.right &&
            py >= world.bridge.bounds.top &&
            py <= world.bridge.bounds.bottom;
          const onTownDock = world.boat && Math.hypot(px - world.boat.dockTown.x, py - world.boat.dockTown.y) < 32;
          const onConstDock = world.boat && Math.hypot(px - world.boat.dockConstruction.x, py - world.boat.dockConstruction.y) < 32;

          if (!onBridge && !onTownDock && !onConstDock) {
            const now = performance.now();
            if (now - lastRiverExitTimeRef.current > 1500) {
              lastRiverExitTimeRef.current = now;
              splashRef.current = { x: px, y: py, progress: 0 };
              const safePoint = world.safeShorePoint || { x: -140, y: 380 };
              playerRef.current.x = safePoint.x;
              playerRef.current.y = safePoint.y;
              clickTargetRef.current = null;
              useWorldStore.getState().setPlayerPosition(playerRef.current, facingRef.current);
              onRiverExit?.();
            }
          }
        }
      }

      // Update splash effect
      if (splashRef.current) {
        splashRef.current.progress += dt / 850;
        if (splashRef.current.progress >= 1) splashRef.current = null;
      }

      // 4. Infrastructure Proximity Detection
      if (boatRef.current) {
        const dTown = Math.hypot(playerRef.current.x - boatRef.current.dockTown.x, playerRef.current.y - boatRef.current.dockTown.y);
        const dConst = Math.hypot(playerRef.current.x - boatRef.current.dockConstruction.x, playerRef.current.y - boatRef.current.dockConstruction.y);
        if (dTown < 46 && boatRef.current.state === 'docked_town') {
          nearDockRef.current = 'town';
        } else if (dConst < 46 && boatRef.current.state === 'docked_construction') {
          nearDockRef.current = 'construction';
        } else {
          nearDockRef.current = null;
        }
      }

      if (world.constructionDistrict) {
        const dDesk = Math.hypot(
          playerRef.current.x - world.constructionDistrict.blueprintTable.x,
          playerRef.current.y - world.constructionDistrict.blueprintTable.y
        );
        nearDeskRef.current = dDesk < 56;
      }

      if (world.publicRoad) {
        const dGate = Math.hypot(
          playerRef.current.x - world.publicRoad.gatePoint.x,
          playerRef.current.y - world.publicRoad.gatePoint.y
        );
        nearGateRef.current = dGate < 60;
      }

      // 5. Soft building collision separation
      for (const b of world.buildings) {
        const dist = Math.hypot(playerRef.current.x - b.x, playerRef.current.y - b.y);
        const minDist = b.footprint * 0.44;
        if (dist < minDist && dist > 0.001) {
          const push = minDist - dist;
          playerRef.current.x += ((playerRef.current.x - b.x) / dist) * push;
          playerRef.current.y += ((playerRef.current.y - b.y) / dist) * push;
        }
      }

      // 6. Camera Follow
      const cam = camRef.current;
      if (followingRef.current) {
        flyTo(cam, playerRef.current.x, playerRef.current.y);
      }
      stepCamera(cam, dt);

      // 7. Canvas Drawing
      const { vw, vh, dpr } = sizeRef.current;
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      drawBackground(ctx, vw, vh);
      drawGround(ctx, cam, vw, vh, world.bounds);

      // Draw River (rendered under roads & bridges)
      if (world.river) {
        drawRiver(ctx, cam, vw, vh, world.river, world.bounds, ts);
      }

      // Draw Districts
      for (const d of world.districts) {
        drawDistrict(ctx, cam, vw, vh, d);
      }

      // Draw Construction District
      if (world.constructionDistrict) {
        drawConstructionDistrict(ctx, cam, vw, vh, world.constructionDistrict, nearDeskRef.current, ts);
      }

      // Draw Roads
      for (const r of world.roads) {
        drawRoad(ctx, cam, vw, vh, r);
      }

      // Draw Bridge
      if (world.bridge) {
        drawBridge(ctx, cam, vw, vh, world.bridge);
      }

      // Draw Ferry Boat
      if (boatRef.current) {
        drawBoat(ctx, cam, vw, vh, boatRef.current, !!nearDockRef.current, ts);
      }

      // Draw Public World Road Gate
      if (world.publicRoad) {
        drawPublicWorldGate(ctx, cam, vw, vh, world.publicRoad, nearGateRef.current);
      }

      // Draw Water Splash
      if (splashRef.current) {
        drawWaterSplash(ctx, cam, vw, vh, splashRef.current);
      }

      // Draw Environment Props (Fountain, Lamps, Trees, Signs, Benches)
      if (world.environmentProps) {
        for (const prop of world.environmentProps) {
          drawEnvironmentProp(ctx, cam, vw, vh, prop, ts);
        }
      }

      // Viewport culling
      const margin = VIEW_MARGIN;
      const visible = (wx: number, wy: number) => {
        const p = worldToScreen(cam, vw, vh, wx, wy);
        return p.x > -margin && p.x < vw + margin && p.y > -margin && p.y < vh + margin;
      };

      const sortedBuildings = world.buildings
        .filter((b) => visible(b.x, b.y))
        .sort((a, b) => a.y - b.y);

      // Proximity Detection
      const nearBuilding = sortedBuildings.reduce<{ b: CityBuilding | null; d: number }>(
        (acc, b) => {
          const d = Math.hypot(playerRef.current.x - b.x, playerRef.current.y - b.y);
          const threshold = b.footprint * 1.55;
          if (d < threshold && d < acc.d) return { b, d };
          return acc;
        },
        { b: null, d: Infinity }
      );
      nearBuildingRef.current = nearBuilding.b;

      // Draw Buildings
      for (const b of sortedBuildings) {
        drawBuilding(ctx, cam, vw, vh, b, {
          hovered: hoveredIdRef.current === b.id || nearBuilding.b?.id === b.id,
          selected: selectedIdRef.current === b.id,
          t: ts,
        });
      }

      // Draw Contributor Avatars
      for (const a of world.avatars) {
        if (!visible(a.homeX, a.homeY)) continue;
        drawAvatar(ctx, cam, vw, vh, a, ts);
      }

      // Contextual Interaction Prompt when in range of building
      let currentPrompt: string | null = null;
      if (nearDockRef.current && boatRef.current && boatRef.current.state !== 'crossing') {
        currentPrompt = 'Board Ferry Boat';
      } else if (nearDeskRef.current) {
        currentPrompt = 'Architect New Repository';
      } else if (nearGateRef.current) {
        currentPrompt = 'Visit Public World';
      } else if (nearBuilding.b) {
        currentPrompt = `Enter ${nearBuilding.b.repo.name}`;
      }

      if (currentPrompt !== lastProximityLabelRef.current) {
        lastProximityLabelRef.current = currentPrompt;
        if (activeRef.current) {
          onInteractionChange?.(currentPrompt);
        }
      }

      if (nearBuilding.b) {
        drawInteractionPrompt(ctx, cam, vw, vh, nearBuilding.b, 'Enter repository');
      }

      // Building Name Label
      const labelBuilding =
        sortedBuildings.find((b) => b.id === hoveredIdRef.current) ??
        sortedBuildings.find((b) => b.id === selectedIdRef.current) ??
        nearBuilding.b;
      if (labelBuilding) {
        drawBuildingLabel(ctx, cam, vw, vh, labelBuilding, {
          emphasized: selectedIdRef.current === labelBuilding.id,
        });
      }

      // 6. Draw Player Avatar (Identifiable avatar with walking animation & profile color)
      drawPlayerAvatar(
        ctx,
        vw,
        vh,
        facingRef.current,
        cam.zoom,
        avatarImgRef.current,
        walkPhaseRef.current,
        isWalkingRef.current,
        world.user.profileColorSeed ?? 42
      );

      ctx.restore();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [world, active, onRiverExit, onInteractionChange]);

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', cursor: 'grab' }} />
    </div>
  );
});
