"use client";

import * as React from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
/** Year dropdown spans OLDEST_YEAR to this year + FUTURE_YEARS (narrowed by min/max): far enough
 * back for old purchase dates, far enough ahead for warranty expiry dates. */
const OLDEST_YEAR = 1970;
const FUTURE_YEARS = 15;

interface YMD {
  year: number;
  month: number; // 0-11
  day: number;
}

/** "YYYY-MM-DD" -> parts, or null. Parsed by hand (never `new Date(str)`, which treats a bare
 * date as UTC and shifts it a day in negative-offset timezones); same reason lib/db/dates.ts
 * builds date-only strings from local getters. */
function parse(value: string | undefined | null): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const check = new Date(year, month, day);
  if (check.getMonth() !== month || check.getDate() !== day) return null;
  return { year, month, day };
}

function toIso({ year, month, day }: YMD): string {
  return `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fromDate(d: Date): YMD {
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

function addDays(ymd: YMD, days: number): YMD {
  return fromDate(new Date(ymd.year, ymd.month, ymd.day + days));
}

function addMonths(ymd: YMD, months: number): YMD {
  const target = new Date(ymd.year, ymd.month + months, 1);
  const lastDay = new Date(
    target.getFullYear(),
    target.getMonth() + 1,
    0,
  ).getDate();
  return {
    year: target.getFullYear(),
    month: target.getMonth(),
    day: Math.min(ymd.day, lastDay),
  };
}

function daysIn(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDisplay(ymd: YMD): string {
  return `${ymd.day} ${MONTHS[ymd.month].slice(0, 3)} ${ymd.year}`;
}

export interface DatePickerProps {
  /** ISO date-only string ("YYYY-MM-DD"), or "" for no date. */
  value: string;
  onChange: (value: string) => void;
  id?: string;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}

/** Reusable date picker replacing the browser's native `<input type="date">`, which renders
 * differently per browser/OS and ignores the app's theme. Value in/out is an ISO "YYYY-MM-DD"
 * string, the same shape `<input type="date">` produced, so call sites swap in with no state or
 * API changes. Radix has no date-picker primitive, so this is hand-rolled (no new dependency)
 * with month / year dropdowns, min/max limits, and full keyboard support (arrows, PageUp/
 * PageDown, Home/End, Enter, Escape).
 *
 * The calendar renders inline, absolutely positioned under the trigger (flipping above when
 * there's no room), *not* portaled to `document.body`: inside a Radix Dialog anything portaled
 * outside the dialog content is treated as "outside" (pointer events blocked, click dismisses
 * the dialog). Escape is intercepted on `window` in the capture phase so closing the calendar
 * doesn't also close a parent dialog. The month/year dropdowns *are* portaled Radix Selects, so
 * while one is open the calendar leaves outside-clicks and Escape to it (see menuOpenRef). A
 * visually hidden `<input>` mirrors the value so native `required` form validation still works. */
export function DatePicker({
  value,
  onChange,
  id,
  min,
  max,
  required,
  disabled,
  placeholder = "Select date",
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const selected = parse(value);
  const minYmd = parse(min);
  const maxYmd = parse(max);
  const [open, setOpen] = React.useState(false);
  const [cursor, setCursor] = React.useState<YMD>(
    () => selected ?? fromDate(new Date()),
  );
  const [openUp, setOpenUp] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const popoverId = React.useId();
  /** A month/year dropdown is open: its content is portaled outside rootRef, so the calendar's
   * own outside-click and Escape handling must stand down until it closes. */
  const menuOpenRef = React.useRef(false);
  /** Move focus to the active day on the next cursor change: set on open and on grid keyboard
   * navigation, not for arrow-button or dropdown changes, which keep focus where it is. */
  const focusGridRef = React.useRef(false);

  const today = fromDate(new Date());

  function isDisabledDay(ymd: YMD) {
    const iso = toIso(ymd);
    return (
      (!!minYmd && iso < toIso(minYmd)) || (!!maxYmd && iso > toIso(maxYmd))
    );
  }

  function openPicker() {
    if (disabled) return;
    setCursor(selected ?? fromDate(new Date()));
    focusGridRef.current = true;
    menuOpenRef.current = false;
    setOpen(true);
  }

  function closePicker(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function selectDay(ymd: YMD) {
    if (isDisabledDay(ymd)) return;
    onChange(toIso(ymd));
    closePicker();
  }

  // Close on outside pointer-down.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (menuOpenRef.current) return;
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Escape closes only the calendar, never a parent Radix Dialog (its Escape listener is on
  // `document` in the capture phase; `window` capture runs first).
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || menuOpenRef.current) return;
      e.stopPropagation();
      closePicker();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  // Flip above the trigger if it would overflow the viewport, and keep it in view.
  React.useLayoutEffect(() => {
    if (!open || !popoverRef.current || !rootRef.current) return;
    const rootRect = rootRef.current.getBoundingClientRect();
    const height = popoverRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - rootRect.bottom;
    setOpenUp(spaceBelow < height + 8 && rootRect.top > height + 8);
  }, [open]);

  // Focus the active day when the popover opens or keyboard navigation moves the cursor.
  React.useEffect(() => {
    if (!open || !focusGridRef.current) return;
    focusGridRef.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>('[data-active="true"]')
      ?.focus({ preventScroll: true });
  }, [open, cursor]);

  function onGridKeyDown(e: React.KeyboardEvent) {
    let next: YMD | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(cursor, -1);
        break;
      case "ArrowRight":
        next = addDays(cursor, 1);
        break;
      case "ArrowUp":
        next = addDays(cursor, -7);
        break;
      case "ArrowDown":
        next = addDays(cursor, 7);
        break;
      case "PageUp":
        next = addMonths(cursor, e.shiftKey ? -12 : -1);
        break;
      case "PageDown":
        next = addMonths(cursor, e.shiftKey ? 12 : 1);
        break;
      case "Home":
        next = addDays(
          cursor,
          -((new Date(cursor.year, cursor.month, cursor.day).getDay() + 6) % 7),
        );
        break;
      case "End":
        next = addDays(
          cursor,
          6 -
            ((new Date(cursor.year, cursor.month, cursor.day).getDay() + 6) %
              7),
        );
        break;
    }
    if (next) {
      e.preventDefault();
      focusGridRef.current = true;
      setCursor(next);
    }
  }

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  const leading = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = daysIn(cursor.year, cursor.month);
  const cells: (YMD | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      year: cursor.year,
      month: cursor.month,
      day: i + 1,
    })),
  ];

  // Always include the cursor's year so an out-of-range value still shows in the dropdown.
  const fromYear = Math.min(
    Math.max(OLDEST_YEAR, minYmd?.year ?? OLDEST_YEAR),
    cursor.year,
  );
  const toYear = Math.max(
    Math.min(today.year + FUTURE_YEARS, maxYmd?.year ?? Infinity),
    cursor.year,
    fromYear,
  );
  const years = Array.from(
    { length: toYear - fromYear + 1 },
    (_, i) => fromYear + i,
  );

  /** A month is disabled when none of its days fall inside min/max. */
  function isDisabledMonth(year: number, month: number) {
    const first = toIso({ year, month, day: 1 });
    const last = toIso({ year, month, day: daysIn(year, month) });
    return (
      (!!minYmd && last < toIso(minYmd)) || (!!maxYmd && first > toIso(maxYmd))
    );
  }

  function jumpTo(year: number, month: number) {
    setCursor({
      year,
      month,
      day: Math.min(cursor.day, daysIn(year, month)),
    });
  }

  function onMenuOpenChange(menuOpen: boolean) {
    menuOpenRef.current = menuOpen;
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => (open ? closePicker(false) : openPicker())}
        className={cn(
          "border-border bg-background flex h-10 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm shadow-xs transition-colors",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
        )}
      >
        <span className="truncate">
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <CalendarDays className="text-muted-foreground h-4 w-4 shrink-0" />
      </button>
      {selected && !required && !disabled && (
        <button
          type="button"
          aria-label="Clear date"
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-9 -translate-y-1/2 rounded p-0.5 focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Mirrors the value so native `required` validation and form submission still work. */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        required={required}
        value={value}
        readOnly
        onFocus={() => triggerRef.current?.focus()}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
      />

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="Choose date"
          className={cn(
            "border-border bg-card text-card-foreground absolute right-0 z-50 w-76 max-w-[calc(100vw-2rem)] rounded-xl border p-3 shadow-lg",
            openUp ? "bottom-full mb-1.5" : "top-full mt-1.5",
          )}
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor(addMonths(cursor, -1))}
              className="hover:bg-muted focus-visible:ring-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <Select
              aria-label="Month"
              value={cursor.month}
              onChange={(e) => jumpTo(cursor.year, Number(e.target.value))}
              onOpenChange={onMenuOpenChange}
              className="h-8 min-w-0 flex-1 gap-1 pr-1.5 pl-2.5 font-medium shadow-none"
            >
              {MONTHS.map((name, m) => (
                <option
                  key={name}
                  value={m}
                  disabled={isDisabledMonth(cursor.year, m)}
                >
                  {name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Year"
              value={cursor.year}
              onChange={(e) => jumpTo(Number(e.target.value), cursor.month)}
              onOpenChange={onMenuOpenChange}
              className="h-8 w-[4.75rem] shrink-0 gap-1 pr-1.5 pl-2.5 font-medium shadow-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor(addMonths(cursor, 1))}
              className="hover:bg-muted focus-visible:ring-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div ref={gridRef} onKeyDown={onGridKeyDown}>
            <div className="text-muted-foreground mb-1 grid grid-cols-7 text-center text-xs">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>
            <div role="grid" className="grid grid-cols-7 gap-y-0.5">
              {cells.map((cell, i) => {
                if (!cell) return <span key={`blank-${i}`} />;
                const iso = toIso(cell);
                const isSelected = !!selected && iso === toIso(selected);
                const isToday = iso === toIso(today);
                const isActive = cell.day === cursor.day;
                const dayDisabled = isDisabledDay(cell);
                return (
                  <button
                    key={iso}
                    type="button"
                    role="gridcell"
                    data-active={isActive}
                    tabIndex={isActive ? 0 : -1}
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    disabled={dayDisabled}
                    onClick={() => selectDay(cell)}
                    className={cn(
                      "focus-visible:ring-ring mx-auto flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      "disabled:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                      isToday &&
                        !isSelected &&
                        "bg-foreground text-background hover:bg-foreground/85 font-semibold",
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex justify-between border-t pt-2">
            <button
              type="button"
              onClick={() => selectDay(today)}
              disabled={isDisabledDay(today)}
              className="text-primary focus-visible:ring-ring rounded px-1 text-sm hover:underline focus-visible:ring-2 focus-visible:outline-none disabled:no-underline disabled:opacity-40"
            >
              Today
            </button>
            {!required && selected && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  closePicker();
                }}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded px-1 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
