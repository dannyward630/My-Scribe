import { SlidersHorizontal } from "lucide-react";
import type { OutputFormat, Quality, TranscriptionOptions } from "../types";

interface SettingsPanelProps {
  options: TranscriptionOptions;
  onChange: (options: TranscriptionOptions) => void;
}

const qualities: Array<{ value: Quality; label: string }> = [
  { value: "fast", label: "Fast" },
  { value: "balanced", label: "Balanced" },
  { value: "accurate", label: "Accurate" }
];

const outputs: Array<{ value: OutputFormat; label: string }> = [
  { value: "txt", label: "Plain Text" },
  { value: "srt", label: "SRT" },
  { value: "vtt", label: "VTT" }
];

export function SettingsPanel({ options, onChange }: SettingsPanelProps) {
  return (
    <section className="panel settings-panel" aria-label="Transcription settings">
      <div className="panel-title">
        <SlidersHorizontal size={18} />
        Options
      </div>

      <label className="field">
        <span>Language</span>
        <select
          value={options.language}
          onChange={(event) => onChange({ ...options, language: event.target.value })}
        >
          <option value="auto">Auto Detect</option>
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr">French</option>
          <option value="de">German</option>
          <option value="it">Italian</option>
          <option value="pt">Portuguese</option>
        </select>
      </label>

      <div className="field">
        <span>Quality</span>
        <div className="segmented compact" role="radiogroup" aria-label="Quality">
          {qualities.map((quality) => (
            <button
              className={options.quality === quality.value ? "active" : ""}
              key={quality.value}
              onClick={() => onChange({ ...options, quality: quality.value })}
              type="button"
            >
              {quality.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span>Preferred output</span>
        <select
          value={options.outputFormat}
          onChange={(event) => onChange({ ...options, outputFormat: event.target.value as OutputFormat })}
        >
          {outputs.map((output) => (
            <option key={output.value} value={output.value}>
              {output.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
