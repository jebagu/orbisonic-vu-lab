import {
  Download,
  FileJson,
  Gauge,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChannelDefinition,
  ChannelPresetId,
  LabelMode,
  LayoutKind,
  MeterDesignSettings,
  MotionKind,
  SimulationMode,
  applyCsvLabels,
  channelPresets,
  createDefaultSettings,
  designFromPreset,
  exportSettings,
  getChannelDefinitions,
  layoutLabels,
  motionLabels,
  parseSettings,
  presetDesigns,
  simulateLevels,
  simulationLabels,
  upsertLabel,
  withChannelCount,
  withPreset,
} from "./model";
import { HitRegion, hitTest, renderMeters } from "./rendering";

const storageKey = "orbisonic-vu-lab.settings";
const layoutOrder = Object.keys(layoutLabels) as LayoutKind[];
const motionOrder = Object.keys(motionLabels) as MotionKind[];
const simulationOrder = Object.keys(simulationLabels) as SimulationMode[];
const labelModes: LabelMode[] = ["auto", "numbers", "shortRoles", "longRoles", "sphereOutputs", "custom"];

export default function App() {
  const [settings, setSettings] = useState<MeterDesignSettings>(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return createDefaultSettings();
    const parsed = parseSettings(saved);
    return parsed.ok ? parsed.settings : createDefaultSettings();
  });
  const [simulationMode, setSimulationMode] = useState<SimulationMode>("rendererSpread");
  const [seed, setSeed] = useState(42);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeSeconds, setTimeSeconds] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<number>(1);
  const [hoverChannel, setHoverChannel] = useState<number | undefined>();
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [jsonOpen, setJsonOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitRegionsRef = useRef<HitRegion[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const channels = useMemo(() => getChannelDefinitions(settings), [settings]);
  const levels = useMemo(
    () => simulateLevels(settings, simulationMode, seed, timeSeconds, isPlaying),
    [settings, simulationMode, seed, timeSeconds, isPlaying]
  );
  const selected = channels.find((channel) => channel.number === (hoverChannel ?? selectedChannel)) ?? channels[0];
  const selectedLevel = levels.find((level) => level.channel === selected?.number);
  const jsonPreview = useMemo(() => exportSettings(settings), [settings]);
  const activeCount = levels.filter((level) => level.normalizedLevel >= settings.thresholds.active).length;
  const hotCount = levels.filter((level) => level.normalizedLevel >= settings.thresholds.hot).length;
  const clipCount = levels.filter((level) => level.normalizedLevel >= settings.thresholds.clip).length;

  useEffect(() => {
    localStorage.setItem(storageKey, exportSettings(settings));
  }, [settings]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = Math.min(0.05, (now - last) / 1000);
      last = now;
      setTimeSeconds((value) => value + delta);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    hitRegionsRef.current = renderMeters({
      canvas,
      settings,
      channels,
      levels,
      selectedChannel,
      hoverChannel,
      timeSeconds,
    });
  }, [channels, hoverChannel, levels, selectedChannel, settings, timeSeconds]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const update = (patch: Partial<MeterDesignSettings>) => setSettings((current) => ({ ...current, ...patch }));
  const updateLayout = (patch: Partial<MeterDesignSettings["layout"]>) =>
    setSettings((current) => ({ ...current, layout: { ...current.layout, ...patch } }));
  const updateLabels = (patch: Partial<MeterDesignSettings["labels"]>) =>
    setSettings((current) => ({ ...current, labels: { ...current.labels, ...patch } }));
  const updateMotion = (patch: Partial<MeterDesignSettings["motion"]>) =>
    setSettings((current) => ({ ...current, motion: { ...current.motion, ...patch } }));
  const updateThresholds = (patch: Partial<MeterDesignSettings["thresholds"]>) =>
    setSettings((current) => ({ ...current, thresholds: { ...current.thresholds, ...patch } }));

  const handlePointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverChannel(hitTest(hitRegionsRef.current, event.clientX - rect.left, event.clientY - rect.top));
  };

  const handleCanvasClick = () => {
    if (hoverChannel) setSelectedChannel(hoverChannel);
  };

  const exportJson = () => {
    const blob = new Blob([jsonPreview], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${settings.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "orbisonic-vu-design"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const loadText = (text: string) => {
    const parsed = parseSettings(text);
    if (parsed.ok) {
      setSettings(parsed.settings);
      setSelectedChannel(1);
      setImportErrors([]);
      setImportText("");
    } else {
      setImportErrors(parsed.errors);
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    loadText(text);
    event.target.value = "";
  };

  const applyCsv = () => {
    const result = applyCsvLabels(settings, importText);
    setSettings(result.settings);
    setImportErrors(result.errors);
  };

  const setPreset = (presetId: ChannelPresetId) => {
    setSettings((current) => withPreset(current, presetId));
    const count = channelPresets.find((preset) => preset.id === presetId)?.count ?? settings.channelCount;
    setSelectedChannel(Math.min(selectedChannel, count));
  };

  const setChannelCount = (value: number) => {
    setSettings((current) => withChannelCount(current, value));
    setSelectedChannel(Math.min(selectedChannel, value));
  };

  const updateSelectedLabel = (label: string, longLabel: string) => {
    if (!selected) return;
    setSettings((current) => upsertLabel(current, selected.number, label, longLabel));
  };

  return (
    <div className={`app-shell ${settings.layout.operatorView ? "operator-mode" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <Gauge size={22} aria-hidden />
          <div>
            <h1>Orbisonic VU Lab</h1>
            <p>{settings.name}</p>
          </div>
        </div>
        <div className="status-pills">
          <MetricPill label="CH" value={settings.channelCount} />
          <MetricPill label="A" value={activeCount} />
          <MetricPill label="HOT" value={hotCount} warn={hotCount > 0} />
          <MetricPill label="CLIP" value={clipCount} danger={clipCount > 0} />
        </div>
        <div className="top-actions">
          <IconButton
            label={isPlaying ? "Pause" : "Play"}
            icon={isPlaying ? <Pause size={16} /> : <Play size={16} />}
            onClick={() => setIsPlaying((value) => !value)}
            active={isPlaying}
          />
          <IconButton label="Operator View" icon={<Maximize2 size={16} />} onClick={() => updateLayout({ operatorView: !settings.layout.operatorView })} active={settings.layout.operatorView} />
          <IconButton label="Export JSON" icon={<Download size={16} />} onClick={exportJson} />
          <IconButton label="Import JSON" icon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()} />
          <input ref={fileInputRef} className="hidden-input" type="file" accept="application/json,.json" onChange={handleFile} />
        </div>
      </header>

      <main className="workspace">
        <aside className="control-rail left-rail">
          <Panel title="Source">
            <label className="field">
              <span>Name</span>
              <input value={settings.name} onChange={(event) => update({ name: event.target.value })} />
            </label>
            <label className="field">
              <span>Preset</span>
              <select value={settings.channelPreset} onChange={(event) => setPreset(event.target.value as ChannelPresetId)}>
                {channelPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <Slider label="Channels" min={1} max={64} step={1} value={settings.channelCount} onChange={setChannelCount} />
          </Panel>

          <Panel title="Layout">
            <Segmented
              value={settings.layout.kind}
              options={layoutOrder.map((id) => ({ value: id, label: layoutLabels[id] }))}
              onChange={(value) => updateLayout({ kind: value as LayoutKind })}
            />
            <Segmented
              value={settings.layout.density}
              options={[
                { value: "open", label: "Open" },
                { value: "balanced", label: "Balanced" },
                { value: "compact", label: "Compact" },
              ]}
              onChange={(value) => updateLayout({ density: value as MeterDesignSettings["layout"]["density"] })}
            />
            <Toggle label="Group Guides" checked={settings.layout.showGroupGuides} onChange={(checked) => updateLayout({ showGroupGuides: checked })} />
            <Toggle label="Small Panel" checked={settings.layout.smallPanelPreview} onChange={(checked) => updateLayout({ smallPanelPreview: checked })} />
          </Panel>

          <Panel title="Motion">
            <Segmented
              value={settings.motion.kind}
              options={motionOrder.map((id) => ({ value: id, label: motionLabels[id] }))}
              onChange={(value) => updateMotion({ kind: value as MotionKind })}
            />
            <Slider label="Speed" min={0.1} max={2} step={0.01} value={settings.motion.speed} onChange={(speed) => updateMotion({ speed })} />
            <Slider label="Intensity" min={0.1} max={1} step={0.01} value={settings.motion.intensity} onChange={(intensity) => updateMotion({ intensity })} />
            <Slider label="Noise" min={0} max={0.75} step={0.01} value={settings.motion.noise} onChange={(noise) => updateMotion({ noise })} />
          </Panel>

          <Panel title="Thresholds">
            <Slider label="Active" min={0} max={0.2} step={0.001} value={settings.thresholds.active} onChange={(active) => updateThresholds({ active })} precision={3} />
            <Slider label="Hot" min={0.3} max={0.95} step={0.01} value={settings.thresholds.hot} onChange={(hot) => updateThresholds({ hot })} />
            <Slider label="Clip" min={0.6} max={1} step={0.01} value={settings.thresholds.clip} onChange={(clip) => updateThresholds({ clip })} />
          </Panel>
        </aside>

        <section className={`stage-column ${settings.layout.smallPanelPreview ? "small-preview" : ""}`}>
          <div className="meter-stage">
            <canvas
              ref={canvasRef}
              aria-label="VU meter design preview"
              onPointerMove={handlePointer}
              onPointerLeave={() => setHoverChannel(undefined)}
              onClick={handleCanvasClick}
            />
          </div>
          <PresetStrip current={settings.name} onSelect={(id) => setSettings(designFromPreset(id))} />
        </section>

        <aside className="control-rail right-rail">
          <Panel title="Simulator">
            <Segmented
              value={simulationMode}
              options={simulationOrder.map((id) => ({ value: id, label: simulationLabels[id] }))}
              onChange={(value) => setSimulationMode(value as SimulationMode)}
            />
            <Slider label="Seed" min={1} max={999} step={1} value={seed} onChange={setSeed} />
            <div className="button-row">
              <IconButton label="Play" icon={<Play size={16} />} onClick={() => setIsPlaying(true)} active={isPlaying} />
              <IconButton label="Pause" icon={<Pause size={16} />} onClick={() => setIsPlaying(false)} active={!isPlaying} />
              <IconButton label="Reset" icon={<RotateCcw size={16} />} onClick={() => setTimeSeconds(0)} />
            </div>
          </Panel>

          <Panel title="Channel">
            {selected ? (
              <ChannelInspector channel={selected} level={selectedLevel?.normalizedLevel ?? 0} peak={selectedLevel?.peakHold ?? 0} clip={selectedLevel?.isClipping ?? false} onChange={updateSelectedLabel} />
            ) : null}
          </Panel>

          <Panel title="Labels">
            <label className="field">
              <span>Mode</span>
              <select value={settings.labels.mode} onChange={(event) => updateLabels({ mode: event.target.value as LabelMode })}>
                {labelModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {labelModeLabel(mode)}
                  </option>
                ))}
              </select>
            </label>
            <Toggle label="Inline" checked={settings.labels.showInline} onChange={(checked) => updateLabels({ showInline: checked })} />
            <Toggle label="Hover" checked={settings.labels.showOnHover} onChange={(checked) => updateLabels({ showOnHover: checked })} />
            <Slider label="Min Size" min={18} max={72} step={1} value={settings.labels.minInlineCellSize} onChange={(minInlineCellSize) => updateLabels({ minInlineCellSize })} />
          </Panel>

          <Panel title="Import">
            <textarea value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="channel,label,longLabel,group" />
            <div className="button-row">
              <IconButton label="Load JSON" icon={<FileJson size={16} />} onClick={() => loadText(importText)} />
              <IconButton label="Apply CSV" icon={<SlidersHorizontal size={16} />} onClick={applyCsv} />
            </div>
            {importErrors.length ? (
              <div className="error-list">
                {importErrors.map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            ) : null}
          </Panel>

          <Panel title="JSON">
            <button className="text-toggle" onClick={() => setJsonOpen((value) => !value)}>
              {jsonOpen ? "Hide" : "Show"}
            </button>
            {jsonOpen ? <pre className="json-preview">{jsonPreview}</pre> : null}
          </Panel>
        </aside>
      </main>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function MetricPill({ label, value, warn, danger }: { label: string; value: number; warn?: boolean; danger?: boolean }) {
  return (
    <div className={`metric-pill ${warn ? "warn" : ""} ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function IconButton({ label, icon, onClick, active }: { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button className={`icon-button ${active ? "active" : ""}`} onClick={onClick} title={label} aria-label={label}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  precision = 2,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  precision?: number;
}) {
  const display = Number.isInteger(step) ? String(Math.round(value)) : value.toFixed(precision);
  return (
    <label className="slider-field">
      <span>
        {label}
        <strong>{display}</strong>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <div className="segmented">
      {options.map((option) => (
        <button key={option.value} className={option.value === value ? "selected" : ""} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChannelInspector({
  channel,
  level,
  peak,
  clip,
  onChange,
}: {
  channel: ChannelDefinition;
  level: number;
  peak: number;
  clip: boolean;
  onChange: (label: string, longLabel: string) => void;
}) {
  const [label, setLabel] = useState(channel.label);
  const [longLabel, setLongLabel] = useState(channel.longLabel);

  useEffect(() => {
    setLabel(channel.label);
    setLongLabel(channel.longLabel);
  }, [channel.label, channel.longLabel, channel.number]);

  return (
    <div className="inspector">
      <div className="channel-badge" style={{ borderColor: channel.groupColor }}>
        <span>CH {channel.number}</span>
        <strong>{channel.label}</strong>
      </div>
      <InfoRow label="Role" value={channel.role} />
      <InfoRow label="Group" value={channel.groupName} />
      <InfoRow label="Level" value={`${Math.round(level * 100)}%`} warn={level > 0.72} danger={clip} />
      <InfoRow label="Peak" value={`${Math.round(peak * 100)}%`} />
      <label className="field">
        <span>Short</span>
        <input value={label} maxLength={16} onChange={(event) => setLabel(event.target.value)} onBlur={() => onChange(label, longLabel)} />
      </label>
      <label className="field">
        <span>Long</span>
        <input value={longLabel} maxLength={48} onChange={(event) => setLongLabel(event.target.value)} onBlur={() => onChange(label, longLabel)} />
      </label>
    </div>
  );
}

function InfoRow({ label, value, warn, danger }: { label: string; value: string; warn?: boolean; danger?: boolean }) {
  return (
    <div className={`info-row ${warn ? "warn" : ""} ${danger ? "danger" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PresetStrip({ current, onSelect }: { current: string; onSelect: (id: string) => void }) {
  return (
    <div className="preset-strip">
      {presetDesigns.map((preset) => (
        <button key={preset.id} className={current === preset.name ? "selected" : ""} onClick={() => onSelect(preset.id)}>
          <span>{preset.name}</span>
          <small>
            {layoutLabels[preset.layout]} / {motionLabels[preset.motion]}
          </small>
        </button>
      ))}
    </div>
  );
}

function labelModeLabel(mode: LabelMode): string {
  switch (mode) {
    case "auto":
      return "Auto";
    case "numbers":
      return "Numbers";
    case "shortRoles":
      return "Short Roles";
    case "longRoles":
      return "Long Roles";
    case "sphereOutputs":
      return "Sphere Outputs";
    case "custom":
      return "Custom";
  }
}
