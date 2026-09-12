import type { CameraState } from './camera';
import { worldToScreen } from './camera';
import type {
  TrendingStorefrontBuilding,
} from '../world/trendingTypes';

/**
 * Draws the cyber-western Trending Street Entrance Archway
 * "TRENDING STREET / Where the hot repos roll in"
 */
export function drawTrendingStreetEntranceArch(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  entrance: { x: number; y: number },
  isNear: boolean,
  timeMs: number
) {
  const p = worldToScreen(cam, vw, vh, entrance.x, entrance.y);
  const w = 90 * cam.zoom;
  const h = 85 * cam.zoom;

  ctx.save();

  // 1. Ground Shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 4 * cam.zoom, w * 0.7, 14 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // 2. Weathered Timber Archway Posts (Wild West)
  ctx.fillStyle = '#3a271d'; // Dark timber
  // Left post
  ctx.fillRect(p.x - w / 2, p.y - h, 10 * cam.zoom, h);
  // Right post
  ctx.fillRect(p.x + w / 2 - 10 * cam.zoom, p.y - h, 10 * cam.zoom, h);
  // Crossbeam
  ctx.fillStyle = '#4a3325';
  ctx.fillRect(p.x - w / 2 - 6 * cam.zoom, p.y - h - 2 * cam.zoom, w + 12 * cam.zoom, 14 * cam.zoom);

  // 3. Electric Cyberpunk Neon Sign Board
  const flicker = 0.85 + Math.sin(timeMs * 0.008) * 0.15;
  const signW = w + 20 * cam.zoom;
  const signH = 26 * cam.zoom;
  const signY = p.y - h - 28 * cam.zoom;

  // Sign backing (weathered dark plaque with metallic bracket)
  ctx.fillStyle = '#181424';
  ctx.fillRect(p.x - signW / 2, signY, signW, signH);
  ctx.strokeStyle = `rgba(244, 63, 94, ${flicker})`;
  ctx.lineWidth = 1.8 * cam.zoom;
  ctx.strokeRect(p.x - signW / 2, signY, signW, signH);

  // Neon Ambient Glow
  const glow = ctx.createRadialGradient(p.x, signY + signH / 2, 2, p.x, signY + signH / 2, signW * 0.6);
  glow.addColorStop(0, `rgba(244, 63, 94, ${0.4 * flicker})`);
  glow.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(p.x - signW, signY - signH, signW * 2, signH * 3);

  // Neon Headline Text
  ctx.font = `800 ${Math.max(10, Math.round(11 * cam.zoom))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe4e6';
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 8 * cam.zoom * flicker;
  ctx.fillText('TRENDING STREET', p.x, signY + 9 * cam.zoom);

  // Cyber Subtitle
  ctx.font = `600 ${Math.max(8, Math.round(8 * cam.zoom))}px Inter, sans-serif`;
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 6 * cam.zoom;
  ctx.fillText('Where the hot repos roll in', p.x, signY + 19 * cam.zoom);
  ctx.shadowBlur = 0;

  // 4. Floating Interaction Prompt if nearby
  if (isNear) {
    const promptY = signY - 24 * cam.zoom;
    ctx.font = '700 11px Inter, sans-serif';
    const label = 'Enter Trending Street';
    const txtW = ctx.measureText(label).width;

    ctx.fillStyle = 'rgba(20, 18, 36, 0.94)';
    ctx.beginPath();
    ctx.roundRect(p.x - txtW / 2 - 16, promptY - 12, txtW + 32, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.fillText('[E] ' + label, p.x, promptY);
  }

  ctx.restore();
}

/**
 * Draws a Cyber-Western Storefront Building (Saloon / Cantina / General Store / Blacksmith)
 */
export function drawTrendingStorefront(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  building: TrendingStorefrontBuilding,
  isHovered: boolean,
  isSelected: boolean,
  _timeMs: number
) {
  const p = worldToScreen(cam, vw, vh, building.x, building.y);
  const bw = building.width * cam.zoom;
  const bh = building.height * cam.zoom;

  ctx.save();

  // 1. Ground Shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + bh * 0.48, bw * 0.58, 12 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fill();

  // 2. Weathered Timber Facade
  const facadeColors = {
    saloon: '#422a1d',
    general_store: '#3b2f28',
    blacksmith_lab: '#272535',
    outpost_post: '#403328',
    cantina: '#4a241b',
    bank_vault: '#232938',
    theater_hall: '#341f2e',
  };
  ctx.fillStyle = facadeColors[building.manifest.storefrontType] || '#3a271d';
  ctx.fillRect(p.x - bw / 2, p.y - bh / 2, bw, bh);

  // Horizontal wood siding planks
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  const plankCount = 6;
  for (let i = 1; i < plankCount; i++) {
    const yOff = p.y - bh / 2 + (bh / plankCount) * i;
    ctx.beginPath();
    ctx.moveTo(p.x - bw / 2, yOff);
    ctx.lineTo(p.x + bw / 2, yOff);
    ctx.stroke();
  }

  // 3. Saloon Porch / Boardwalk Overhang
  if (building.hasPorch) {
    const porchY = p.y + bh / 2 - 14 * cam.zoom;
    ctx.fillStyle = '#261b14';
    ctx.fillRect(p.x - bw / 2 - 4 * cam.zoom, porchY, bw + 8 * cam.zoom, 14 * cam.zoom);

    // Porch posts
    ctx.fillStyle = '#543b2b';
    ctx.fillRect(p.x - bw / 2, p.y - bh / 2 + 10 * cam.zoom, 3 * cam.zoom, bh - 10 * cam.zoom);
    ctx.fillRect(p.x + bw / 2 - 3 * cam.zoom, p.y - bh / 2 + 10 * cam.zoom, 3 * cam.zoom, bh - 10 * cam.zoom);
  }

  // 4. Windows with warm amber/neon interior light
  const winGlow = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 20 * cam.zoom);
  winGlow.addColorStop(0, 'rgba(253, 224, 71, 0.85)');
  winGlow.addColorStop(1, 'rgba(217, 128, 95, 0.2)');
  ctx.fillStyle = winGlow;
  // Left window
  ctx.fillRect(p.x - bw * 0.35, p.y - bh * 0.15, 12 * cam.zoom, 16 * cam.zoom);
  // Right window
  ctx.fillRect(p.x + bw * 0.35 - 12 * cam.zoom, p.y - bh * 0.15, 12 * cam.zoom, 16 * cam.zoom);

  // 5. Holographic Wanted Poster ("WANTED: RISING CODE")
  if (building.hasWantedPoster) {
    const posterX = p.x - bw * 0.44;
    const posterY = p.y + 4 * cam.zoom;
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(posterX, posterY, 14 * cam.zoom, 18 * cam.zoom);
    ctx.fillStyle = '#1c1917';
    ctx.font = `700 ${Math.max(5, Math.round(5 * cam.zoom))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('WANTED', posterX + 7 * cam.zoom, posterY + 5 * cam.zoom);
    // Silhouette
    ctx.fillRect(posterX + 3 * cam.zoom, posterY + 7 * cam.zoom, 8 * cam.zoom, 6 * cam.zoom);
  }

  // 6. Cyberpunk Neon Roof Sign
  const neonColor = building.hologramColor || '#38bdf8';
  const signY = p.y - bh / 2 - 14 * cam.zoom;
  const signW = bw * 0.9;
  const signH = 16 * cam.zoom;

  // Sign backing
  ctx.fillStyle = '#12101e';
  ctx.fillRect(p.x - signW / 2, signY, signW, signH);
  ctx.strokeStyle = isSelected ? '#38bdf8' : isHovered ? '#fde047' : neonColor;
  ctx.lineWidth = isSelected ? 2.2 : 1.4;
  ctx.strokeRect(p.x - signW / 2, signY, signW, signH);

  // Neon text
  ctx.font = `800 ${Math.max(9, Math.round(9.5 * cam.zoom))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = neonColor;
  ctx.shadowBlur = (isHovered || isSelected ? 12 : 6) * cam.zoom;
  ctx.fillText(building.signText.toUpperCase(), p.x, signY + signH / 2);
  ctx.shadowBlur = 0;

  // 7. Stat Pill (Stars / Today's Growth)
  ctx.font = `600 ${Math.max(8, Math.round(8 * cam.zoom))}px Inter, sans-serif`;
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`★ ${(building.manifest.stars / 1000).toFixed(1)}k  +${building.manifest.starsToday ?? 120}`, p.x, p.y + bh / 2 + 10 * cam.zoom);

  // Highlight border if selected/hovered
  if (isSelected || isHovered) {
    ctx.strokeStyle = isSelected ? '#38bdf8' : '#fde047';
    ctx.lineWidth = 2 * cam.zoom;
    ctx.strokeRect(p.x - bw / 2 - 2, p.y - bh / 2 - 2, bw + 4, bh + 4);
  }

  ctx.restore();
}

/**
 * Draws the Featured Project Landmark Saloon (#1 trending repo)
 */
export function drawLandmarkPavilion(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  landmark: { x: number; y: number; featuredManifest: any },
  timeMs: number
) {
  const p = worldToScreen(cam, vw, vh, landmark.x, landmark.y);
  const w = 140 * cam.zoom;
  const h = 110 * cam.zoom;

  ctx.save();

  // Ground Shadow
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + h * 0.45, w * 0.65, 18 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();

  // Grand Two-Tier Saloon Palace
  ctx.fillStyle = '#2f1e16';
  ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);

  // Upper Balcony & Ornamental Frontier Cornice
  ctx.fillStyle = '#4a3325';
  ctx.fillRect(p.x - w / 2 - 6 * cam.zoom, p.y - h / 2 - 8 * cam.zoom, w + 12 * cam.zoom, 14 * cam.zoom);
  ctx.fillRect(p.x - w / 2 - 4 * cam.zoom, p.y - 10 * cam.zoom, w + 8 * cam.zoom, 10 * cam.zoom);

  // Golden Beacon Marquee: "#1 TRENDING CODEBASE"
  const pulse = 0.8 + Math.sin(timeMs * 0.005) * 0.2;
  const badgeY = p.y - h / 2 - 24 * cam.zoom;
  ctx.fillStyle = '#1c1a2e';
  ctx.fillRect(p.x - w * 0.45, badgeY, w * 0.9, 18 * cam.zoom);
  ctx.strokeStyle = `rgba(253, 224, 71, ${pulse})`;
  ctx.lineWidth = 2 * cam.zoom;
  ctx.strokeRect(p.x - w * 0.45, badgeY, w * 0.9, 18 * cam.zoom);

  ctx.font = `800 ${Math.max(10, Math.round(11 * cam.zoom))}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 10 * cam.zoom * pulse;
  ctx.fillText(`★ #1 ${landmark.featuredManifest.name.toUpperCase()}`, p.x, badgeY + 9 * cam.zoom);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/**
 * Draws Cyber-Western Boardwalks
 */
export function drawBoardwalk(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  boardwalk: { x: number; y: number; width: number; height: number }
) {
  const p = worldToScreen(cam, vw, vh, boardwalk.x, boardwalk.y);
  const w = boardwalk.width * cam.zoom;
  const h = boardwalk.height * cam.zoom;

  ctx.save();
  // Timber deck
  ctx.fillStyle = '#261b14';
  ctx.fillRect(p.x, p.y, w, h);

  // Neon electric strip along boardwalk curb
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y + h);
  ctx.lineTo(p.x + w, p.y + h);
  ctx.stroke();

  // Subtle plank lines
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 0.8;
  const plankSpacing = 16 * cam.zoom;
  for (let px = p.x; px < p.x + w; px += plankSpacing) {
    ctx.beginPath();
    ctx.moveTo(px, p.y);
    ctx.lineTo(px, p.y + h);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Cyber-Western Water Tower with Animated Neon Ticker
 */
export function drawCyberWaterTower(
  ctx: CanvasRenderingContext2D,
  cam: CameraState,
  vw: number,
  vh: number,
  tower: { x: number; y: number; tickerText: string },
  _timeMs: number
) {
  const p = worldToScreen(cam, vw, vh, tower.x, tower.y);
  const r = 26 * cam.zoom;
  const legH = 45 * cam.zoom;

  ctx.save();

  // Wooden stilts / legs
  ctx.strokeStyle = '#3e2d21';
  ctx.lineWidth = 2.4 * cam.zoom;
  // Left stilt
  ctx.beginPath();
  ctx.moveTo(p.x - r * 0.8, p.y + legH);
  ctx.lineTo(p.x - r * 0.4, p.y);
  ctx.stroke();
  // Right stilt
  ctx.beginPath();
  ctx.moveTo(p.x + r * 0.8, p.y + legH);
  ctx.lineTo(p.x + r * 0.4, p.y);
  ctx.stroke();
  // Cross bracing
  ctx.lineWidth = 1.2 * cam.zoom;
  ctx.beginPath();
  ctx.moveTo(p.x - r * 0.7, p.y + legH * 0.7);
  ctx.lineTo(p.x + r * 0.7, p.y + legH * 0.3);
  ctx.moveTo(p.x + r * 0.7, p.y + legH * 0.7);
  ctx.lineTo(p.x - r * 0.7, p.y + legH * 0.3);
  ctx.stroke();

  // Barrel Tank (Timber tank with metal hoops)
  ctx.fillStyle = '#4a3325';
  ctx.beginPath();
  ctx.arc(p.x, p.y - r * 0.2, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#231811';
  ctx.lineWidth = 2 * cam.zoom;
  ctx.stroke();

  // Animated Neon Ticker Band wrapping tank
  const tickerG = ctx.createLinearGradient(p.x - r, p.y, p.x + r, p.y);
  tickerG.addColorStop(0, '#f43f5e');
  tickerG.addColorStop(0.5, '#38bdf8');
  tickerG.addColorStop(1, '#fde047');

  ctx.strokeStyle = tickerG;
  ctx.lineWidth = 3.5 * cam.zoom;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - r * 0.2, r + 2 * cam.zoom, r * 0.45, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
