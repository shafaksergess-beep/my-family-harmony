// Multi-step wizards whose final submit button replaces the Next button at
// the same position risk an unintended submission: a fast double-click on
// Next lands its second click on the freshly rendered submit button.
// Submissions within this window of reaching the step are treated as the
// remnant of that click and ignored.
export const SUBMIT_GUARD_WINDOW_MS = 600;

export function shouldIgnoreSubmit(stepEnteredAt: number, now: number): boolean {
  return now - stepEnteredAt < SUBMIT_GUARD_WINDOW_MS;
}
