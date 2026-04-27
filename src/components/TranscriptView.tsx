import { Clipboard, Download } from "lucide-react";
import type { OutputFormat, TranscriptResult } from "../types";

interface TranscriptViewProps {
  result: TranscriptResult | null;
  outputFormat: OutputFormat;
  onCopy: () => void;
  onSave: (format: OutputFormat) => void;
}

export function TranscriptView({ result, outputFormat, onCopy, onSave }: TranscriptViewProps) {
  return (
    <section className="transcript-section" aria-label="Transcript">
      <div className="transcript-toolbar">
        <div>
          <span className="eyebrow">Transcript</span>
          <h2>{result ? "Your transcript is ready" : "Drop in media and get readable text"}</h2>
        </div>
        <div className="toolbar-actions">
          <button disabled={!result} onClick={onCopy} type="button">
            <Clipboard size={18} />
            Copy
          </button>
          <button disabled={!result} onClick={() => onSave(outputFormat)} type="button">
            <Download size={18} />
            Save {outputFormat.toUpperCase()}
          </button>
        </div>
      </div>
      <div className="transcript-box">
        {result ? (
          <p>{result.text}</p>
        ) : (
          <p className="placeholder">
            Paste a public video or audio URL, or upload a file you have permission to process.
            Some sites may not work.
          </p>
        )}
      </div>
    </section>
  );
}
