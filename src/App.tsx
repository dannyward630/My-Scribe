import { Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HistoryPanel } from "./components/HistoryPanel";
import { ProgressLog } from "./components/ProgressLog";
import { SettingsPanel } from "./components/SettingsPanel";
import { SourcePanel } from "./components/SourcePanel";
import { TranscriptView } from "./components/TranscriptView";
import type {
  HistoryItem,
  OutputFormat,
  ProgressEvent,
  SourceMode,
  TranscriptResult,
  TranscriptionOptions
} from "./types";

const initialOptions: TranscriptionOptions = {
  quality: "balanced",
  language: "auto",
  outputFormat: "txt"
};

const historyKey = "vidscribe.history";

function formatTimestamp(seconds: number, separator = ".") {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const wholeSeconds = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds - Math.floor(seconds)) * 1000);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${wholeSeconds
    .toString()
    .padStart(2, "0")}${separator}${milliseconds.toString().padStart(3, "0")}`;
}

function renderOutput(result: TranscriptResult, format: OutputFormat) {
  if (format === "txt") {
    return result.text;
  }

  if (format === "vtt") {
    return [
      "WEBVTT",
      "",
      ...result.segments.map(
        (segment, index) =>
          `${index + 1}\n${formatTimestamp(segment.start)} --> ${formatTimestamp(segment.end)}\n${segment.text}\n`
      )
    ].join("\n");
  }

  return result.segments
    .map(
      (segment, index) =>
        `${index + 1}\n${formatTimestamp(segment.start, ",")} --> ${formatTimestamp(segment.end, ",")}\n${
          segment.text
        }\n`
    )
    .join("\n");
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [mode, setMode] = useState<SourceMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [options, setOptions] = useState<TranscriptionOptions>(initialOptions);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(historyKey);
    if (raw) {
      setHistory(JSON.parse(raw) as HistoryItem[]);
    }
  }, []);

  const canStart = useMemo(() => {
    return mode === "file" ? Boolean(file) : url.trim().length > 0;
  }, [file, mode, url]);

  async function startTranscription() {
    if (!canStart || running) {
      return;
    }

    setRunning(true);
    setResult(null);
    setError("");
    setEvents([{ stage: "queued", message: "Preparing transcription..." }]);

    try {
      const body = new FormData();
      body.set("quality", options.quality);
      body.set("language", options.language);

      let endpoint = "/api/transcribe/url";
      let title = url;

      if (mode === "file") {
        if (!file) {
          throw new Error("Choose a file first.");
        }
        endpoint = "/api/transcribe/file";
        title = file.name;
        body.set("media", file);
      } else {
        body.set("url", url.trim());
      }

      setEvents((current) => [...current, { stage: mode === "file" ? "uploading" : "downloading", message: mode === "file" ? "Uploading media..." : "Downloading audio..." }]);

      const response = await fetch(endpoint, {
        method: "POST",
        body
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Transcription failed.");
      }

      setEvents((current) => [
        ...current,
        { stage: "done", message: "Done.", detail: "Transcript and export formats are ready." }
      ]);
      setResult(payload as TranscriptResult);

      const nextHistory = [
        {
          id: crypto.randomUUID(),
          title,
          sourceType: mode,
          createdAt: new Date().toISOString(),
          outputPath: payload.outputs?.[options.outputFormat]
        },
        ...history
      ].slice(0, 8);
      setHistory(nextHistory);
      localStorage.setItem(historyKey, JSON.stringify(nextHistory));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong.";
      setError(message);
      setEvents((current) => [...current, { stage: "error", message: "Error", detail: message }]);
    } finally {
      setRunning(false);
    }
  }

  async function copyTranscript() {
    if (result) {
      await navigator.clipboard.writeText(result.text);
    }
  }

  function saveTranscript(format: OutputFormat) {
    if (result) {
      downloadText(`vidscribe-transcript.${format}`, renderOutput(result, format));
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="app-header">
          <div>
            <span className="brand">VidScribe</span>
            <h1>Drop in a video file or paste a link. Get a transcript.</h1>
          </div>
          <button className="primary" disabled={!canStart || running} onClick={startTranscription} type="button">
            <Play size={18} />
            {running ? "Working..." : "Start Transcription"}
          </button>
        </header>

        <div className="control-grid">
          <SourcePanel
            fileName={file?.name ?? ""}
            filePath={file?.name ?? ""}
            mode={mode}
            onChooseFile={setFile}
            onModeChange={setMode}
            onUrlChange={setUrl}
            url={url}
          />
          <SettingsPanel onChange={setOptions} options={options} />
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <TranscriptView
          onCopy={copyTranscript}
          onSave={saveTranscript}
          outputFormat={options.outputFormat}
          result={result}
        />
      </section>

      <aside className="side-rail">
        <ProgressLog events={events} running={running} />
        <HistoryPanel history={history} />
      </aside>
    </main>
  );
}
