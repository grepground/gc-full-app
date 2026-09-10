"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Poll a "has anything new arrived?" endpoint and expose the result.
 *
 * Design notes, all of which keep this from becoming a cost or a nuisance:
 *
 * - **Pauses when the tab is hidden.** A backgrounded tab can otherwise poll
 *   forever with nobody watching. `visibilitychange` resumes immediately on
 *   return, so the pill appears the moment the user looks back.
 * - **Never overlaps requests.** Each tick is skipped while the previous probe
 *   is still in flight, so a slow network cannot queue up a backlog.
 * - **Failures are swallowed.** A transient network blip must not surface an
 *   error or stop the watcher; the next tick simply tries again.
 * - **No state churn.** The interval only calls `setState` when the value
 *   actually changed, so React does not re-render every few seconds for
 *   nothing.
 *
 * @param probe   Fetches the current activity snapshot for the given baseline.
 * @param baseline An id/version representing what the reader has already seen.
 *                  Whenever this changes (e.g. after the reader refreshes), the
 *                  accumulated pending count resets.
 * @param enabled Whether polling should run at all (e.g. off while loading).
 * @param intervalMs Time between probes.
 */
export interface NewContentState {
  /** How many unseen items are waiting. `0` means "show nothing". */
  count: number;
  /** Newest id seen by the probe, or null when there is nothing new. */
  newestId: number | null;
}

interface UseNewContentWatchArgs {
  /** Resolve the current activity snapshot for items newer than `afterId`. */
  probe: (
    afterId: number,
  ) => Promise<{ count: number; newestId: number | null }>;
  /** Highest id the reader has already been shown. */
  baseline: number;
  enabled: boolean;
  intervalMs?: number;
}

export function useNewContentWatch({
  probe,
  baseline,
  enabled,
  intervalMs = 20000,
}: UseNewContentWatchArgs) {
  // The baseline is stored *alongside* the snapshot so a stale result can be
  // discarded during render instead of being cleared by an effect. When the
  // reader refreshes, `baseline` advances and any snapshot recorded against the
  // old baseline is simply ignored — no extra render pass required.
  const [snapshot, setSnapshot] = useState<{
    baseline: number;
    state: NewContentState;
  }>({ baseline, state: { count: 0, newestId: null } });

  // Keep the latest probe/baseline in refs so the polling effect can stay
  // mounted with a stable interval while still seeing fresh values.
  const probeRef = useRef(probe);
  const baselineRef = useRef(baseline);
  const inFlightRef = useRef(false);

  useEffect(() => {
    probeRef.current = probe;
  }, [probe]);

  useEffect(() => {
    baselineRef.current = baseline;
  }, [baseline]);

  const tick = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const requestedBaseline = baselineRef.current;
    try {
      const result = await probeRef.current(requestedBaseline);
      const next: NewContentState = {
        count: Math.max(0, result.count),
        newestId: result.newestId,
      };
      setSnapshot((prev) =>
        prev.baseline === requestedBaseline &&
        prev.state.count === next.count &&
        prev.state.newestId === next.newestId
          ? prev // identical → keep the same reference, skip the re-render
          : { baseline: requestedBaseline, state: next },
      );
    } catch {
      // Transient failure — leave the current state untouched and retry later.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    let disposed = false;

    const schedule = () => {
      if (disposed) return;
      timer = window.setTimeout(async () => {
        // Skip the probe entirely while hidden; `visibilitychange` below
        // restarts the loop the moment the tab is visible again.
        if (document.visibilityState === "visible") {
          await tick();
        }
        schedule();
      }, intervalMs);
    };

    // An immediate first probe makes the pill appear promptly instead of after
    // a full interval of nothing.
    void tick();
    schedule();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void tick();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, intervalMs, tick]);

  // A snapshot recorded against an older baseline describes content the reader
  // has since been shown, so it must not surface as "new" any more.
  return snapshot.baseline === baseline ? snapshot.state : EMPTY_UPDATE_STATE;
}

/** Shared frozen empty result so the identity is stable across renders. */
const EMPTY_UPDATE_STATE: NewContentState = { count: 0, newestId: null };
