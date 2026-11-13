import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { TABS, resolveTab } from '../tabs.ts';

// The open tab is the address's `:tab`. `settled` says that what `hasBacklog` and `hasReview` depend on has been read;
// until then the address is shown as it is, so a reload on /backlog/review does not fall back before the review file is known.
// Once settled, an address that names a tab that cannot be shown is replaced by the tab shown instead.
export function useTab({ settled, hasBacklog, hasReview }) {
  const { tab: requested } = useParams();
  const navigate = useNavigate();
  const tab = settled ? resolveTab(requested, { hasBacklog, hasReview }) : (TABS.includes(requested) ? requested : null);

  useEffect(() => {
    if (settled && tab && tab !== requested) navigate(`/backlog/${tab}`, { replace: true });
  }, [settled, tab, requested, navigate]);

  // `replace` swaps the history entry instead of adding one (for the fallbacks).
  const setTab = useCallback((next, { replace = false } = {}) => navigate(`/backlog/${next}`, { replace }), [navigate]);

  return { tab, setTab };
}
