## Why

A story can be locked one at a time, in its form or through the Stories tab's tick boxes. To fix a whole feature or epic that is settled, the user has to tick every story or open each one. The Editor's story list already shows Epic and Feature headers, so the lock should be reachable from there.

## What Changes

- Each Epic and Feature header in the Editor's story list gets a lock button that locks or unlocks every story in that group.
- The button locks the group when any story in it is unlocked, and unlocks it when all are locked. Stories without an ID (blank Epic) are skipped, and the user is told how many.
- The header shows the group's state, derived from its stories: 🔒 when all are locked, a partial mark when some are, nothing when none are.
- A group lock is a bulk action, not stored state. It sets the existing per-story `Locked` column, so a story added to or dragged into the group later is unlocked until the group is locked again. Nothing about what a locked story is, or what it allows, changes.
- The Proposed tab's list (which shares the component) gets no lock button, because proposed stories cannot be locked.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-story-editor`: adds a requirement "Lock and unlock a group" next to "Lock a story" and "Lock and unlock selected stories".

## Impact

- `app/frontend/user-story-generator/components/StoryList.jsx` (header button and state mark), `App.jsx` and `hooks/useBacklog.js` (a group action over the existing `lockStories` / `unlockStories`), `tool.css` (button and partial mark).
- No change to `core/`, the CSV format, the server, the skills or the MCP tools.
