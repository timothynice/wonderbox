import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Play,
  Pause,
  Undo2,
  Redo2,
  Sparkles,
  MousePointer2,
  Paintbrush,
  Eraser,
  Sprout,
  Ghost,
  Star,
  Flag,
  Lamp,
  Layers,
  Flower2,
  Plus,
  X,
  Download,
  Upload,
  RotateCcw,
  Copy,
  Trash2,
  LockKeyhole,
  ChevronRight,
  Send,
  Check,
  Volume2,
  VolumeX,
  Palette as PaletteIcon,
  Smartphone,
} from "lucide-react";
import { ProjectHistory, loadProject, saveProject } from "./shared/history";
import {
  entitySchema,
  parseProject,
  serializeProject,
  type EntityKind,
  type Behaviors,
  type Project,
} from "./shared/model";
import type { Action } from "./shared/actions";
import { createStarterProject } from "./shared/starter";
import { mountGame } from "./game";
import { deriveEditImpact } from "./shared/edit-impact";
import { describeEditImpact, type TransactionPreview } from "./shared/preview";
import type { ReachabilityEvidence } from "./shared/reachability";

type RouteRequest = { targetTerrainId: string; sourceTerrainId?: string };
type RetryRequest = {
  text: string;
  selectedId: string | null;
  route?: RouteRequest;
  revision: number;
};
type Activity = {
  capability: string;
  status: string;
  summary: string;
  attempt?: number;
};
function RouteEvidence({
  evidence,
  onReplay,
}: {
  evidence: ReachabilityEvidence;
  onReplay?: () => void;
}) {
  return (
    <div className={"route-evidence " + evidence.status} role="status">
      <strong>
        {evidence.status === "route-found"
          ? "✓ A tested route"
          : evidence.status === "no-route-found"
            ? "No route found in this check"
            : "Check is limited"}
      </strong>
      <p>{evidence.summary}</p>
      <small>
        Static terrain check · revision {evidence.revision}. A simulated route
        is not a human playtest.
      </small>
      {onReplay && (
        <>
          <button className="replay-route" onClick={onReplay}>
            Replay checked route
          </button>
          <small>Scripted input · starts a fresh test run.</small>
        </>
      )}
    </div>
  );
}
import "./style.css";
import { EntityArtworkControls, ArtDirectionDialog } from "./editor/ArtworkControls";
import {SharePanel} from "./phone/SharePanel";
import {PhonePlayer} from "./phone/PhonePlayer";

