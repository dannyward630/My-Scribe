export type Quality = "fast" | "balanced" | "accurate";
export type OutputFormat = "txt" | "srt" | "vtt";
export type SourceMode = "file" | "url";

export interface TranscriptionOptions {
  quality: Quality;
  language: string;
  outputFormat: OutputFormat;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
  outputs: Record<OutputFormat, string>;
}

export interface HistoryItem {
  id: string;
  title: string;
  sourceType: SourceMode;
  createdAt: string;
  outputPath?: string;
}

export interface ProgressEvent {
  stage: string;
  message: string;
  detail?: string;
}
