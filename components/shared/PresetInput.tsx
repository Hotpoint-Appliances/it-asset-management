"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface Preset {
  value: string;
  label: string;
}

/** Stands in for a "Custom…" option; never a real field value. */
const CUSTOM = "__custom__";

/** A numeric field that defaults to a dropdown of common values, with a "Custom…" escape hatch
 * that swaps in a plain number input (and a "Use a preset" link back). Built for the asset
 * form's useful life and salvage value, reusable for any field with a few standard answers.
 *
 * The value stays a string, same as a plain `<Input>`, so it drops into existing form state.
 * Presets match numerically ("7000" and "7000.00" are the same preset), and a value that isn't
 * one (an existing asset's 48 months, say) opens in custom mode. `controlProps` (e.g.
 * `fields.invalid(...)`'s aria attributes) go on whichever control is showing. */
export function PresetInput({
  id,
  value,
  onChange,
  presets,
  emptyLabel = "Not set",
  customLabel = "Custom…",
  inputProps,
  controlProps,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  presets: Preset[];
  /** Label for the empty option that clears the field. */
  emptyLabel?: string;
  customLabel?: string;
  /** Extra attributes for the custom number input (min, step, placeholder, ...). */
  inputProps?: Omit<
    React.ComponentProps<typeof Input>,
    "id" | "value" | "onChange" | "type"
  >;
  controlProps?: React.AriaAttributes;
}) {
  const matchingPreset = (v: string) =>
    v.trim() === ""
      ? undefined
      : presets.find((p) => Number(p.value) === Number(v));

  const [custom, setCustom] = React.useState(
    () => value.trim() !== "" && !matchingPreset(value),
  );
  // A value set from outside (a form reset, say) that no preset matches can only show as custom.
  if (!custom && value.trim() !== "" && !matchingPreset(value)) {
    setCustom(true);
  }

  // Switching modes unmounts the focused control, so the user's own switch moves focus onto the
  // control that replaces it (not on mount, or on the outside-value switch above).
  const focusOnSwitch = React.useRef(false);
  React.useEffect(() => {
    if (!focusOnSwitch.current) return;
    focusOnSwitch.current = false;
    document.getElementById(id)?.focus();
  }, [custom, id]);

  if (custom) {
    return (
      <div className="flex items-center gap-2">
        <Input
          {...inputProps}
          {...controlProps}
          id={id}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => {
            focusOnSwitch.current = true;
            setCustom(false);
            const preset = matchingPreset(value);
            onChange(preset ? preset.value : "");
          }}
          className="text-primary shrink-0 text-sm font-medium hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Use a preset
        </button>
      </div>
    );
  }

  return (
    <Select
      {...controlProps}
      id={id}
      value={matchingPreset(value)?.value ?? ""}
      onChange={(e) => {
        if (e.target.value === CUSTOM) {
          focusOnSwitch.current = true;
          setCustom(true);
          return;
        }
        onChange(e.target.value);
      }}
    >
      <option value="">{emptyLabel}</option>
      {presets.map((preset) => (
        <option key={preset.value} value={preset.value}>
          {preset.label}
        </option>
      ))}
      <option value={CUSTOM}>{customLabel}</option>
    </Select>
  );
}
