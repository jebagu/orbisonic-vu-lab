export const schemaName = "orbisonic.vuMeterDesign";

export type ChannelPresetId =
  | "mono"
  | "stereo"
  | "quad"
  | "fiveOne"
  | "sevenOne"
  | "sevenOneFour"
  | "nineOneSix"
  | "sonicSphere30Point1"
  | "discrete64"
  | "custom";

export type LayoutKind =
  | "adaptiveGrid"
  | "hexHive"
  | "sphereRings"
  | "subwaySphereMap"
  | "spiralNumbering"
  | "orbitLanes"
  | "microBars";

export type MotionKind =
  | "solidPulse"
  | "flickerPixels"
  | "ripple"
  | "railGlow"
  | "signalTrain"
  | "breathingField"
  | "cometOrbit"
  | "peakHoldTick";

export type LabelMode = "auto" | "numbers" | "shortRoles" | "longRoles" | "sphereOutputs" | "custom";
export type SimulationMode =
  | "pinkNoise"
  | "channelWalk"
  | "groupSweep"
  | "hotFault"
  | "clipFault"
  | "sparseAmbience"
  | "stress"
  | "rendererSpread";

export type Density = "open" | "balanced" | "compact";

export type ChannelGroup = {
  id: string;
  name: string;
  channels: number[];
  color: string;
};

export type Thresholds = {
  active: number;
  hot: number;
  clip: number;
};

export type MeterDesignSettings = {
  schema: typeof schemaName;
  version: 1;
  name: string;
  channelCount: number;
  channelPreset: ChannelPresetId;
  layout: {
    kind: LayoutKind;
    density: Density;
    showGroupGuides: boolean;
    smallPanelPreview: boolean;
    operatorView: boolean;
  };
  labels: {
    mode: LabelMode;
    showInline: boolean;
    minInlineCellSize: number;
    showOnHover: boolean;
    groupLabels: boolean;
    density: Density;
    overrides: Array<{ channel: number; label: string; longLabel?: string; group?: string }>;
  };
  groups: ChannelGroup[];
  colors: {
    background: string;
    panel: string;
    line: string;
    low: string;
    mid: string;
    hot: string;
    clip: string;
    muted: string;
  };
  motion: {
    kind: MotionKind;
    speed: number;
    intensity: number;
    decay: number;
    noise: number;
    peakHoldMs: number;
    clipLatchMs: number;
    phaseMode: "perChannel" | "groupSynced";
    reducedMotion: boolean;
  };
  thresholds: Thresholds;
  rendering: {
    showSummaryPills: boolean;
    showPeakHold: boolean;
    pixelSnap: boolean;
  };
  metadata: {
    createdBy: "Orbisonic VU Lab";
    notes: string;
  };
};

export type ChannelDefinition = {
  number: number;
  role: string;
  label: string;
  longLabel: string;
  groupId: string;
  groupName: string;
  groupColor: string;
  isLfe: boolean;
};

export type RuntimeChannelLevel = {
  channel: number;
  normalizedLevel: number;
  peakHold: number;
  isClipping: boolean;
  isMuted: boolean;
};

export type PresetOption = {
  id: ChannelPresetId;
  label: string;
  count: number;
};

export const channelPresets: PresetOption[] = [
  { id: "mono", label: "1.0 Mono", count: 1 },
  { id: "stereo", label: "2.0 Stereo", count: 2 },
  { id: "quad", label: "4.0 Quad", count: 4 },
  { id: "fiveOne", label: "5.1", count: 6 },
  { id: "sevenOne", label: "7.1", count: 8 },
  { id: "sevenOneFour", label: "7.1.4", count: 12 },
  { id: "nineOneSix", label: "9.1.6", count: 16 },
  { id: "sonicSphere30Point1", label: "30.1 Sonic Sphere", count: 31 },
  { id: "discrete64", label: "64 Discrete", count: 64 },
  { id: "custom", label: "Custom", count: 32 },
];

export const layoutLabels: Record<LayoutKind, string> = {
  adaptiveGrid: "Adaptive Grid",
  hexHive: "Hex Hive",
  sphereRings: "Sphere Rings",
  subwaySphereMap: "Subway Sphere Map",
  spiralNumbering: "Spiral Numbering",
  orbitLanes: "Orbit Lanes",
  microBars: "Micro Bars",
};

