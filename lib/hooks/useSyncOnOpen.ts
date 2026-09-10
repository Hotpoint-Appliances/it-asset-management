import * as React from "react";

/** Runs `sync()` synchronously during render, the moment `open` flips from false to true — the
 * React-documented "adjusting state when a prop changes" pattern
 * (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes),
 * used instead of a `useEffect` because this project's eslint config
 * (`react-hooks/set-state-in-effect`) flags synchronous setState-in-effect as a cascading-render
 * risk. Every phase-5-asset-lifecycle Dialog uses this to reset its form to the current asset
 * values each time it's reopened. */
export function useSyncOnOpen(open: boolean, sync: () => void) {
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) sync();
  }
}