const palette = [
  { kind: "select", icon: MousePointer2, label: "Select" },
  { kind: "terrain", icon: Paintbrush, label: "Terrain" },
  { kind: "erase", icon: Eraser, label: "Erase" },
  { kind: "plant", icon: Sprout, label: "Plant" },
  { kind: "enemy", icon: Ghost, label: "Creature" },
  { kind: "star", icon: Star, label: "Star" },
  { kind: "platform", icon: Layers, label: "Platform" },
  { kind: "checkpoint", icon: Flag, label: "Checkpoint" },
  { kind: "lantern", icon: Lamp, label: "Lantern" },
  { kind: "decoration", icon: Flower2, label: "Flower" },
] as const;
const uid = () => crypto.randomUUID().replaceAll("-", "");
let initialError = "";
function initialProject() {
  try {
    return loadProject() ?? createStarterProject();
  } catch {
    initialError =
      "Saved project could not be read. A fresh garden is open; your saved file has not been overwritten.";
    return createStarterProject();
  }
}
const history = new ProjectHistory(initialProject());
function App() {
  const [project, setProject] = useState(history.project),
    [mode, setMode] = useState<"play" | "edit">("play"),
    [selected, setSelected] = useState<string | null>(null),
    [tool, setTool] = useState("select"),
    [aiOpen, setAiOpen] = useState(true),
    [message, setMessage] = useState(
      initialError ||
        "Welcome, little explorer. Find three stars to wake the garden gate.",
    ),
    [saveStatus, setSaveStatus] = useState("Saved on this device"),
    [busy, setBusy] = useState(false),
    [prompt, setPrompt] = useState(""),
    [agentBusy, setAgentBusy] = useState(false),
    [conversation, setConversation] = useState<
      { role: string; text: string }[]
    >([]),
    [preview, setPreview] = useState<any>(null),
    [provider, setProvider] = useState("Checking connection…"),
    [status, setStatus] = useState<any>({
      stars: 0,
      totalStars: 3,
      deaths: 0,
      checkpoint: false,
      won: false,
    }),
    [confirmReset, setConfirmReset] = useState(false),
    [muted, setMuted] = useState(false),
    [lastChange, setLastChange] = useState<TransactionPreview | null>(null),
    [diffVisible, setDiffVisible] = useState(false),
    [routeEvidence, setRouteEvidence] = useState<ReachabilityEvidence | null>(
      null,
    ),
    [checkBusy, setCheckBusy] = useState(false),
    [sourceTerrainId, setSourceTerrainId] = useState(""),
    [retryRequest, setRetryRequest] = useState<RetryRequest | null>(null),
    [activity, setActivity] = useState<Activity[]>([]),
    [guidance, setGuidance] = useState(() => {
      try {
        return localStorage.getItem("wonderbox.guidance.dismissed") !== "1";
      } catch {
        return true;
      }
    });
  const [artOpen, setArtOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [accessCodeRequired, setAccessCodeRequired] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const host = useRef<HTMLDivElement>(null),
    game = useRef<ReturnType<typeof mountGame> | null>(null),
    current = useRef(project),
    mutationBusy = useRef(false),
    file = useRef<HTMLInputElement>(null),
    chatLog = useRef<HTMLDivElement>(null),
    recent = useRef<string[]>([]),
    modeRef = useRef(mode),
    checkSequence = useRef(0),
    lastChangeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
  current.current = project;
  modeRef.current = mode;
  const selectedEntity = project.entities.find((e) => e.id === selected);
  const selectedTerrain = project.terrain.find((t) => t.id === selected);
  function publish(next: Project, summary: string, forceRestart = false) {
    const before = current.current;
    const impact = deriveEditImpact(before, next, {
      forceRestart,
      resetProgress: forceRestart,
      reason: forceRestart ? summary : undefined,
    });
    setLastChange({
      baseRevision: before.revision,
      impact,
      affectedIds: impact.affectedIds,
      changes: describeEditImpact(impact),
    });
    setDiffVisible(true);
    clearTimeout(lastChangeTimer.current);
    lastChangeTimer.current = setTimeout(() => setDiffVisible(false), 2800);
    setPreview(null);
    setRouteEvidence(null);
    checkSequence.current++;
    current.current = next;
    setProject(next);
    try {
      saveProject(next);
      setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus("Storage full — export your project");
    }
    recent.current = [...recent.current, summary.slice(0, 600)].slice(-8);
    setMessage(summary + " · " + impact.reason);
    game.current?.setProject(next, {
      forceRestart,
      resetProgress: forceRestart,
      reason: forceRestart ? summary : undefined,
    });
  }
  async function commit(
    actions: Action[],
    summary: string,
    source: "manual" | "ai" = "manual",
    expectedRevision = current.current.revision,
    approved = false,
    checkRequest?: RouteRequest,
  ) {
    if (mutationBusy.current) {
      setMessage("An edit is saving. Try again in a moment.");
      return false;
    }
    mutationBusy.current = true;
    setBusy(true);
    try {
      const base = current.current;
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: base,
          actions,
          expectedRevision,
          source,
          approved,
          checkRequest,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Could not apply edit");
      if (current.current.revision !== base.revision)
        throw Error("The world changed during this edit. Please try again.");
      history.execute(actions, { expectedRevision, source });
      publish(history.project, summary);
      if (data.evidence) setRouteEvidence(data.evidence);
      return true;
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Edit failed. No changes applied.",
      );
      return false;
    } finally {
      mutationBusy.current = false;
      setBusy(false);
    }
  }
  const commitRef = useRef(commit);
  commitRef.current = commit;
  useEffect(() => {
    if (!host.current) return;
    game.current = mountGame(host.current, current.current, {
      onSelect: setSelected,
      onMove: (id, x, y) =>
        void commitRef.current(
          [{ type: "moveEntity", id, x, y }],
          "Moved object",
        ),
      onPaint: (r) =>
        void commitRef.current(
          [
            {
              type: "paintTerrain",
              terrain: [{ id: uid(), ...r }],
              eraseIds: [],
            },
          ],
          "Painted terrain",
        ),
      onEraseTerrain: (id) =>
        void commitRef.current(
          [{ type: "paintTerrain", terrain: [], eraseIds: [id] }],
          "Erased terrain",
        ),
      onPlace: (kind, x, y) => {
        const sizes: Partial<Record<EntityKind, number[]>> = {
          platform: [112, 24],
          checkpoint: [32, 64],
          exit: [56, 88],
          star: [28, 28],
          player: [32, 44],
        };
        const [width, height] = sizes[kind] ?? [36, 40];
        const entity = entitySchema.parse({
          id: uid(),
          kind,
          name:
            kind === "enemy"
              ? "Moss creature"
              : kind.charAt(0).toUpperCase() + kind.slice(1),
          x: Math.max(0, Math.min(x, current.current.world.width - width)),
          y: Math.max(0, Math.min(y, current.current.world.height - height)),
          width,
          height,
          behaviors:
            kind === "lantern"
              ? { portableLight: true }
              : kind === "plant"
                ? { throwable: true }
                : {},
        });
        void commitRef.current(
          [{ type: "addEntity", entity }],
          "Placed " + entity.name,
        );
      },
      onPause: () => setMode("edit"),
      onStatus: (s) => {
        setStatus(s);
        if (s.message) setMessage(s.message);
      },
    });
    (window as any).__wonderbox = {
      getDebugState: () => game.current?.getDebugState(),
      getProject: () => structuredClone(current.current),
    };
    return () => {
      game.current?.destroy();
      game.current = null;
      delete (window as any).__wonderbox;
      clearTimeout(lastChangeTimer.current);
    };
  }, []);
  useEffect(() => {
    game.current?.setMode(mode);
  }, [mode]);
  useEffect(() => {
    game.current?.setTool(tool as any);
  }, [tool]);
  useEffect(() => {
    game.current?.setSelection(selected);
  }, [selected]);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        setAccessCodeRequired(Boolean(d.accessCodeRequired));
        setProvider(
          d.configured
            ? `${d.provider} · ${d.model} · configured`
            : "No provider key · see README",
        );
      })
      .catch(() => setProvider("Server unavailable"));
  }, []);
  useEffect(() => {
    const log = chatLog.current;
    if (!log) return;
    const pending = preview ? log.querySelector<HTMLElement>(".preview") : null;
    if (pending) log.scrollTop += pending.getBoundingClientRect().top - log.getBoundingClientRect().top;
    else log.scrollTop = log.scrollHeight;
  }, [conversation, agentBusy, preview, aiOpen]);
  function undo() {
    if (mutationBusy.current || !history.canUndo) return;
    publish(history.undo(), "Undid last edit");
  }
  function redo() {
    if (mutationBusy.current || !history.canRedo) return;
    publish(history.redo(), "Redid edit");
  }
  useEffect(() => {
    const impact =
      preview?.preview?.impact ?? (diffVisible ? lastChange?.impact : null);
    const evidence = preview?.evidence ?? routeEvidence;
    game.current?.setPreview(impact ?? null, evidence?.witness?.points);
  }, [preview, diffVisible, lastChange, routeEvidence]);
  useEffect(() => {
    setSourceTerrainId("");
    setRouteEvidence(null);
    checkSequence.current++;
  }, [selected]);
  async function findStep() {
    if (!selectedTerrain || checkBusy || agentBusy || busy) return;
    setMode("edit");
    setCheckBusy(true);
    setPreview(null);
    setDiffVisible(false);
    const sequence = ++checkSequence.current;
    const base = current.current;
    const check = { targetTerrainId: selectedTerrain.id, sourceTerrainId: sourceTerrainId || undefined };
    try {
      const response = await fetch("/api/step-options", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: base, check }), signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "A stepping stone could not be checked.");
      if (sequence !== checkSequence.current || base.revision !== current.current.revision) return;
      const option = result.options?.[0];
      setMessage(result.summary);
      if (!option) { setRouteEvidence(result.baseline); return; }
      setAiOpen(true);
      setPreview({ ...option, source: "manual", baseRevision: base.revision, checkRequest: check,
        summary: "Mechanical step suggestion · no AI request. Review the checked terrain addition before Apply. Only a bounded static route is verified." });
      setRouteEvidence(option.evidence);
    } catch (error) {
      if (sequence === checkSequence.current) setMessage(error instanceof Error ? error.message : "Step planning failed. Nothing changed.");
    } finally { setCheckBusy(false); }
  }
  async function checkJump() {
    if (!selectedTerrain || checkBusy) return;
    setMode("edit");
    setCheckBusy(true);
    const sequence = ++checkSequence.current;
    const base = current.current;
    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: base,
          check: {
            targetTerrainId: selectedTerrain.id,
            sourceTerrainId: sourceTerrainId || undefined,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(result.error || "This jump could not be checked.");
      if (
        sequence !== checkSequence.current ||
        base.revision !== current.current.revision
      )
        return;
      setRouteEvidence(result.evidence);
      setMessage(result.evidence.summary);
    } catch (error) {
      if (sequence === checkSequence.current)
        setMessage(
          error instanceof Error
            ? error.message
            : "Check failed. Your garden is unchanged.",
        );
    } finally {
      setCheckBusy(false);
    }
  }
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          "input,textarea,select,[contenteditable=true]",
        )
      )
        return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "Escape") setMode("edit");
      if (
        e.key === "Delete" &&
        modeRef.current === "edit" &&
        selected &&
        current.current.entities.some((entity) => entity.id === selected)
      )
        void commitRef.current(
          [{ type: "removeEntity", id: selected }],
          "Deleted object",
        );
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [selected, project.revision]);
  async function ask(
    text = prompt,
    context?: { selectedId?: string | null; route?: RouteRequest },
  ) {
    if (!text.trim() || agentBusy) return;
    const selection =
      context?.selectedId !== undefined ? context.selectedId : selected;
    const route =
      context?.route ??
      (selectedTerrain && /reach|jump|ledge/i.test(text)
        ? {
            targetTerrainId: selectedTerrain.id,
            sourceTerrainId: sourceTerrainId || undefined,
          }
        : undefined);
    setMode("edit");
    setAiOpen(true);
    setPrompt("");
    setPreview(null);
    setDiffVisible(false);
    setAgentBusy(true);
    setActivity([]);
    setRetryRequest(null);
    const base = current.current;
    setConversation((c) => [...c, { role: "you", text }]);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(accessCode ? { "x-wonderbox-access-code": accessCode } : {}) },
        body: JSON.stringify({
          project: base,
          selectedId: selection,
          prompt: text,
          recentContext: recent.current,
          ...route,
        }),
        signal: AbortSignal.timeout(65000),
      });
      const result = await response.json();
      if (result.activity) setActivity(result.activity);
      if (!response.ok)
        throw Error(result.error || "The creative partner could not respond.");
      if (current.current.revision !== result.baseRevision)
        throw Error(
          "Your garden changed while I was thinking. Ask again so I can use your latest edits.",
        );
      setProvider(
        `${result.provider} · ${result.model}${result.usedFallback ? " · fallback" : ""}`,
      );
      setActivity(result.activity ?? []);
      if (result.evidence) setRouteEvidence(result.evidence);
      if (result.providerNotice)
        setConversation((c) => [
          ...c,
          { role: "agent", text: result.providerNotice },
        ]);
      if (!result.actions?.length) {
        setMessage(result.summary);
        if (result.checkRequest && result.evidence?.status === "no-route-found" && result.activity?.some((step: Activity) => step.capability === "propose"))
          setRetryRequest({ text, selectedId: selection, route, revision: base.revision });
        setConversation((c) => [...c, { role: "agent", text: result.summary }]);
        return;
      }
      if (result.requiresApproval || result.checkRequest) {
        if (!result.preview) {
          const response = await fetch("/api/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: base,
              actions: result.actions,
              expectedRevision: base.revision,
              source: "ai",
            }),
          });
          if (!response.ok)
            throw Error("The changes could not be previewed. Nothing changed.");
          result.preview = await response.json();
        }
        if (current.current.revision !== result.baseRevision)
          throw Error(
            "Your garden changed while I was thinking. Ask again so I can use your latest edits.",
          );
        setPreview(result);
        setMessage(result.evidence?.passed ? "Checked terrain proposal ready. Review the new step and tested route, then Apply or Discard." : "Proposal ready. Review the highlighted changes before Apply.");
        setConversation((c) => [
          ...c,
          {
            role: "agent",
            text: result.summary + " Review the proposed changes below.",
          },
        ]);
      } else {
        const ok = await commitRef.current(
          result.actions,
          result.summary,
          "ai",
          result.baseRevision,
        );
        if (!ok)
          throw Error(
            "The edit could not be applied. See the status message. Nothing changed.",
          );
        if (
          !result.checkRequest &&
          result.affectedIds?.[0] &&
          current.current.entities.some((e) => e.id === result.affectedIds[0])
        )
          setSelected(result.affectedIds[0]);
        setConversation((c) => [...c, { role: "agent", text: result.summary }]);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Connection failed. Your garden is unchanged.";
      setConversation((c) => [...c, { role: "error", text: message }]);
      setRetryRequest({
        text,
        selectedId: selection,
        route,
        revision: base.revision,
      });
    } finally {
      setAgentBusy(false);
    }
  }
  const behavior = (key: keyof Behaviors, value: any) =>
    selected &&
    void commit(
      [{ type: "setBehavior", id: selected, behaviors: { [key]: value } }],
      "Updated " + key,
    );
  const field = (
    label: string,
    key: keyof Behaviors,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <input
        key={selected + "-" + project.revision + "-" + key}
        type="number"
        min={min}
        max={max}
        step={step}
        defaultValue={selectedEntity?.behaviors[key] as number}
        onBlur={(e) => {
          const value = Number(e.target.value);
          if (value !== selectedEntity?.behaviors[key]) behavior(key, value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
  const toggle = (label: string, key: keyof Behaviors) => (
    <label className="toggle" key={key}>
      <span>{label}</span>
      <input
        type="checkbox"
        checked={Boolean(selectedEntity?.behaviors[key])}
        onChange={(e) => behavior(key, e.target.checked)}
      />
    </label>
  );
  return (
    <div className="app">
      <header>
        <a className="brand" href="/" aria-label="Wonderbox home">
          <span className="brandmark">
            w<span>✦</span>
          </span>
          wonderbox<span className="beta">PLAYGROUND</span>
        </a>
        <div className="project-title">
          <span className="dot" /> {project.name}
          <span className="muted"> / </span>
          <span className="muted">My playground</span>
        </div>
        <div className="header-actions">
          <span className="saved">
            <Check size={13} />
            {saveStatus}
          </span>
          <button
            title="Export project JSON"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(
                new Blob([serializeProject(project)], {
                  type: "application/json",
                }),
              );
              a.download = "moonlight-garden.wonderbox.json";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            <Download size={17} />
          </button>
          <button
            title="Import project JSON"
            onClick={() => file.current?.click()}
          >
            <Upload size={17} />
          </button>
          <button title="Reset demo" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={16} />
          </button>
        </div>
      </header>
      <div className="workspace-toolbar">
        <div className="mode-switch">
          <button
            className={mode === "play" ? "active" : ""}
            onClick={() => {
              game.current?.cancelReplay();
              setMode("play");
            }}
          >
            <Play size={15} fill="currentColor" />
            Play
          </button>
          <button
            className={mode === "edit" ? "active" : ""}
            onClick={() => setMode("edit")}
          >
            <MousePointer2 size={15} />
            Edit
          </button>
        </div>
        <span className="toolbar-hint">
          {mode === "play"
            ? "A little world. A thousand possibilities."
            : "Make a little change. See what happens."}
        </span>
        <div className="toolbar-right">
          <button className="share-trigger" title="Play on phone" aria-label="Play on phone" onClick={()=>{setMode("edit");setShareOpen(true);}}><Smartphone size={16}/><span>Play on phone</span></button>
          <button
            title="Undo (⌘Z)"
            disabled={!history.canUndo || busy}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            title="Redo (⌘⇧Z)"
            disabled={!history.canRedo || busy}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
          <span className="divider" />
          <button
            className={aiOpen ? "ai-toggle enabled" : "ai-toggle"}
            onClick={() => setAiOpen(!aiOpen)}
          >
            <Sparkles size={16} />
            Creative partner
          </button>
        </div>
      </div>
      <main>
        <aside className="palette">
          <span className="eyebrow">TOOLBOX</span>
          {palette.map(({ kind, icon: Icon, label }) => (
            <button
              key={kind}
              title={label}
              aria-label={label}
              className={tool === kind && mode === "edit" ? "selected" : ""}
              onClick={() => {
                setMode("edit");
                setTool(kind);
              }}
            >
              <Icon size={21} />
              <span>{label}</span>
            </button>
          ))}
          <div className="palette-bottom">✦</div>
        </aside>
        <section className="stage-column">
          <div className="stage-heading">
            <div>
              <span className="eyebrow">YOUR WORLD, IN THE MAKING</span>
              <h1>
                {project.name} <span>✦</span>
              </h1>
            </div>
            <div className="scene-meta">
              <span className="dot" />{" "}
              {mode === "play" ? "LIVE PLAY" : "EDITING"}
              <span>01 — THE GARDEN</span>
            </div>
          </div>
          <div className="game-wrap">
            <div
              ref={host}
              className="game-host"
              role="application"
              aria-label="Moonlight Garden game. A or D to move, Space to jump, E to interact, Escape to edit."
            />
            <div className="game-top">
              <span className="world-pill">
                {project.world.atmosphere === "moonlight" ? "☾" : "☀"}{" "}
                {project.name}
              </span>
              <div className="play-hud">
                <span
                  className="health-pill"
                  aria-label={`${status.health ?? 3} of 3 hearts`}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={i < (status.health ?? 3) ? "full" : "empty"}
                    >
                      ♥
                    </span>
                  ))}
                </span>
                <span className="stars-pill">
                  ✦ {status.stars} <span>/ {status.totalStars}</span>
                </span>
              </div>
            </div>
            {(preview || diffVisible) && (
              <div className="preview-legend" aria-label="Canvas change legend">
                <span>+ Added</span>
                <span>− Removed / before</span>
                <span>→ After / changed</span>
                {(preview?.evidence?.witness || routeEvidence?.witness) && (
                  <span>··· Tested route</span>
                )}
              </div>
            )}
            {mode === "edit" && (
              <div className="edit-banner">
                <Pause size={12} /> WORLD PAUSED <span>·</span>{" "}
                {tool === "select"
                  ? "Select & drag · scroll to explore"
                  : tool === "terrain"
                    ? "Drag to paint · 20 px grid"
                    : tool === "erase"
                      ? "Erase terrain rectangle · Undo to restore"
                      : "Click to place " + tool}
              </div>
            )}
            {status.won && (
              <div className="victory">
                <span>✦ GARDEN COMPLETE ✦</span>
                <h2>A little wonder, made by you.</h2>
                <p>Every world starts with a possibility.</p>
                <button
                  className="primary"
                  onClick={() => {
                    game.current?.restart(false);
                    setMode("play");
                  }}
                >
                  Play again
                </button>
                <button onClick={() => setMode("edit")}>Keep creating</button>
              </div>
            )}
          </div>
          <div className="game-footer">
            <div className="keys">
              <span>
                <kbd>←</kbd>
                <kbd>→</kbd> move
              </span>
              <span>
                <kbd>SPACE</kbd> jump / hold
              </span>
              <span>
                <kbd>E</kbd> pick up / throw
              </span>
              <span>
                <kbd>ESC</kbd> edit
              </span>
            </div>
            <div className="runtime-actions">
              <button
                onClick={() => {
                  const next = !muted;
                  setMuted(next);
                  game.current?.setMuted(next);
                }}
                title={muted ? "Enable sound" : "Mute sound"}
                aria-label={muted ? "Enable sound" : "Mute sound"}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                onClick={() => game.current?.restart(true)}
                title="Restart at checkpoint"
              >
                <RotateCcw size={14} />
                Checkpoint
              </button>
              <button
                onClick={() => game.current?.restart(false)}
                title="Restart the whole level"
              >
                Restart level
              </button>
            </div>
          </div>
          {guidance && (
            <div className="first-session-hint">
              <span>
                <strong>Try a little change.</strong> Jump, press Escape, select
                Pip, then adjust Float and Play again.
              </span>
              <button
                aria-label="Dismiss guidance"
                onClick={() => {
                  setGuidance(false);
                  try {
                    localStorage.setItem("wonderbox.guidance.dismissed", "1");
                  } catch {
                    /* Session guidance still dismisses when storage is unavailable. */
                  }
                }}
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="last-change">
            <button
              disabled={!lastChange}
              onClick={() => {
                clearTimeout(lastChangeTimer.current);
                setDiffVisible(!diffVisible);
              }}
            >
              {diffVisible ? "Hide last change" : "View last change"}
            </button>
            {diffVisible && !preview && lastChange && (
              <span>
                {lastChange.changes.slice(0, 2).join(" · ")}
                {lastChange.changes.length > 2
                  ? ` · +${lastChange.changes.length - 2} more`
                  : ""}
              </span>
            )}
          </div>
          {lastChange && diffVisible && !preview && (
            <details className="last-change-details">
              <summary>Change details · {lastChange.changes.length}</summary>
              <div>
                <p>{lastChange.impact.reason}</p>
                <ul>
                  {lastChange.changes.map((change, index) => (
                    <li key={index}>{change}</li>
                  ))}
                </ul>
              </div>
            </details>
          )}
          <div className="status-message" role="status">
            <span className="status-star">✦</span>
            <span>{message}</span>
          </div>
          <div className="world-settings">
            <span className="eyebrow">ATMOSPHERE</span>
            <button
              className={project.world.atmosphere === "day" ? "active" : ""}
              onClick={() =>
                void commit(
                  [
                    {
                      type: "setWorldSettings",
                      settings: { atmosphere: "day" },
                    },
                  ],
                  "Sunlight fills the garden",
                )
              }
            >
              ☀ Daydream
            </button>
            <button
              className={
                project.world.atmosphere === "moonlight" ? "active" : ""
              }
              onClick={() =>
                void commit(
                  [
                    {
                      type: "setWorldSettings",
                      settings: { atmosphere: "moonlight" },
                    },
                  ],
                  "The garden settles into moonlight",
                )
              }
            >
              ☾ Moonlight
            </button>
            <button className="art-direction-button" onClick={()=>{setMode("edit");setArtOpen(true);}}><PaletteIcon size={14}/>Art direction</button>
            <span className="settings-note">Imagine it. Make it. Play it.</span>
          </div>
        </section>
        <aside className="right-panel">
          <section className="inspector">
            <div className="panel-heading">
              <span className="eyebrow">
                {selectedEntity || selectedTerrain
                  ? "SELECTED OBJECT"
                  : "WORLD EXPLORER"}
              </span>
              {selectedEntity || selectedTerrain ? (
                <button
                  title="Clear selection"
                  aria-label="Clear selection"
                  onClick={() => setSelected(null)}
                >
                  <X size={15} />
                </button>
              ) : (
                <MousePointer2 size={14} />
              )}
            </div>
            {selectedTerrain ? (
              <div className="terrain-inspector">
                <div className="object-title">
                  <span className="object-icon">▰</span>
                  <div>
                    <h2>{selectedTerrain.id.replaceAll("-", " ")}</h2>
                    <span>
                      platform · {selectedTerrain.width} ×{" "}
                      {selectedTerrain.height}
                    </span>
                  </div>
                </div>
                <p className="terrain-coordinates">
                  Position {selectedTerrain.x}, {selectedTerrain.y}. Select a
                  starting surface, then check a route to this ledge.
                </p>
                <label className="field">
                  <span>Start surface</span>
                  <select
                    aria-label="Check starting platform"
                    value={sourceTerrainId}
                    onChange={(e) => {
                      setSourceTerrainId(e.target.value);
                      setRouteEvidence(null);
                      checkSequence.current++;
                    }}
                  >
                    <option value="">From authored spawn</option>
                    {project.terrain
                      .filter((t) => t.id !== selectedTerrain.id)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.id.replaceAll("-", " ")}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="terrain-actions">
                  <button
                    disabled={checkBusy || busy}
                    onClick={() => void checkJump()}
                  >
                    {checkBusy ? "Checking…" : "Check this jump"}
                  </button>
                  <button disabled={checkBusy || agentBusy || busy} onClick={() => void findStep()}>
                    Preview a checked step
                  </button>
                  <button
                    className="primary"
                    disabled={agentBusy || checkBusy || busy}
                    onClick={() =>
                      void ask(
                        "Make this ledge reachable without changing my character. Preserve the existing world and add only the terrain needed.",
                        {
                          route: {
                            targetTerrainId: selectedTerrain.id,
                            sourceTerrainId: sourceTerrainId || undefined,
                          },
                        },
                      )
                    }
                  >
                    <Sparkles size={13} />
                    Make this ledge reachable
                  </button>
                </div>
                <p className="check-limit">
                  Checks static terrain from an authored starting surface.
                  Moving platforms, enemies and object tricks are outside this
                  check.
                </p>
                {routeEvidence && !preview && (
                  <RouteEvidence
                    evidence={routeEvidence}
                    onReplay={
                      routeEvidence.passed &&
                      routeEvidence.revision === project.revision
                        ? () => {
                            if (game.current?.replayEvidence(routeEvidence))
                              setMode("play");
                          }
                        : undefined
                    }
                  />
                )}
              </div>
            ) : selectedEntity ? (
              <>
                <div className="object-title">
                  <span className={"object-icon " + selectedEntity.kind}>
                    {selectedEntity.kind === "player"
                      ? "◕"
                      : selectedEntity.kind === "star"
                        ? "✦"
                        : selectedEntity.kind === "enemy"
                          ? "♟"
                          : "❀"}
                  </span>
                  <div>
                    <h2>{selectedEntity.name}</h2>
                    <span>
                      {selectedEntity.kind} · {selectedEntity.id.slice(0, 15)}
                    </span>
                  </div>
                </div>
                <div className="position-fields">
                  {(["x", "y"] as const).map((k) => (
                    <label key={k}>
                      {selectedEntity.kind === "player" ? "Spawn " : ""}
                      {k.toUpperCase()}
                      <input
                        type="number"
                        key={selectedEntity.id + project.revision + k}
                        defaultValue={selectedEntity[k]}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v !== selectedEntity[k])
                            void commit(
                              [
                                {
                                  type: "moveEntity",
                                  id: selectedEntity.id,
                                  x: k === "x" ? v : selectedEntity.x,
                                  y: k === "y" ? v : selectedEntity.y,
                                },
                              ],
                              "Moved " + selectedEntity.name,
                            );
                        }}
                      />
                    </label>
                  ))}
                </div>
                <p className="position-help">
                  Position sets the level start and restarts play. Behavior
                  edits keep your current run.
                </p>
                <div className="behaviors">
                  <span className="eyebrow">BEHAVIOR</span>
                  {selectedEntity.kind === "player" &&
                    field("Float duration (s)", "floatSeconds", 0, 2, 0.1)}
                  {["plant", "lantern", "decoration"].includes(
                    selectedEntity.kind,
                  ) && (
                    <>
                      {toggle("Can pick up & throw", "throwable")}
                      {toggle("Portable light", "portableLight")}
                      {field("Light radius", "lightRadius", 40, 400)}
                    </>
                  )}
                  {selectedEntity.kind === "enemy" && (
                    <>
                      {toggle("Retreat from light", "fearsLight")}
                      {toggle("Hit → bouncing platform", "transformOnHit")}
                      {field("Patrol speed", "patrolSpeed", 0, 180)}
                      {field("Patrol distance", "patrolRange", 0, 500)}
                      {field("Bounce strength", "bounceSpeed", 300, 1100)}
                    </>
                  )}
                  {selectedEntity.kind === "platform" && (
                    <>
                      {field("Travel distance", "moveDistance", 0, 500)}
                      {field("Travel speed", "moveSpeed", 0, 200)}
                      <label className="field">
                        <span>Travel axis</span>
                        <select
                          value={selectedEntity.behaviors.moveAxis}
                          onChange={(e) => behavior("moveAxis", e.target.value)}
                        >
                          <option value="x">Horizontal</option>
                          <option value="y">Vertical</option>
                        </select>
                      </label>
                    </>
                  )}
                  {selectedEntity.kind === "exit" &&
                    field("Stars to unlock", "requiredStars", 0, 30)}
                </div>
                <EntityArtworkControls entity={selectedEntity} commit={commit} busy={busy}/>
                <label className="toggle lock">
                  <span>
                    <LockKeyhole size={13} />
                    Lock against AI edits
                  </span>
                  <input
                    type="checkbox"
                    checked={selectedEntity.locked}
                    onChange={(e) =>
                      void commit(
                        [
                          {
                            type: "updateEntity",
                            id: selectedEntity.id,
                            patch: { locked: e.target.checked },
                          },
                        ],
                        e.target.checked
                          ? "Locked object against AI edits"
                          : "Unlocked object",
                      )
                    }
                  />
                </label>
                <div className="object-actions">
                  <button
                    disabled={["player", "exit"].includes(selectedEntity.kind)}
                    onClick={() => {
                      const e = {
                        ...structuredClone(selectedEntity),
                        id: uid(),
                        x: Math.min(
                          selectedEntity.x + 48,
                          project.world.width - selectedEntity.width,
                        ),
                        name: selectedEntity.name + " copy",
                      };
                      void commit(
                        [{ type: "addEntity", entity: e }],
                        "Duplicated object",
                      );
                    }}
                  >
                    <Copy size={13} />
                    Duplicate
                  </button>
                  <button
                    disabled={["player", "exit"].includes(selectedEntity.kind)}
                    onClick={() =>
                      void commit(
                        [{ type: "removeEntity", id: selectedEntity.id }],
                        "Deleted object",
                      )
                    }
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="explorer-title">Everything is a possibility.</h2>
                <p className="muted small">
                  Pause and select something in the world, or find it here.
                </p>
                <div className="object-list">
                  {project.entities
                    .filter((e) => !["decoration"].includes(e.kind))
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          setMode("edit");
                          setTool("select");
                          setSelected(e.id);
                        }}
                      >
                        <span>
                          {e.kind === "star"
                            ? "✦"
                            : e.kind === "player"
                              ? "◕"
                              : e.kind === "enemy"
                                ? "♟"
                                : e.kind === "exit"
                                  ? "⌂"
                                  : "❀"}
                        </span>
                        {e.name}
                        <ChevronRight size={12} />
                      </button>
                    ))}
                </div>
                <details className="terrain-list">
                  <summary>
                    Platforms & ledges · {project.terrain.length}
                  </summary>
                  {project.terrain.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setMode("edit");
                        setTool("select");
                        setSelected(t.id);
                      }}
                    >
                      <Layers size={12} />
                      {t.id.replaceAll("-", " ")}
                      <ChevronRight size={12} />
                    </button>
                  ))}
                </details>
              </>
            )}
          </section>
          {aiOpen && (
            <section className="ai-panel">
              <div className="panel-heading">
                <span>
                  <Sparkles size={16} />A little imagination
                </span>
                <button
                  title="Collapse creative partner"
                  onClick={() => setAiOpen(false)}
                >
                  <X size={15} />
                </button>
              </div>
              {conversation.length === 0 && !preview && !agentBusy && (
                <p className="ai-intro">
                  Tell me what you imagine.
                  <br />
                  Let’s make it playable.
                </p>
              )}
              <div ref={chatLog} className="chat-log" aria-live="polite">
                {conversation.length === 0 ? (
                  <>
                    <div className="agent-note">
                      {selectedEntity
                        ? `I’m looking at ${selectedEntity.name}. What should we try?`
                        : "I can change how your world looks, feels, and plays. Select an object to give me a little focus."}
                    </div>
                    <div className="suggestions">
                      {[
                        "Let my character float briefly when I hold jump.",
                        "Change this garden to moonlight, but preserve the platforms.",
                      ].map((s) => (
                        <button key={s} onClick={() => void ask(s)}>
                          {s}
                          <Plus size={12} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  conversation.map((c, i) => (
                    <div key={i} className={"chat " + c.role}>
                      <span>
                        {c.role === "you"
                          ? "YOU"
                          : c.role === "error"
                            ? "CONNECTION"
                            : "WONDERBOX"}
                      </span>
                      <p>{c.text}</p>
                    </div>
                  ))
                )}
                {agentBusy && (
                  <div className="thinking">
                    ✦ Looking for a little possibility…
                  </div>
                )}
                {activity.length > 0 && (
                  <ol
                    className="agent-activity"
                    aria-label="Completed agent steps"
                  >
                    {activity.map((step, index) => (
                      <li key={index}>
                        <span aria-hidden="true">
                          {step.status === "failed" ? "○" : "✓"}
                        </span>
                        {step.summary}
                      </li>
                    ))}
                  </ol>
                )}
                {retryRequest && (
                  <div className="retry-panel">
                    <p>
                      Your request is saved. Retry uses your latest garden
                      {retryRequest.revision !== project.revision
                        ? " and includes edits made since the request"
                        : ""}
                      .
                    </p>
                    <blockquote>{retryRequest.text}</blockquote>
                    <button
                      disabled={agentBusy || busy}
                      onClick={() =>
                        void ask(retryRequest.text, {
                          selectedId: retryRequest.selectedId,
                          route: retryRequest.route,
                        })
                      }
                    >
                      <RotateCcw size={13} />
                      Retry request
                    </button>
                  </div>
                )}
                {preview && (
                  <div className="preview">
                    <strong>{preview.source === "manual" ? "Mechanical tool preview" : "AI preview"} · {preview.actions.length} {preview.actions.length === 1 ? "change" : "changes"}</strong>
                    <p>{preview.summary}</p>
                    <ul className="change-list">
                      {preview.preview?.changes?.map(
                        (change: string, index: number) => (
                          <li key={index}>{change}</li>
                        ),
                      )}
                    </ul>
                    <p className="restart-impact">
                      {preview.preview?.impact.mode === "restart" ? "↻ " : "▷ "}
                      {preview.preview?.impact.reason}
                    </p>
                    {preview.evidence && (
                      <RouteEvidence evidence={preview.evidence} />
                    )}
                    <button onClick={() => game.current?.focusPreview()}>
                      Show in garden
                    </button>
                    <div className="preview-actions">
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={async () => {
                          const pending = preview;
                          const ok = await commit(
                            pending.actions,
                            pending.summary,
                            pending.source ?? "ai",
                            pending.baseRevision,
                            true,
                            pending.checkRequest,
                          );
                          if (ok) setPreview(null);
                        }}
                      >
                        Apply changes
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => {
                          setPreview(null);
                          setRouteEvidence(null);
                        }}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ask();
                }}
              >
                <div className="selection-context">
                  {selectedEntity ? (
                    <>
                      <MousePointer2 size={11} />
                      {selectedEntity.name}
                      {selectedEntity.locked ? " · locked" : ""}
                    </>
                  ) : selectedTerrain ? (
                    <>
                      <Layers size={11} />
                      {selectedTerrain.id.replaceAll("-", " ")}
                    </>
                  ) : (
                    <>
                      <Layers size={11} />
                      Whole garden
                    </>
                  )}
                  <span>r{project.revision}</span>
                </div>
                <textarea
                  aria-label="Describe your game edit"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What if my character could…"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void ask();
                    }
                  }}
                />
                <div className="composer-footer">
                  <span>Changes are always undoable</span>
                  <button
                    type="submit"
                    className="send"
                    disabled={agentBusy || !prompt.trim()}
                    title="Send edit request"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
              {accessCodeRequired && (
                <label className="ai-access">
                  Shared AI access code
                  <input aria-label="AI access code" type="password" autoComplete="off" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} placeholder="Ask the project owner" />
                  <small>Used for AI requests only · kept in memory</small>
                </label>
              )}
              <div className="provider">
                <span className="dot" />
                {provider}
              </div>
            </section>
          )}
        </aside>
      </main>
      <footer className="bottom-bar">
        <span>
          <span className="dot" /> ALL SYSTEMS PLAYFUL
        </span>
        <span>Built for the curious.</span>
        <span>WONDERBOX / 2026</span>
      </footer>
      <input
        hidden
        ref={file}
        type="file"
        accept=".json"
        onChange={async (e) => {
          try {
            const f = e.target.files?.[0];
            if (!f) return;
            const next = parseProject(await f.text());
            publish(history.replace(next), "Imported project", true);
            setSelected(null);
          } catch {
            setMessage(
              "Import rejected. Use a valid Wonderbox v1 project under 2 MB. Your garden is unchanged.",
            );
          }
          e.target.value = "";
        }}
      />
      {shareOpen && <SharePanel key={project.id} project={project} onClose={()=>setShareOpen(false)}/>}
      {artOpen && <ArtDirectionDialog project={project} commit={commit} busy={busy} onClose={()=>setArtOpen(false)} onAsk={text=>void ask(text)}/>}
      {confirmReset && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Reset demo"
          >
            <span className="eyebrow">A FRESH LITTLE START</span>
            <h2>Reset Moonlight Garden?</h2>
            <p>
              This restores the original demo. You can undo the reset, or export
              your world first.
            </p>
            <button onClick={() => setConfirmReset(false)}>
              Keep my garden
            </button>
            <button
              className="primary"
              onClick={() => {
                publish(
                  history.replace(createStarterProject()),
                  "Demo reset to its original garden",
                  true,
                );
                setSelected(null);
                setConversation([]);
                setPreview(null);
                game.current?.restart(false);
                setConfirmReset(false);
              }}
            >
              Reset demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
const root = createRoot(document.getElementById("root")!);
const phoneRoute = location.pathname.match(/^\/play\/([^/]+)\/?$/);
root.render(phoneRoute ? <PhonePlayer shareId={phoneRoute[1]}/> : <App />);
if (import.meta.hot) import.meta.hot.dispose(() => root.unmount());