export const motionLabels: Record<MotionKind, string> = {
  solidPulse: "Solid Pulse",
  flickerPixels: "Flicker Pixels",
  ripple: "Ripple",
  railGlow: "Rail Glow",
  signalTrain: "Signal Train",
  breathingField: "Breathing Field",
  cometOrbit: "Comet Orbit",
  peakHoldTick: "Peak Hold Tick",
};

export const simulationLabels: Record<SimulationMode, string> = {
  pinkNoise: "Pink Noise",
  channelWalk: "Channel Walk",
  groupSweep: "Group Sweep",
  hotFault: "Hot Fault",
  clipFault: "Clip Fault",
  sparseAmbience: "Sparse Ambience",
  stress: "Stress",
  rendererSpread: "Renderer Spread",
};

export const presetDesigns: Array<{ id: string; name: string; layout: LayoutKind; motion: MotionKind; preset: ChannelPresetId }> = [
  { id: "hex-flicker", name: "Orbisonic Hex Flicker", layout: "hexHive", motion: "flickerPixels", preset: "sonicSphere30Point1" },
  { id: "square-pulse", name: "Orbisonic Square Pulse", layout: "adaptiveGrid", motion: "solidPulse", preset: "sevenOneFour" },
  { id: "sphere-rings", name: "Sonic Sphere Rings", layout: "sphereRings", motion: "ripple", preset: "sonicSphere30Point1" },
  { id: "subway-map", name: "Subway Sphere Map", layout: "subwaySphereMap", motion: "railGlow", preset: "sonicSphere30Point1" },
  { id: "spiral-walk", name: "Spiral Channel Walk", layout: "spiralNumbering", motion: "signalTrain", preset: "discrete64" },
  { id: "micro-bars", name: "Dense Micro Bars", layout: "microBars", motion: "peakHoldTick", preset: "discrete64" },
  { id: "fault-finder", name: "Fault Finder", layout: "adaptiveGrid", motion: "solidPulse", preset: "discrete64" },
];

const groupColors = ["#5eead4", "#60a5fa", "#a78bfa", "#22d3ee", "#38bdf8", "#facc15", "#fb7185", "#34d399"];

const surroundRoles: Record<ChannelPresetId, Array<{ label: string; long: string; group: string; lfe?: boolean }>> = {
  mono: [{ label: "C", long: "Center", group: "front" }],
  stereo: [
    { label: "FL", long: "Front Left", group: "front" },
    { label: "FR", long: "Front Right", group: "front" },
  ],
  quad: [
    { label: "FL", long: "Front Left", group: "front" },
    { label: "FR", long: "Front Right", group: "front" },
    { label: "RL", long: "Rear Left", group: "rear" },
    { label: "RR", long: "Rear Right", group: "rear" },
  ],
  fiveOne: [
    { label: "FL", long: "Front Left", group: "front" },
    { label: "FR", long: "Front Right", group: "front" },
    { label: "C", long: "Center", group: "front" },
    { label: "LFE", long: "Low Frequency Effects", group: "lfe", lfe: true },
    { label: "SL", long: "Side Left", group: "side" },
    { label: "SR", long: "Side Right", group: "side" },
  ],
  sevenOne: [
    { label: "FL", long: "Front Left", group: "front" },
    { label: "FR", long: "Front Right", group: "front" },
    { label: "C", long: "Center", group: "front" },
    { label: "LFE", long: "Low Frequency Effects", group: "lfe", lfe: true },
    { label: "SL", long: "Side Left", group: "side" },
    { label: "SR", long: "Side Right", group: "side" },
    { label: "RL", long: "Rear Left", group: "rear" },
    { label: "RR", long: "Rear Right", group: "rear" },
  ],
  sevenOneFour: [
    { label: "FL", long: "Front Left", group: "front" },
    { label: "FR", long: "Front Right", group: "front" },
    { label: "C", long: "Center", group: "front" },
    { label: "LFE", long: "Low Frequency Effects", group: "lfe", lfe: true },
    { label: "SL", long: "Side Left", group: "side" },
    { label: "SR", long: "Side Right", group: "side" },
    { label: "RL", long: "Rear Left", group: "rear" },
    { label: "RR", long: "Rear Right", group: "rear" },
    { label: "TFL", long: "Top Front Left", group: "upper" },
    { label: "TFR", long: "Top Front Right", group: "upper" },
    { label: "TRL", long: "Top Rear Left", group: "upper" },
    { label: "TRR", long: "Top Rear Right", group: "upper" },
  ],
  nineOneSix: [],
  sonicSphere30Point1: [],
  discrete64: [],
  custom: [],
};

