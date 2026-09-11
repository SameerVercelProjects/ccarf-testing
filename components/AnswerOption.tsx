"use client";

export type AnswerVisualState =
  | "neutral" // not selected, not submitted
  | "selected" // selected, not submitted (blue)
  | "correct" // a correct answer (green)
  | "incorrect" // selected but wrong (red)
  | "muted"; // unselected after submit

const stateStyles: Record<AnswerVisualState, string> = {
  neutral:
    "border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50",
  selected: "border-brand-500 bg-brand-50 ring-1 ring-brand-200",
  correct: "border-green-400 bg-green-50",
  incorrect: "border-red-400 bg-red-50",
  muted: "border-slate-200 bg-white",
};

const markerStyles: Record<AnswerVisualState, string> = {
  neutral: "border-slate-300 text-transparent",
  selected: "border-brand-500 bg-brand-500 text-white",
  correct: "border-green-500 bg-green-500 text-white",
  incorrect: "border-red-500 bg-red-500 text-white",
  muted: "border-slate-300 text-transparent",
};

/**
 * A clickable answer card. The whole card is the click target, not just the
 * radio/checkbox. Locked cards are read-only.
 */
export default function AnswerOption({
  label,
  text,
  multiple,
  checked,
  visualState,
  locked,
  onToggle,
}: {
  label: number;
  text: string;
  multiple: boolean;
  checked: boolean;
  visualState: AnswerVisualState;
  locked: boolean;
  onToggle: (label: number) => void;
}) {
  const marker = markerStyles[visualState];
  const shape = multiple ? "rounded-md" : "rounded-full";

  return (
    <button
      type="button"
      disabled={locked}
      aria-pressed={checked}
      onClick={() => onToggle(label)}
      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
        stateStyles[visualState]
      } ${locked ? "cursor-default" : "cursor-pointer"}`}
    >
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center border ${shape} ${marker}`}
      >
        {/* check glyph shown when the marker is filled */}
        <svg
          viewBox="0 0 20 20"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            d="M4 10l4 4 8-9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-slate-800">{text}</span>
    </button>
  );
}
