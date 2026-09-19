/**
 * The test environment, and the four things jsdom does not implement.
 *
 * Everything else is the real thing: `XMLHttpRequest` is jsdom's (MSW patches
 * it), `Blob` and `FormData` are jsdom's, and the components are rendered by
 * React. The stubs below are for browser APIs jsdom has no implementation of,
 * and each one is written so that a test can still assert on it.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./tests/msw/server";
import { captureNativeXhr } from "./tests/transport/nativeXhr";

// Before `server.listen()` below, while the global still points at jsdom's own
// implementation. See `tests/transport/nativeXhr.ts`.
captureNativeXhr(globalThis.XMLHttpRequest);

// Object URLs. jsdom has no `createObjectURL` at all, and the app revokes them
// on unmount and on reset, so the stub has to be a real, spy-able pair.
let objectUrlCounter = 0;
URL.createObjectURL = (() =>
  `blob:jsdom/${++objectUrlCounter}`) as typeof URL.createObjectURL;
URL.revokeObjectURL = (() => undefined) as typeof URL.revokeObjectURL;

// The clipboard is deliberately left alone. `userEvent.setup()` installs its
// own working clipboard stub on the window, which is why the tests read back
// what was copied with `user.clipboard.readText()` rather than spying on
// `navigator.clipboard` — a spy installed before `setup()` is simply replaced.

// An unexpected request is a failing test, not a silent 404 that renders as an
// error state nobody meant to exercise.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => server.close());
