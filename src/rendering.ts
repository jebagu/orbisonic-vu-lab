import {
  ChannelDefinition,
  LayoutKind,
  MeterDesignSettings,
  RuntimeChannelLevel,
  clamp01,
  seededNoise,
} from "./model";

export type HitRegion = {
  channel: number;
  x: number;
  y: number;
  radius: number;
  rect?: DOMRect;
};

type Point = { x: number; y: number };

type MeterCell = {
  channel: ChannelDefinition;
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  shape: "square" | "hex" | "circle" | "bar";
  groupIndex: number;
};

export type RenderInput = {
  canvas: HTMLCanvasElement;
  settings: MeterDesignSettings;
  channels: ChannelDefinition[];
  levels: RuntimeChannelLevel[];
  selectedChannel?: number;
  hoverChannel?: number;
  timeSeconds: number;
};

export function renderMeters(input: RenderInput): HitRegion[] {
  const { canvas, settings, channels, levels, selectedChannel, hoverChannel, timeSeconds } = input;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  const size = { width: rect.width, height: rect.height };
  drawStage(ctx, settings, size.width, size.height);
  const cells = buildCells(settings.layout.kind, channels, settings, size.width, size.height);
  const levelMap = new Map(levels.map((level) => [level.channel, level]));

  if (settings.layout.showGroupGuides) {
    drawGuides(ctx, settings, channels, cells, timeSeconds);
  }

  if (settings.layout.kind === "subwaySphereMap") {
    drawSubwayRoutes(ctx, settings, cells, levelMap, timeSeconds);
  }

  if (settings.layout.kind === "orbitLanes") {
    drawOrbitLanes(ctx, settings, cells, levelMap, timeSeconds);
  }

  for (const cell of cells) {
    const level = levelMap.get(cell.channel.number);
    drawCell(ctx, settings, cell, level, timeSeconds, selectedChannel === cell.channel.number, hoverChannel === cell.channel.number);
  }

  if (settings.labels.groupLabels && settings.layout.showGroupGuides) {
    drawGroupLabels(ctx, settings, cells, channels);
  }

  ctx.restore();
  return cells.map((cell) => ({
    channel: cell.channel.number,
    x: cell.x,
    y: cell.y,
    radius: Math.max(cell.radius, cell.width / 2, cell.height / 2),
  }));
}

export function hitTest(regions: HitRegion[], x: number, y: number): number | undefined {
  let best: { channel: number; distance: number } | undefined;
  for (const region of regions) {
    const distance = Math.hypot(x - region.x, y - region.y);
    if (distance <= region.radius && (!best || distance < best.distance)) {
      best = { channel: region.channel, distance };
    }
  }
  return best?.channel;
}

export function drawMiniPreview(
  canvas: HTMLCanvasElement,
  settings: MeterDesignSettings,
  channels: ChannelDefinition[],
  levels: RuntimeChannelLevel[],
  timeSeconds: number
): void {
  renderMeters({ canvas, settings, channels, levels, timeSeconds });
}

function drawStage(ctx: CanvasRenderingContext2D, settings: MeterDesignSettings, width: number, height: number): void {
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, settings.colors.background);
  gradient.addColorStop(0.55, "#09171c");
  gradient.addColorStop(1, "#02070a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = "rgba(217, 251, 255, 0.045)";
  ctx.lineWidth = 1;
  const step = Math.max(24, Math.min(width, height) / 14);
  for (let x = step; x < width; x += step) {
    line(ctx, { x, y: 0 }, { x, y: height });
  }
  for (let y = step; y < height; y += step) {
    line(ctx, { x: 0, y }, { x: width, y });
  }
  ctx.restore();
}

function buildCells(kind: LayoutKind, channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  switch (kind) {
    case "adaptiveGrid":
      return squareCells(channels, settings, width, height);
    case "hexHive":
      return hexCells(channels, settings, width, height);
    case "sphereRings":
      return ringCells(channels, settings, width, height);
    case "subwaySphereMap":
      return subwayCells(channels, settings, width, height);
    case "spiralNumbering":
      return spiralCells(channels, settings, width, height);
    case "orbitLanes":
      return orbitCells(channels, settings, width, height);
    case "microBars":
      return barCells(channels, settings, width, height);
  }
}

function squareCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const count = channels.length;
  const padding = pad(settings, width, height);
  const targetAspect = width / Math.max(height, 1);
  let best = { columns: 1, rows: count, side: 1, gap: 1, score: -Infinity };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const gapRatio = count > 50 ? 0.11 : count > 20 ? 0.14 : 0.18;
    const side = Math.min(
      (width - padding * 2) / (columns + gapRatio * Math.max(columns - 1, 0)),
      (height - padding * 2) / (rows + gapRatio * Math.max(rows - 1, 0))
    );
    const aspectScore = Math.abs(Math.log(columns / rows / targetAspect));
    const score = side - aspectScore * 5;
    if (score > best.score) best = { columns, rows, side, gap: side * gapRatio, score };
  }
  const gridWidth = best.columns * best.side + Math.max(best.columns - 1, 0) * best.gap;
  const gridHeight = best.rows * best.side + Math.max(best.rows - 1, 0) * best.gap;
  const startX = (width - gridWidth) / 2;
  const startY = (height - gridHeight) / 2;
  return channels.map((channel, index) => {
    const column = index % best.columns;
    const row = Math.floor(index / best.columns);
    const x = startX + column * (best.side + best.gap) + best.side / 2;
    const y = startY + row * (best.side + best.gap) + best.side / 2;
    return cell(channel, x, y, best.side / 2, best.side, best.side, "square", groupIndex(settings, channel));
  });
}

function hexCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const count = channels.length;
  const padding = pad(settings, width, height);
  const sqrt3 = Math.sqrt(3);
  const gapRatio = count > 50 ? 0.12 : count > 20 ? 0.16 : 0.2;
  let best = { columns: 1, rows: count, radius: 1, score: -Infinity };
  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const widthFactor = columns * sqrt3 + Math.max(columns - 1, 0) * gapRatio + (rows > 1 ? sqrt3 / 2 : 0);
    const heightFactor = 2 + Math.max(rows - 1, 0) * (1.5 + gapRatio);
    const radius = Math.min((width - padding * 2) / widthFactor, (height - padding * 2) / heightFactor);
    const usedWidth = radius * widthFactor;
    const usedHeight = radius * heightFactor;
    const score = radius - Math.abs(Math.log(usedWidth / Math.max(usedHeight, 1) / (width / Math.max(height, 1)))) * 4;
    if (score > best.score) best = { columns, rows, radius, score };
  }
  const gap = best.radius * gapRatio;
  const hexWidth = sqrt3 * best.radius;
  const stepX = hexWidth + gap;
  const stepY = best.radius * 1.5 + gap;
  const usedWidth = best.columns * hexWidth + Math.max(best.columns - 1, 0) * gap + (best.rows > 1 ? hexWidth / 2 : 0);
  const usedHeight = best.radius * 2 + Math.max(best.rows - 1, 0) * stepY;
  const startX = (width - usedWidth) / 2 + hexWidth / 2;
  const startY = (height - usedHeight) / 2 + best.radius;
  return channels.map((channel, index) => {
    const column = index % best.columns;
    const row = Math.floor(index / best.columns);
    const x = startX + column * stepX + (row % 2 === 0 ? 0 : hexWidth / 2);
    const y = startY + row * stepY;
    return cell(channel, x, y, best.radius, best.radius * 2, best.radius * 2, "hex", groupIndex(settings, channel));
  });
}

function ringCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const center = { x: width / 2, y: height / 2 };
  const maxR = Math.min(width, height) * 0.42;
  const rings = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(channels.length / 2))));
  const lfe = channels.filter((channel) => channel.isLfe);
  const normal = channels.filter((channel) => !channel.isLfe);
  const byRing = Array.from({ length: rings }, () => [] as ChannelDefinition[]);
  normal.forEach((channel, index) => byRing[index % rings].push(channel));
  const cells: MeterCell[] = [];
  byRing.forEach((items, ring) => {
    const radius = maxR * ((ring + 1) / rings);
    const cellRadius = Math.max(9, Math.min(34, (Math.PI * radius) / Math.max(items.length, 1) * 0.42));
    items.forEach((channel, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(items.length, 1)) * Math.PI * 2 + ring * 0.33;
      cells.push(cell(channel, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, cellRadius, cellRadius * 2, cellRadius * 2, "circle", groupIndex(settings, channel)));
    });
  });
  lfe.forEach((channel, index) => {
    cells.push(cell(channel, center.x + (index - (lfe.length - 1) / 2) * 52, height - pad(settings, width, height) * 1.35, 19, 38, 38, "circle", groupIndex(settings, channel)));
  });
  return cells;
}

function subwayCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const padding = pad(settings, width, height);
  const groups = settings.groups.length ? settings.groups : [{ id: "all", name: "All", color: settings.colors.low, channels: channels.map((channel) => channel.number) }];
  const cells: MeterCell[] = [];
  const railCount = groups.length;
  groups.forEach((group, groupIdx) => {
    const groupChannels = channels.filter((channel) => group.channels.includes(channel.number));
    const y = padding + (groupIdx + 0.6) * ((height - padding * 2) / Math.max(railCount, 1));
    const laneWave = Math.sin(groupIdx * 1.41) * 18;
    groupChannels.forEach((channel, index) => {
      const t = groupChannels.length <= 1 ? 0.5 : index / (groupChannels.length - 1);
      const x = padding + t * (width - padding * 2);
      const arc = Math.sin(t * Math.PI) * laneWave;
      const radius = Math.max(11, Math.min(21, (width - padding * 2) / Math.max(groupChannels.length, 1) * 0.18));
      cells.push(cell(channel, x, y + arc, radius, radius * 2, radius * 2, "circle", groupIdx));
    });
  });
  return cells.length ? cells : squareCells(channels, settings, width, height);
}

function spiralCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const center = { x: width / 2, y: height / 2 };
  const maxR = Math.min(width, height) * 0.43;
  return channels.map((channel, index) => {
    const t = channels.length <= 1 ? 0 : index / (channels.length - 1);
    const angle = t * Math.PI * 8.2 - Math.PI / 2;
    const radius = maxR * Math.sqrt(t);
    const cellRadius = Math.max(9, Math.min(22, maxR / Math.sqrt(channels.length) * 0.78));
    return cell(channel, center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, cellRadius, cellRadius * 2, cellRadius * 2, "circle", groupIndex(settings, channel));
  });
}

function orbitCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const lanes = Math.min(6, Math.max(2, Math.ceil(channels.length / 12)));
  const byLane = Array.from({ length: lanes }, () => [] as ChannelDefinition[]);
  channels.forEach((channel, index) => byLane[index % lanes].push(channel));
  const cells: MeterCell[] = [];
  byLane.forEach((items, lane) => {
    const rx = width * (0.28 + lane * 0.055);
    const ry = height * (0.15 + lane * 0.04);
    const rotation = lane * 0.42;
    const radius = Math.max(10, Math.min(20, Math.min(width, height) / 28));
    items.forEach((channel, index) => {
      const angle = (index / Math.max(items.length, 1)) * Math.PI * 2 + lane * 0.54;
      const p = rotate(Math.cos(angle) * rx, Math.sin(angle) * ry, rotation);
      cells.push(cell(channel, width / 2 + p.x, height / 2 + p.y, radius, radius * 2, radius * 2, "circle", groupIndex(settings, channel)));
    });
  });
  return cells;
}

function barCells(channels: ChannelDefinition[], settings: MeterDesignSettings, width: number, height: number): MeterCell[] {
  const padding = pad(settings, width, height);
  const count = channels.length;
  const gap = count > 48 ? 3 : count > 24 ? 5 : 8;
  const barWidth = Math.max(6, Math.min(24, (width - padding * 2 - gap * (count - 1)) / count));
  return channels.map((channel, index) => {
    const x = padding + barWidth / 2 + index * (barWidth + gap);
    return cell(channel, x, height / 2, Math.max(8, barWidth / 2), barWidth, height - padding * 2, "bar", groupIndex(settings, channel));
  });
}

