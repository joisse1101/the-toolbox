// The backlog tool's tabs, in the order of the tab bar. Each one has the address /backlog/<tab>.
export const TABS = ['editor', 'stories', 'graph', 'proposed', 'lexicon', 'review', 'settings'];

// The tab to show for the address's tab. `null`: no such tab (the Not Found page). With no backlog open every tab
// falls back to settings, and review falls back to editor while the backlog has no review file.
export function resolveTab(requested, { hasBacklog, hasReview }) {
  if (!TABS.includes(requested)) return null;
  if (!hasBacklog) return 'settings';
  if (requested === 'review' && !hasReview) return 'editor';
  return requested;
}
