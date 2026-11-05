//src\app\student\components\useQuestionTimeTracker.ts
"use client";

import { useCallback, useEffect, useRef } from "react";

export interface TimeSnapshot {
  per_question: Record<string, { t: number; v: number; o: number }>;
  timeline: [string, number, number][];
  total_seconds: number;
}

/**
 * Measures how long the student really stays on each question.
 * - enter(id): the question on screen changed
 * - pause(): exam finished / submitting (stops the stopwatch)
 * - snapshot(): flush and return everything recorded so far
 * Time while the browser tab is hidden is not counted.
 */
export function useQuestionTimeTracker() {
  const per = useRef<TimeSnapshot["per_question"]>({});
  const timeline = useRef<TimeSnapshot["timeline"]>([]);
  const active = useRef<{ id: string; start: number } | null>(null);
  const resumeId = useRef<string | null>(null);
  const t0 = useRef<number | null>(null);
  const order = useRef(0);

  const leave = useCallback(() => {
    const a = active.current;
    if (!a) return;
    const nowMs = Date.now();
    const dt = (nowMs - a.start) / 1000;
    active.current = null;
    if (dt <= 0) return;
    const rec = per.current[a.id] || (per.current[a.id] = { t: 0, v: 0, o: 0 });
    rec.t += dt;
    if (dt >= 0.5 && t0.current !== null && timeline.current.length < 600) {
      timeline.current.push([a.id, (a.start - t0.current) / 1000, (nowMs - t0.current) / 1000]);
    }
  }, []);

  const enter = useCallback((id: string) => {
    if (active.current?.id === id) return;
    leave();
    const nowMs = Date.now();
    if (t0.current === null) t0.current = nowMs;
    const rec = per.current[id] || (per.current[id] = { t: 0, v: 0, o: 0 });
    rec.v += 1;
    if (!rec.o) rec.o = ++order.current;
    active.current = { id, start: nowMs };
    resumeId.current = id;
  }, [leave]);

  const pause = useCallback(() => { leave(); resumeId.current = null; }, [leave]);

  const snapshot = useCallback((): TimeSnapshot => {
    leave();
    resumeId.current = null;
    const out: TimeSnapshot["per_question"] = {};
    let total = 0;
    Object.entries(per.current).forEach(([id, r]) => {
      out[id] = { t: Math.round(r.t * 10) / 10, v: r.v, o: r.o };
      total += r.t;
    });
    const tl = timeline.current.map(([id, s, e]) => [id, Math.round(s), Math.round(e)] as [string, number, number]);
    return { per_question: out, timeline: tl, total_seconds: Math.round(total) };
  }, [leave]);

  // do not count time while the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) leave();
      else if (resumeId.current && !active.current) {
        active.current = { id: resumeId.current, start: Date.now() };
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [leave]);

  return { enter, pause, snapshot };
}