surroundRoles.nineOneSix = [
  ...surroundRoles.sevenOne,
  { label: "WL", long: "Wide Left", group: "front" },
  { label: "WR", long: "Wide Right", group: "front" },
  { label: "TFL", long: "Top Front Left", group: "upper" },
  { label: "TFC", long: "Top Front Center", group: "upper" },
  { label: "TFR", long: "Top Front Right", group: "upper" },
  { label: "TRL", long: "Top Rear Left", group: "upper" },
  { label: "TRC", long: "Top Rear Center", group: "upper" },
  { label: "TRR", long: "Top Rear Right", group: "upper" },
];

export function createDefaultSettings(): MeterDesignSettings {
  return designFromPreset("subway-map");
}

export function designFromPreset(presetId: string): MeterDesignSettings {
  const preset = presetDesigns.find((item) => item.id === presetId) ?? presetDesigns[0];
  const channelPreset = channelPresets.find((item) => item.id === preset.preset) ?? channelPresets[7];
  const groups = createGroups(channelPreset.count, channelPreset.id);

  return {
    schema: schemaName,
    version: 1,
    name: preset.name,
    channelCount: channelPreset.count,
    channelPreset: channelPreset.id,
    layout: {
      kind: preset.layout,
      density: "compact",
      showGroupGuides: true,
      smallPanelPreview: false,
      operatorView: false,
    },
    labels: {
      mode: channelPreset.id === "sonicSphere30Point1" ? "sphereOutputs" : "auto",
      showInline: true,
      minInlineCellSize: 34,
      showOnHover: true,
      groupLabels: true,
      density: "balanced",
      overrides: channelPreset.id === "sonicSphere30Point1" ? [{ channel: 31, label: "LFE", longLabel: "Low Frequency Effects", group: "lfe" }] : [],
    },
    groups,
    colors: {
      background: "#071014",
      panel: "rgba(255,255,255,0.045)",
      line: "rgba(217,251,255,0.14)",
      low: "#5eead4",
      mid: "#60a5fa",
      hot: "#facc15",
      clip: "#fb7185",
      muted: "#4b6268",
    },
    motion: {
      kind: preset.motion,
      speed: 0.72,
      intensity: 0.86,
      decay: 0.62,
      noise: 0.18,
      peakHoldMs: 900,
      clipLatchMs: 1400,
      phaseMode: "groupSynced",
      reducedMotion: false,
    },
    thresholds: {
      active: 0.005,
      hot: presetId === "fault-finder" ? 0.62 : 0.72,
      clip: presetId === "fault-finder" ? 0.9 : 0.96,
    },
    rendering: {
      showSummaryPills: true,
      showPeakHold: true,
      pixelSnap: true,
    },
    metadata: {
      createdBy: "Orbisonic VU Lab",
      notes: "Standalone high-channel VU design preset.",
    },
  };
}

export function withPreset(settings: MeterDesignSettings, presetId: ChannelPresetId): MeterDesignSettings {
  const preset = channelPresets.find((item) => item.id === presetId) ?? channelPresets[channelPresets.length - 1];
  const count = preset.id === "custom" ? settings.channelCount : preset.count;
  return {
    ...settings,
    channelPreset: preset.id,
    channelCount: clampInt(count, 1, 64),
    groups: createGroups(clampInt(count, 1, 64), preset.id),
    labels: {
      ...settings.labels,
      mode: preset.id === "sonicSphere30Point1" ? "sphereOutputs" : settings.labels.mode === "sphereOutputs" ? "auto" : settings.labels.mode,
    },
  };
}

export function withChannelCount(settings: MeterDesignSettings, channelCount: number): MeterDesignSettings {
  const count = clampInt(channelCount, 1, 64);
  return {
    ...settings,
    channelPreset: "custom",
    channelCount: count,
    groups: createGroups(count, "custom"),
    labels: {
      ...settings.labels,
      overrides: settings.labels.overrides.filter((item) => item.channel <= count),
    },
  };
}

