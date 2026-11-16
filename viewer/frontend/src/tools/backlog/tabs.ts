// The backlog tool's tabs, in the order of the tab bar. Each one has the address /backlog/<tab>.
export const TABS = ['editor', 'stories', 'graph', 'proposed', 'lexicon', 'review', 'settings'] as const;
export type TabName = (typeof TABS)[number];

export const isTab = (name: string | undefined): name is TabName => TABS.some((tab) => tab === name);

// The tab to show for the address's tab. `null`: no such tab (the Not Found page). With no backlog open every tab
// falls back to settings, and review falls back to editor while the backlog has no review file.
export function resolveTab(requested: string | undefined, { hasBacklog, hasReview }: { hasBacklog: boolean; hasReview: boolean }): TabName | null {
  if (!isTab(requested)) return null;
  if (!hasBacklog) return 'settings';
  if (requested === 'review' && !hasReview) return 'editor';
  return requested;
}
