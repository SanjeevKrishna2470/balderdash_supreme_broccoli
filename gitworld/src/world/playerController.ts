import type { CityWorldModel, CityBuilding } from './cityTypes';

export interface PlayerState {
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  facing: { x: number; y: number };
  movementState: 'idle' | 'walking' | 'interacting' | 'boarding' | 'disabled';
  destination: { x: number; y: number } | null;
  activeInteraction: {
    id: string;
    type: 'building' | 'boat' | 'desk' | 'gate';
    label: string;
    actionId: string;
  } | null;
  lastSafePosition: { x: number; y: number };
  walkPhase: number;
}

export const PLAYER_CONFIG = {
  maxSpeed: 230,
  acceleration: 1400,
  deceleration: 1600,
  collisionRadius: 13,
  interactionDistance: 54,
};

export function createInitialPlayerState(spawnPoint: { x: number; y: number }): PlayerState {
  return {
    position: { x: spawnPoint.x, y: spawnPoint.y },
    velocity: { x: 0, y: 0 },
    facing: { x: 0, y: 1 },
    movementState: 'idle',
    destination: null,
    activeInteraction: null,
    lastSafePosition: { x: spawnPoint.x, y: spawnPoint.y },
    walkPhase: 0,
  };
}

/**
 * Checks if circle at (px, py) with radius r intersects any solid building footprint.
 */
export function checkBuildingCollision(
  px: number,
  py: number,
  radius: number,
  buildings: CityBuilding[]
): { collides: boolean; hitBuilding?: CityBuilding } {
  for (const b of buildings) {
    const halfW = (b.footprint * 0.78) / 2;
    const halfH = (b.footprint * 0.78) / 2;

    // Closest point on building rectangle to player circle
    const cx = Math.max(b.x - halfW, Math.min(px, b.x + halfW));
    const cy = Math.max(b.y - halfH, Math.min(py, b.y + halfH));

    const distSq = (px - cx) * (px - cx) + (py - cy) * (py - cy);
    if (distSq < radius * radius) {
      return { collides: true, hitBuilding: b };
    }
  }
  return { collides: false };
}

/**
 * Resolves movement with natural collision sliding along solid obstacles.
 */
export function resolveMovement(
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  radius: number,
  world: CityWorldModel
): { x: number; y: number } {
  // 1. Try full movement
  if (!checkBuildingCollision(targetPos.x, targetPos.y, radius, world.buildings).collides) {
    return clampToBounds(targetPos, world);
  }

  // 2. Try sliding along X only
  const slideX = { x: targetPos.x, y: currentPos.y };
  if (!checkBuildingCollision(slideX.x, slideX.y, radius, world.buildings).collides) {
    return clampToBounds(slideX, world);
  }

  // 3. Try sliding along Y only
  const slideY = { x: currentPos.x, y: targetPos.y };
  if (!checkBuildingCollision(slideY.x, slideY.y, radius, world.buildings).collides) {
    return clampToBounds(slideY, world);
  }

  // 4. Blocked completely on both axes
  return clampToBounds(currentPos, world);
}

function clampToBounds(pos: { x: number; y: number }, world: CityWorldModel): { x: number; y: number } {
  const bounds = world.bounds || { width: 3000, height: 2600 };
  const margin = 24;
  const minX = -bounds.width / 2 + margin;
  const maxX = bounds.width / 2 - margin;
  const minY = -bounds.height / 2 + margin;
  const maxY = bounds.height / 2 - margin;

  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y)),
  };
}

/**
 * Finds the single closest contextual interactable object near the player.
 */