export function createGroups(channelCount: number, preset: ChannelPresetId): ChannelGroup[] {
  if (preset === "sonicSphere30Point1") {
    return [
      group("front", "Front Arc", range(1, 5), groupColors[0]),
      group("side", "Side Arc", range(6, 10), groupColors[1]),
      group("rear", "Rear Arc", range(11, 15), groupColors[2]),
      group("upper", "Upper Ring", range(16, 20), groupColors[3]),
      group("lower", "Lower Ring", range(21, 30), groupColors[4]),
      group("lfe", "LFE / Sub", [31], groupColors[5]),
    ];
  }

  if (channelCount <= 8 && preset !== "custom") {
    const roleSet = surroundRoles[preset].slice(0, channelCount);
    const ids = Array.from(new Set(roleSet.map((role) => role.group)));
    return ids.map((id, index) =>
      group(
        id,
        groupName(id),
        roleSet.map((role, roleIndex) => (role.group === id ? roleIndex + 1 : 0)).filter(Boolean),
        groupColors[index % groupColors.length]
      )
    );
  }

  const size = channelCount > 48 ? 8 : channelCount > 24 ? 6 : 4;
  const groups: ChannelGroup[] = [];
  for (let start = 1, index = 0; start <= channelCount; start += size, index += 1) {
    const end = Math.min(channelCount, start + size - 1);
    groups.push(group(`bank-${index + 1}`, `Bank ${index + 1}`, range(start, end), groupColors[index % groupColors.length]));
  }
  return groups;
}

function group(id: string, name: string, channels: number[], color: string): ChannelGroup {
  return { id, name, channels, color };
}

function groupName(id: string): string {
  const names: Record<string, string> = {
    front: "Front Arc",
    side: "Side Arc",
    rear: "Rear Arc",
    upper: "Upper Ring",
    lower: "Lower Ring",
    lfe: "LFE / Sub",
  };
  return names[id] ?? id;
}

export function getChannelDefinitions(settings: MeterDesignSettings): ChannelDefinition[] {
  const presetRoles = surroundRoles[settings.channelPreset];
  const overrides = new Map(settings.labels.overrides.map((item) => [item.channel, item]));
  return range(1, settings.channelCount).map((number) => {
    const override = overrides.get(number);
    const role = presetRoles[number - 1] ?? getDiscreteRole(number, settings.channelPreset);
    const groupId = override?.group ?? role.group ?? groupForChannel(settings.groups, number)?.id ?? "unassigned";
    const group = settings.groups.find((item) => item.id === groupId) ?? groupForChannel(settings.groups, number);
    const autoLabel = labelForMode(number, settings.labels.mode, settings.channelPreset, role.label, role.long, override?.label);
    const longLabel = override?.longLabel ?? role.long ?? `Channel ${number}`;

    return {
      number,
      role: role.long ?? `Channel ${number}`,
      label: autoLabel,
      longLabel,
      groupId: group?.id ?? groupId,
      groupName: group?.name ?? "Unassigned",
      groupColor: group?.color ?? settings.colors.low,
      isLfe: Boolean(role.lfe) || groupId === "lfe",
    };
  });
}

function getDiscreteRole(number: number, preset: ChannelPresetId): { label: string; long: string; group: string; lfe?: boolean } {
  if (preset === "sonicSphere30Point1" && number <= 30) {
    return { label: `S${number}`, long: `Sonic Sphere Output ${number}`, group: number <= 5 ? "front" : number <= 10 ? "side" : number <= 15 ? "rear" : number <= 20 ? "upper" : "lower" };
  }
  if (preset === "sonicSphere30Point1" && number === 31) {
    return { label: "LFE", long: "Low Frequency Effects", group: "lfe", lfe: true };
  }
  return { label: `CH${number}`, long: `Channel ${number}`, group: "discrete" };
}

function labelForMode(number: number, mode: LabelMode, preset: ChannelPresetId, shortLabel: string, longLabel: string, override?: string): string {
  if (mode === "custom" && override) return override;
  if (mode === "numbers") return `${number}`;
  if (mode === "longRoles") return longLabel;
  if (mode === "sphereOutputs") {
    if (preset === "sonicSphere30Point1" && number === 31) return "LFE";
    return `S${number}`;
  }
  if (mode === "shortRoles") return shortLabel;
  return override ?? shortLabel;
}

