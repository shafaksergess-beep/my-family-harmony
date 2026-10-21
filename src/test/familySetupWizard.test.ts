import { describe, it, expect } from "vitest";
import { shouldIgnoreSubmit, SUBMIT_GUARD_WINDOW_MS } from "@/lib/submitGuard";

// The wizard's Create button replaces the Next button at the same position
// on the final step, so a fast double-click on Next would otherwise submit
// the form with default values before the user reviews it.
describe("FamilySetupWizard submit guard", () => {
  it("ignores a submission fired 100ms after reaching the final step (double-click remnant)", () => {
    const enteredAt = 1_000_000;
    expect(shouldIgnoreSubmit(enteredAt, enteredAt + 100)).toBe(true);
  });

  it("ignores a submission at the exact moment the step opens", () => {
    const enteredAt = 1_000_000;
    expect(shouldIgnoreSubmit(enteredAt, enteredAt)).toBe(true);
  });

  it("allows a deliberate submission after the guard window has passed", () => {
    const enteredAt = 1_000_000;
    expect(shouldIgnoreSubmit(enteredAt, enteredAt + SUBMIT_GUARD_WINDOW_MS)).toBe(false);
    expect(shouldIgnoreSubmit(enteredAt, enteredAt + 5_000)).toBe(false);
  });
});