export function checkInteractionProximity(
  px: number,
  py: number,
  world: CityWorldModel
): PlayerState['activeInteraction'] {
  let closest: PlayerState['activeInteraction'] = null;
  let minDist = PLAYER_CONFIG.interactionDistance;

  // 1. Buildings (entrance door arch)
  for (const b of world.buildings) {
    const entranceX = b.plotEntrance?.x ?? b.x;
    const entranceY = b.plotEntrance?.y ?? b.y + b.footprint * 0.45;
    const dist = Math.hypot(px - entranceX, py - entranceY);
    if (dist < minDist) {
      minDist = dist;
      closest = {
        id: b.id,
        type: 'building',
        label: `Enter ${b.repo.name}`,
        actionId: b.id,
      };
    }
  }

  // 2. Blueprint table in Construction District
  if (world.constructionDistrict) {
    const table = world.constructionDistrict.blueprintTable;
    const dist = Math.hypot(px - table.x, py - table.y);
    if (dist < minDist) {
      minDist = dist;
      closest = {
        id: 'construction-desk',
        type: 'desk',
        label: 'Break ground on new repository',
        actionId: 'create_repo',
      };
    }
  }

  // 3. Ferry boat docks
  if (world.boat) {
    const dTown = Math.hypot(px - world.boat.dockTown.x, py - world.boat.dockTown.y);
    const dConst = Math.hypot(px - world.boat.dockConstruction.x, py - world.boat.dockConstruction.y);
    if (dTown < minDist) {
      minDist = dTown;
      closest = {
        id: 'boat-town',
        type: 'boat',
        label: 'Board ferry to construction works',
        actionId: 'board_boat',
      };
    } else if (dConst < minDist) {
      minDist = dConst;
      closest = {
        id: 'boat-const',
        type: 'boat',
        label: 'Board ferry to town',
        actionId: 'board_boat',
      };
    }
  }

  // 4. Public World Gate
  if (world.publicRoad) {
    const gate = world.publicRoad.gatePoint;
    const dist = Math.hypot(px - gate.x, py - gate.y);
    if (dist < minDist) {
      minDist = dist;
      closest = {
        id: 'public-gate',
        type: 'gate',
        label: 'Journey to open source realm',
        actionId: 'public_gate',
      };
    }
  }

  return closest;
}

export interface InputVector {
  dx: number;
  dy: number;
}

/**
 * Step kinematic player state by delta-time.
 */
export function stepPlayerController(
  state: PlayerState,
  input: InputVector,
  dtSeconds: number,
  world: CityWorldModel
): PlayerState {
  if (state.movementState === 'boarding' || state.movementState === 'disabled') {
    return state;
  }

  let desiredDx = input.dx;
  let desiredDy = input.dy;

  // Click-to-move pathing toward destination if no direct keyboard input
  if (desiredDx === 0 && desiredDy === 0 && state.destination) {
    const toDestX = state.destination.x - state.position.x;
    const toDestY = state.destination.y - state.position.y;
    const dist = Math.hypot(toDestX, toDestY);

    if (dist > 8) {
      desiredDx = toDestX / dist;
      desiredDy = toDestY / dist;
    } else {
      state.destination = null;
    }
  }

  // Normalize input vector so diagonal movement isn't faster
  const inputLen = Math.hypot(desiredDx, desiredDy);
  let targetVx = 0;
  let targetVy = 0;

  if (inputLen > 0.01) {
    const normX = desiredDx / inputLen;
    const normY = desiredDy / inputLen;
    targetVx = normX * PLAYER_CONFIG.maxSpeed;
    targetVy = normY * PLAYER_CONFIG.maxSpeed;
    state.facing = { x: normX, y: normY };
  }

  // Kinematic acceleration / deceleration
  const accel = inputLen > 0.01 ? PLAYER_CONFIG.acceleration : PLAYER_CONFIG.deceleration;
  const currentVx = state.velocity.x;
  const currentVy = state.velocity.y;

  const diffX = targetVx - currentVx;
  const diffY = targetVy - currentVy;
  const maxDelta = accel * dtSeconds;

  const newVx = Math.abs(diffX) <= maxDelta ? targetVx : currentVx + Math.sign(diffX) * maxDelta;
  const newVy = Math.abs(diffY) <= maxDelta ? targetVy : currentVy + Math.sign(diffY) * maxDelta;

  const speed = Math.hypot(newVx, newVy);
  const isMoving = speed > 5;

  // Compute prospective position
  const prospectiveX = state.position.x + newVx * dtSeconds;
  const prospectiveY = state.position.y + newVy * dtSeconds;

  // Collision resolution with wall sliding
  const resolvedPos = isMoving
    ? resolveMovement(state.position, { x: prospectiveX, y: prospectiveY }, PLAYER_CONFIG.collisionRadius, world)
    : state.position;

  // Walk phase animation counter
  let newWalkPhase = state.walkPhase;
  if (isMoving) {
    newWalkPhase += dtSeconds * (speed / 32);
  } else {
    newWalkPhase += dtSeconds * 1.2; // idle breathing
  }

  // Update proximity to interactable objects
  const activeInteraction = checkInteractionProximity(resolvedPos.x, resolvedPos.y, world);

  // Update safe position if not colliding
  const lastSafePosition =
    !checkBuildingCollision(resolvedPos.x, resolvedPos.y, PLAYER_CONFIG.collisionRadius, world.buildings).collides
      ? resolvedPos
      : state.lastSafePosition;

  return {
    ...state,
    position: resolvedPos,
    velocity: { x: newVx, y: newVy },
    movementState: isMoving ? 'walking' : 'idle',
    activeInteraction,
    lastSafePosition,
    walkPhase: newWalkPhase,
  };
}
