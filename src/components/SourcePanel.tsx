import { FileAudio, Link, Upload } from "lucide-react";
import type { SourceMode } from "../types";

interface SourcePanelProps {
  mode: SourceMode;
  filePath: string;
  fileName: string;
  url: string;
  onModeChange: (mode: SourceMode) => void;
  onChooseFile: (file: File | null) => void;
  onUrlChange: (url: string) => void;
}

export function SourcePanel({
  mode,
  filePath,
  fileName,
  url,
  onModeChange,
  onChooseFile,
  onUrlChange
}: SourcePanelProps) {
  return (
    <section className="panel source-panel" aria-label="Source">
      <div className="segmented" role="tablist" aria-label="Source type">
        <button
          className={mode === "file" ? "active" : ""}
          onClick={() => onModeChange("file")}
          type="button"
        >
          <FileAudio size={18} />
          File
        </button>
        <button
          className={mode === "url" ? "active" : ""}
          onClick={() => onModeChange("url")}
          type="button"
        >
          <Link size={18} />
          Link
        </button>
      </div>

      {mode === "file" ? (
        <div className="file-drop">
          <label className="upload-button">
            <Upload size={20} />
            Choose File
            <input
              accept=".mp4,.mov,.mkv,.webm,.avi,.mp3,.wav,.m4a,.flac,audio/*,video/*"
              onChange={(event) => onChooseFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <p title={filePath}>{fileName || "MP4, MOV, MKV, WEBM, AVI, MP3, WAV, M4A, or FLAC"}</p>
        </div>
      ) : (
        <label className="field">
          <span>Public video or audio URL</span>
          <input
            value={url}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            type="url"
          />
        </label>
      )}
    </section>
  );
}
