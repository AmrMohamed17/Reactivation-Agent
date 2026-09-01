export type FunnelStage = {
  label: string;
  value: number;
  /** Shown under the label, e.g. why the drop happened. */
  note?: string;
};

/**
 * Ordered stages with magnitude, so: horizontal bars.
 *
 * Magnitude is carried by bar length, which means colour must NOT also vary —
 * a second encoding of the same variable just adds noise. One hue throughout.
 * Every stage is directly labelled because there are few of them and the number
 * is the point; the scale is the first stage, so bars read as share of intake.
 */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="grid gap-2.5">
      {stages.map((stage, i) => {
        const pct = (stage.value / max) * 100;
        const previous = i > 0 ? stages[i - 1].value : null;
        const dropped =
          previous !== null && previous > stage.value ? previous - stage.value : null;

        return (
          <div key={stage.label} className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm">{stage.label}</div>
              {stage.note && (
                <div className="text-muted-foreground truncate text-[11px]">
                  {stage.note}
                </div>
              )}
            </div>

            <div className="bg-muted/40 h-2.5 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  // Floor at 2px so a stage of 1 is still visible rather than
                  // rounding away to nothing.
                  width: `max(0.5rem, ${pct}%)`,
                  backgroundColor: "var(--tier-warm)",
                }}
              />
            </div>

            <div className="text-right">
              <span className="font-mono text-sm tabular-nums">{stage.value}</span>
              {dropped !== null && dropped > 0 && (
                <span className="text-muted-foreground block font-mono text-[11px] tabular-nums">
                  −{dropped}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