function groupForChannel(groups: ChannelGroup[], channel: number): ChannelGroup | undefined {
  return groups.find((item) => item.channels.includes(channel));
}

export function simulateLevels(
  settings: MeterDesignSettings,
  mode: SimulationMode,
  seed: number,
  timeSeconds: number,
  playing: boolean
): RuntimeChannelLevel[] {
  const channels = getChannelDefinitions(settings);
  const phaseTime = playing ? timeSeconds * settings.motion.speed : 0;
  return channels.map((channel, index) => {
    const base = sampleLevel(mode, index, channel, channels.length, seed, phaseTime, settings.groups);
    const normalizedLevel = clamp01(playing ? base : base * 0.18);
    const peakHold = clamp01(Math.max(normalizedLevel, sampleLevel("stress", index, channel, channels.length, seed + 19, phaseTime * 0.45, settings.groups) * 0.84));
    return {
      channel: channel.number,
      normalizedLevel,
      peakHold,
      isClipping: normalizedLevel >= settings.thresholds.clip,
      isMuted: normalizedLevel < 0.001,
    };
  });
}

function sampleLevel(
  mode: SimulationMode,
  index: number,
  channel: ChannelDefinition,
  total: number,
  seed: number,
  time: number,
  groups: ChannelGroup[]
): number {
  const n = seededNoise(seed, index * 17.13);
  const wave = (Math.sin(time * 2.4 + index * 0.67 + seed * 0.03) + 1) / 2;
  const slow = (Math.sin(time * 0.72 + index * 0.23) + 1) / 2;
  switch (mode) {
    case "channelWalk": {
      const active = Math.floor(time * 5.5) % Math.max(total, 1);
      const distance = Math.min(Math.abs(index - active), Math.abs(index - active + total), Math.abs(index - active - total));
      return Math.max(0, 0.94 - distance * 0.26) + n * 0.04;
    }
    case "groupSweep": {
      const groupIndex = Math.floor(time * 1.35) % Math.max(groups.length, 1);
      const activeGroup = groups[groupIndex];
      const isActive = activeGroup?.channels.includes(channel.number);
      return isActive ? 0.38 + wave * 0.48 : 0.02 + n * 0.1;
    }
    case "hotFault":
      return index === Math.floor(total * 0.36) ? 0.86 + wave * 0.08 : 0.05 + slow * 0.32 * n;
    case "clipFault":
      return index === Math.floor(total * 0.62) ? 0.98 : 0.04 + wave * 0.28 * n;
    case "sparseAmbience":
      return n > 0.78 ? 0.18 + wave * 0.44 : 0.01 + n * 0.04;
    case "stress":
      return 0.2 + wave * 0.64 + n * 0.12;
    case "rendererSpread": {
      const sourceA = Math.floor(((Math.sin(time * 0.65) + 1) / 2) * Math.max(total - 1, 1));
      const sourceB = Math.floor(((Math.cos(time * 0.41 + 1.7) + 1) / 2) * Math.max(total - 1, 1));
      const spread = Math.max(0, 0.86 - Math.min(Math.abs(index - sourceA), Math.abs(index - sourceB)) * 0.1);
      return spread * (0.55 + slow * 0.42) + n * 0.08;
    }
    case "pinkNoise":
    default:
      return Math.pow(n * 0.45 + wave * 0.38 + slow * 0.18, 1.2);
  }
}

export function exportSettings(settings: MeterDesignSettings): string {
  const serializable: MeterDesignSettings = {
    ...settings,
    channelCount: clampInt(settings.channelCount, 1, 64),
    labels: {
      ...settings.labels,
      overrides: settings.labels.overrides
        .filter((item) => item.channel >= 1 && item.channel <= settings.channelCount)
        .map((item) => ({ ...item, label: item.label.trim(), longLabel: item.longLabel?.trim(), group: item.group?.trim() })),
    },
    metadata: {
      ...settings.metadata,
      createdBy: "Orbisonic VU Lab",
    },
  };
  return JSON.stringify(serializable, null, 2);
}

