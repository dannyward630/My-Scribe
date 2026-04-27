import { Activity } from "lucide-react";
import type { ProgressEvent } from "../types";

interface ProgressLogProps {
  events: ProgressEvent[];
  running: boolean;
}

export function ProgressLog({ events, running }: ProgressLogProps) {
  return (
    <section className="panel progress-panel" aria-label="Progress">
      <div className="panel-title">
        <Activity size={18} />
        Progress
      </div>
      <div className="progress-list">
        {events.length === 0 ? (
          <p className="muted">Ready when you are.</p>
        ) : (
          events.map((event, index) => (
            <div className="progress-row" key={`${event.stage}-${index}`}>
              <span className={running && index === events.length - 1 ? "pulse dot" : "dot"} />
              <div>
                <strong>{event.message}</strong>
                {event.detail ? <p>{event.detail}</p> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
