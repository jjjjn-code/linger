"use client";

// A labelled 1–10 slider used for both desire and positive impact.
// Quiet, precise, with the current value shown clearly to the right.

interface ScoreSliderProps {
  label: string;
  hint?: string;
  value: number;
  onChange: (value: number) => void;
  id?: string;
}

export default function ScoreSlider({
  label,
  hint,
  value,
  onChange,
  id,
}: ScoreSliderProps) {
  const inputId = id ?? `slider-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        <span className="tabular-nums text-sm font-semibold text-ink">
          {value}
          <span className="text-ink-faint font-normal"> / 10</span>
        </span>
      </div>
      <input
        id={inputId}
        className="slider mt-1.5"
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <p className="text-meta text-ink-faint -mt-0.5">{hint}</p> : null}
    </div>
  );
}