export function parseSettings(value: string): { ok: true; settings: MeterDesignSettings } | { ok: false; errors: string[] } {
  try {
    const parsed = JSON.parse(value) as Partial<MeterDesignSettings>;
    const errors: string[] = [];
    const parsedChannelCount = parsed.channelCount;
    if (parsed.schema !== schemaName) errors.push("schema must be orbisonic.vuMeterDesign");
    if (parsed.version !== 1) errors.push("version must be 1");
    if (!parsed.name || typeof parsed.name !== "string") errors.push("name is required");
    if (typeof parsedChannelCount !== "number" || !Number.isInteger(parsedChannelCount) || parsedChannelCount < 1 || parsedChannelCount > 64) {
      errors.push("channelCount must be 1 through 64");
    }
    if (!parsed.layout?.kind || !(parsed.layout.kind in layoutLabels)) errors.push("layout.kind is unknown");
    if (!parsed.motion?.kind || !(parsed.motion.kind in motionLabels)) errors.push("motion.kind is unknown");
    if (typeof parsed.thresholds?.active !== "number" || typeof parsed.thresholds?.hot !== "number" || typeof parsed.thresholds?.clip !== "number") {
      errors.push("thresholds.active, thresholds.hot, and thresholds.clip are required");
    }
    if (errors.length) return { ok: false, errors };

    const fallback = createDefaultSettings();
    return {
      ok: true,
      settings: {
        ...fallback,
        ...parsed,
        schema: schemaName,
        version: 1,
        channelCount: clampInt(parsed.channelCount ?? fallback.channelCount, 1, 64),
        layout: { ...fallback.layout, ...parsed.layout },
        labels: { ...fallback.labels, ...parsed.labels, overrides: parsed.labels?.overrides ?? [] },
        groups: parsed.groups?.length ? parsed.groups : createGroups(parsed.channelCount ?? fallback.channelCount, parsed.channelPreset ?? "custom"),
        colors: { ...fallback.colors, ...parsed.colors },
        motion: { ...fallback.motion, ...parsed.motion },
        thresholds: { ...fallback.thresholds, ...parsed.thresholds },
        rendering: { ...fallback.rendering, ...parsed.rendering },
        metadata: { ...fallback.metadata, ...parsed.metadata, createdBy: "Orbisonic VU Lab" },
      },
    };
  } catch (error) {
    return { ok: false, errors: [error instanceof Error ? error.message : "invalid JSON"] };
  }
}

export function applyCsvLabels(settings: MeterDesignSettings, csv: string): { settings: MeterDesignSettings; errors: string[] } {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const errors: string[] = [];
  const seen = new Set<number>();
  const overrides = new Map(settings.labels.overrides.map((item) => [item.channel, item]));

  for (const [lineIndex, line] of lines.entries()) {
    if (lineIndex === 0 && /^channel,/i.test(line)) continue;
    const [channelText, label = "", longLabel = "", group = ""] = line.split(",").map((item) => item.trim());
    const channel = Number(channelText);
    if (!Number.isInteger(channel) || channel < 1 || channel > settings.channelCount) {
      errors.push(`line ${lineIndex + 1}: invalid channel`);
      continue;
    }
    if (seen.has(channel)) {
      errors.push(`line ${lineIndex + 1}: duplicate channel ${channel}`);
      continue;
    }
    if (!label) {
      errors.push(`line ${lineIndex + 1}: label is required`);
      continue;
    }
    if (label.length > 12) errors.push(`line ${lineIndex + 1}: label may be too long for inline cells`);
    seen.add(channel);
    overrides.set(channel, {
      channel,
      label,
      longLabel: longLabel || undefined,
      group: group || undefined,
    });
  }

  return {
    settings: {
      ...settings,
      labels: {
        ...settings.labels,
        mode: "custom",
        overrides: Array.from(overrides.values()).sort((a, b) => a.channel - b.channel),
      },
    },
    errors,
  };
}

export function upsertLabel(settings: MeterDesignSettings, channel: number, label: string, longLabel: string): MeterDesignSettings {
  const overrides = settings.labels.overrides.filter((item) => item.channel !== channel);
  if (label.trim() || longLabel.trim()) {
    overrides.push({ channel, label: label.trim() || `CH${channel}`, longLabel: longLabel.trim() || undefined });
  }
  return {
    ...settings,
    labels: {
      ...settings.labels,
      mode: "custom",
      overrides: overrides.sort((a, b) => a.channel - b.channel),
    },
  };
}

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export function seededNoise(seed: number, value: number): number {
  const raw = Math.sin(seed * 12.9898 + value * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}
