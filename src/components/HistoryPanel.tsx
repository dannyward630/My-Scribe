import { Clock3 } from "lucide-react";
import type { HistoryItem } from "../types";

interface HistoryPanelProps {
  history: HistoryItem[];
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  return (
    <section className="panel history-panel" aria-label="Recent transcriptions">
      <div className="panel-title">
        <Clock3 size={18} />
        Recent
      </div>
      {history.length === 0 ? (
        <p className="muted">Completed transcripts will appear here.</p>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <article key={item.id}>
              <strong>{item.title}</strong>
              <span>
                {item.sourceType.toUpperCase()} · {new Date(item.createdAt).toLocaleString()}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