function drawGuides(ctx: CanvasRenderingContext2D, settings: MeterDesignSettings, channels: ChannelDefinition[], cells: MeterCell[], time: number): void {
  if (settings.layout.kind === "sphereRings" || settings.layout.kind === "orbitLanes" || settings.layout.kind === "spiralNumbering") {
    ctx.save();
    ctx.strokeStyle = settings.colors.line;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    const center = centroid(cells);
    const maxR = Math.max(...cells.map((item) => Math.hypot(item.x - center.x, item.y - center.y)), 10);
    for (let ring = 1; ring <= 4; ring += 1) {
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, (maxR * ring) / 4, (maxR * ring) / 4 * 0.68, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (settings.layout.kind === "adaptiveGrid" || settings.layout.kind === "hexHive") {
    ctx.save();
    ctx.strokeStyle = "rgba(217, 251, 255, 0.09)";
    ctx.lineWidth = 1;
    for (const group of settings.groups) {
      const groupCells = cells.filter((cell) => group.channels.includes(cell.channel.number));
      if (groupCells.length < 2) continue;
      const box = bounds(groupCells);
      ctx.strokeStyle = withAlpha(group.color, 0.18 + 0.04 * Math.sin(time + group.channels.length));
      roundRect(ctx, box.x - 7, box.y - 7, box.width + 14, box.height + 14, 10);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawSubwayRoutes(
  ctx: CanvasRenderingContext2D,
  settings: MeterDesignSettings,
  cells: MeterCell[],
  levelMap: Map<number, RuntimeChannelLevel>,
  time: number
): void {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const group of settings.groups) {
    const groupCells = cells.filter((cell) => group.channels.includes(cell.channel.number)).sort((a, b) => a.x - b.x);
    if (groupCells.length < 2) continue;
    const energy = groupCells.reduce((sum, cell) => sum + (levelMap.get(cell.channel.number)?.normalizedLevel ?? 0), 0) / groupCells.length;
    ctx.strokeStyle = withAlpha(group.color, 0.24 + energy * 0.46);
    ctx.lineWidth = 5 + energy * 5;
    ctx.beginPath();
    groupCells.forEach((cell, index) => {
      if (index === 0) ctx.moveTo(cell.x, cell.y);
      else {
        const previous = groupCells[index - 1];
        const midpoint = (previous.x + cell.x) / 2;
        ctx.bezierCurveTo(midpoint, previous.y, midpoint, cell.y, cell.x, cell.y);
      }
    });
    ctx.stroke();

    const packetCount = Math.max(1, Math.floor(groupCells.length / 3));
    for (let packet = 0; packet < packetCount; packet += 1) {
      const t = ((time * settings.motion.speed * 0.22 + packet / packetCount + groupCells.length * 0.017) % 1 + 1) % 1;
      const point = pointAlongPolyline(groupCells, t);
      ctx.fillStyle = withAlpha(group.color, 0.24 + energy * 0.62);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4 + energy * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawOrbitLanes(
  ctx: CanvasRenderingContext2D,
  settings: MeterDesignSettings,
  cells: MeterCell[],
  levelMap: Map<number, RuntimeChannelLevel>,
  time: number
): void {
  const laneGroups = new Map<number, MeterCell[]>();
  cells.forEach((cell) => {
    laneGroups.set(cell.groupIndex, [...(laneGroups.get(cell.groupIndex) ?? []), cell]);
  });
  ctx.save();
  ctx.lineWidth = 1.2;
  for (const [lane, laneCells] of laneGroups) {
    if (!laneCells.length) continue;
    const center = centroid(laneCells);
    const rx = Math.max(...laneCells.map((cell) => Math.abs(cell.x - center.x))) + 18;
    const ry = Math.max(...laneCells.map((cell) => Math.abs(cell.y - center.y))) + 18;
    const energy = laneCells.reduce((sum, cell) => sum + (levelMap.get(cell.channel.number)?.normalizedLevel ?? 0), 0) / laneCells.length;
    ctx.strokeStyle = withAlpha(laneCells[0].channel.groupColor, 0.12 + energy * 0.34);
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, rx, ry, lane * 0.11, 0, Math.PI * 2);
    ctx.stroke();
    const cometAngle = time * settings.motion.speed * (0.7 + energy) + lane;
    const p = rotate(Math.cos(cometAngle) * rx, Math.sin(cometAngle) * ry, lane * 0.11);
    ctx.fillStyle = withAlpha(laneCells[0].channel.groupColor, 0.12 + energy * 0.7);
    ctx.beginPath();
    ctx.arc(center.x + p.x, center.y + p.y, 5 + energy * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  settings: MeterDesignSettings,
  cell: MeterCell,
  level: RuntimeChannelLevel | undefined,
  time: number,
  selected: boolean,
  hovered: boolean
): void {
  const normalized = clamp01(level?.normalizedLevel ?? 0);
  const peak = clamp01(level?.peakHold ?? normalized);
  const stateColor = colorForLevel(settings, normalized, cell.channel.groupColor);
  const shellColor = normalized >= settings.thresholds.clip ? settings.colors.clip : selected || hovered ? cell.channel.groupColor : settings.colors.line;

  ctx.save();
  ctx.lineWidth = selected || hovered ? 2 : 1;
  ctx.strokeStyle = withAlpha(shellColor, selected || hovered ? 0.9 : 0.6);
  ctx.fillStyle = "rgba(255,255,255,0.035)";

  if (cell.shape === "square") {
    roundRect(ctx, cell.x - cell.width / 2, cell.y - cell.height / 2, cell.width, cell.height, Math.max(3, cell.width * 0.06));
    ctx.fill();
    ctx.stroke();
    drawSquareMotion(ctx, settings, cell, normalized, peak, stateColor, time);
  } else if (cell.shape === "hex") {
    pathHex(ctx, cell.x, cell.y, cell.radius);
    ctx.fill();
    ctx.stroke();
    drawHexMotion(ctx, settings, cell, normalized, stateColor, time);
  } else if (cell.shape === "bar") {
    const x = cell.x - cell.width / 2;
    const y = cell.y - cell.height / 2;
    roundRect(ctx, x, y, cell.width, cell.height, Math.max(2, cell.width * 0.35));
    ctx.fill();
    ctx.stroke();
    const fillHeight = Math.max(2, cell.height * normalized);
    ctx.fillStyle = withAlpha(stateColor, 0.24 + normalized * 0.72);
    roundRect(ctx, x, y + cell.height - fillHeight, cell.width, fillHeight, Math.max(2, cell.width * 0.35));
    ctx.fill();
    if (settings.rendering.showPeakHold) {
      ctx.fillStyle = withAlpha(settings.colors.hot, 0.82);
      ctx.fillRect(x - 1, y + cell.height - cell.height * peak, cell.width + 2, 2);
    }
  } else {
    drawCircleCell(ctx, settings, cell, normalized, peak, stateColor, time);
  }

  if (normalized >= settings.thresholds.clip) {
    ctx.strokeStyle = withAlpha(settings.colors.clip, 0.86);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.radius + 4 + Math.sin(time * 12) * 1.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawLabel(ctx, settings, cell, normalized, selected || hovered);
  ctx.restore();
}

function drawSquareMotion(
  ctx: CanvasRenderingContext2D,
  settings: MeterDesignSettings,
  cell: MeterCell,
  level: number,
  peak: number,
  color: string,
  time: number
): void {
  const inner = cell.width * (0.1 + level * 0.72);
  const pulse = 0.9 + Math.sin(time * 5.2 + cell.channel.number) * 0.1 * settings.motion.intensity;
  if (settings.motion.kind === "flickerPixels") {
    drawFlicker(ctx, settings, cell, level, color, time, "square");
  } else {
    ctx.fillStyle = withAlpha(color, 0.22 + level * 0.7);
    roundRect(ctx, cell.x - (inner * pulse) / 2, cell.y - (inner * pulse) / 2, inner * pulse, inner * pulse, Math.max(2, inner * 0.08));
    ctx.fill();
  }
  if (settings.rendering.showPeakHold) {
    ctx.strokeStyle = withAlpha(settings.colors.hot, 0.4 + peak * 0.36);
    ctx.lineWidth = 1;
    const peakSize = cell.width * (0.12 + peak * 0.78);
    roundRect(ctx, cell.x - peakSize / 2, cell.y - peakSize / 2, peakSize, peakSize, Math.max(2, peakSize * 0.08));
    ctx.stroke();
  }
}

function drawHexMotion(ctx: CanvasRenderingContext2D, settings: MeterDesignSettings, cell: MeterCell, level: number, color: string, time: number): void {
  if (settings.motion.kind === "flickerPixels" || settings.motion.kind === "ripple") {
    drawFlicker(ctx, settings, cell, level, color, time, "hex");
    return;
  }
  const inner = cell.radius * (0.16 + level * 0.7);
  ctx.fillStyle = withAlpha(color, 0.22 + level * 0.7);
  pathHex(ctx, cell.x, cell.y, inner);
  ctx.fill();
}

function drawCircleCell(
  ctx: CanvasRenderingContext2D,
  settings: MeterDesignSettings,
  cell: MeterCell,
  level: number,
  peak: number,
  color: string,
  time: number
): void {
  ctx.beginPath();
  ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const motionBoost = settings.motion.kind === "breathingField" ? 1 + Math.sin(time * 2.4 + cell.groupIndex) * 0.09 : 1;
  const radius = cell.radius * (0.18 + level * 0.78) * motionBoost;
  ctx.fillStyle = withAlpha(color, 0.22 + level * 0.7);
  ctx.beginPath();
  ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (settings.motion.kind === "ripple" || settings.motion.kind === "railGlow") {
    ctx.strokeStyle = withAlpha(color, 0.08 + level * 0.42);
    ctx.lineWidth = 1.4;
    const ripple = cell.radius * (1.2 + ((time * settings.motion.speed + cell.channel.number * 0.07) % 1) * 1.2);
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, ripple, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (settings.rendering.showPeakHold && settings.motion.kind === "peakHoldTick") {
    const angle = -Math.PI / 2 + peak * Math.PI * 2;
    ctx.strokeStyle = withAlpha(settings.colors.hot, 0.76);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cell.x, cell.y, cell.radius + 3, angle - 0.14, angle + 0.14);
    ctx.stroke();
  }
}

function drawFlicker(
  ctx: CanvasRenderingContext2D,
  settings: MeterDesignSettings,
  cell: MeterCell,
  level: number,
  color: string,
  time: number,
  mask: "square" | "hex"
): void {
  const energy = Math.pow(level, 1.35);
  const block = Math.max(2, Math.floor(cell.radius / (energy > 0.55 ? 4.2 : 5.4)));
  const count = Math.max(1, Math.floor(2 + energy * Math.min(32, cell.radius * 1.8)));
  const maxRadius = cell.radius * 0.84;
  ctx.save();
  if (mask === "hex") {
    pathHex(ctx, cell.x, cell.y, maxRadius);
  } else {
    roundRect(ctx, cell.x - maxRadius, cell.y - maxRadius, maxRadius * 2, maxRadius * 2, Math.max(2, block));
  }
  ctx.clip();
  ctx.fillStyle = withAlpha(color, 0.08 + energy * 0.28);
  const core = maxRadius * (0.2 + level * 0.72);
  if (mask === "hex") pathHex(ctx, cell.x, cell.y, core);
  else roundRect(ctx, cell.x - core, cell.y - core, core * 2, core * 2, Math.max(2, block));
  ctx.fill();

  const frame = Math.floor(time * (0.35 + energy * 16));
  for (let pixel = 0; pixel < count; pixel += 1) {
    const seed = seededNoise(cell.channel.number * 31.7 + frame, pixel * 13.1);
    const angle = seededNoise(seed * 19, pixel) * Math.PI * 2;
    const r = Math.sqrt(seededNoise(seed * 113, frame + pixel)) * maxRadius;
    const x = Math.floor((cell.x + Math.cos(angle) * r) / block) * block;
    const y = Math.floor((cell.y + Math.sin(angle) * r) / block) * block;
    ctx.fillStyle = withAlpha(pixelColor(settings, level, seed, color), 0.14 + level * 0.68);
    ctx.fillRect(x, y, block, block);
  }
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, settings: MeterDesignSettings, cell: MeterCell, level: number, emphasis: boolean): void {
  if (!settings.labels.showInline && !emphasis) return;
  const available = Math.max(cell.width, cell.height, cell.radius * 2);
  if (!emphasis && available < settings.labels.minInlineCellSize) return;
  const text = cell.channel.label;
  const fontSize = Math.max(8, Math.min(emphasis ? 13 : 11, available * 0.17));
  ctx.save();
  ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = level >= 0.58 ? "rgba(7,16,20,0.86)" : "rgba(239,252,255,0.78)";
  if (cell.shape === "bar") {
    ctx.translate(cell.x, cell.y + cell.height / 2 + 16);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = "rgba(159,185,189,0.82)";
    ctx.fillText(text, 0, 0);
  } else {
    ctx.fillText(text, cell.x, cell.y);
  }
  ctx.restore();
}

function drawGroupLabels(ctx: CanvasRenderingContext2D, settings: MeterDesignSettings, cells: MeterCell[], channels: ChannelDefinition[]): void {
  ctx.save();
  ctx.font = "700 10px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (const group of settings.groups) {
    const groupCells = cells.filter((cell) => group.channels.includes(cell.channel.number));
    if (!groupCells.length) continue;
    const box = bounds(groupCells);
    const label = channels.find((channel) => channel.groupId === group.id)?.groupName ?? group.name;
    ctx.fillStyle = withAlpha(group.color, 0.86);
    ctx.fillText(label.toUpperCase(), box.x, Math.max(14, box.y - 11));
  }
  ctx.restore();
}

function cell(
  channel: ChannelDefinition,
  x: number,
  y: number,
  radius: number,
  width: number,
  height: number,
  shape: MeterCell["shape"],
  groupIndex: number
): MeterCell {
  return { channel, x, y, radius, width, height, shape, groupIndex };
}

function colorForLevel(settings: MeterDesignSettings, level: number, groupColor: string): string {
  if (level >= settings.thresholds.clip) return settings.colors.clip;
  if (level >= settings.thresholds.hot) return settings.colors.hot;
  if (level >= 0.34) return settings.colors.mid;
  if (level >= settings.thresholds.active) return groupColor || settings.colors.low;
  return settings.colors.muted;
}

function pixelColor(settings: MeterDesignSettings, level: number, seed: number, fallback: string): string {
  if (level >= settings.thresholds.clip && seed > 0.35) return settings.colors.clip;
  if (level >= settings.thresholds.hot && seed > 0.22) return settings.colors.hot;
  if (level > 0.5 && seed > 0.82) return "#f472b6";
  if (level > 0.34 && seed > 0.18) return settings.colors.mid;
  return fallback;
}

function drawGroupConnector(ctx: CanvasRenderingContext2D, groupCells: MeterCell[]): void {
  groupCells.forEach((cell, index) => {
    if (index === 0) ctx.moveTo(cell.x, cell.y);
    else ctx.lineTo(cell.x, cell.y);
  });
}

function pointAlongPolyline(cells: MeterCell[], t: number): Point {
  if (cells.length === 0) return { x: 0, y: 0 };
  if (cells.length === 1) return { x: cells[0].x, y: cells[0].y };
  const scaled = clamp01(t) * (cells.length - 1);
  const index = Math.min(cells.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const a = cells[index];
  const b = cells[index + 1];
  return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
}

function groupIndex(settings: MeterDesignSettings, channel: ChannelDefinition): number {
  return Math.max(
    0,
    settings.groups.findIndex((group) => group.id === channel.groupId)
  );
}

function pad(settings: MeterDesignSettings, width: number, height: number): number {
  const densityFactor = settings.layout.density === "compact" ? 0.045 : settings.layout.density === "open" ? 0.09 : 0.065;
  return Math.max(14, Math.min(width, height) * densityFactor);
}

function rotate(x: number, y: number, angle: number): Point {
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
  };
}

function centroid(cells: MeterCell[]): Point {
  if (!cells.length) return { x: 0, y: 0 };
  return {
    x: cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length,
    y: cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length,
  };
}

function bounds(cells: MeterCell[]): { x: number; y: number; width: number; height: number } {
  const left = Math.min(...cells.map((cell) => cell.x - cell.width / 2));
  const right = Math.max(...cells.map((cell) => cell.x + cell.width / 2));
  const top = Math.min(...cells.map((cell) => cell.y - cell.height / 2));
  const bottom = Math.max(...cells.map((cell) => cell.y + cell.height / 2));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function pathHex(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let index = 0; index < 6; index += 1) {
    const angle = -Math.PI / 2 + index * (Math.PI / 3);
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, a: Point, b: Point): void {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const value = color.slice(1);
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clamp01(alpha)})`;
  }
  return color;
}
