// Shared helpers for the public member/profile UI.
// Anywhere a username (or avatar) is shown it should route here so the public
// profile URL lives in one place instead of being re-derived per component.

/** Absolute app path to a member's public profile page. */
export const memberProfileHref = (username: string): string =>
  `/profile/${encodeURIComponent(username)}`;
