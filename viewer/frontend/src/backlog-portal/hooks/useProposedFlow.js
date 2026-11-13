import { useEffect, useState } from 'react';
import { acceptProposed, moveToProposed as moveStoryToProposed } from '../../../../logic/backlog/proposals.js';
import { openUnitsFor } from '../../../../logic/review/review.js';
import { useProposals } from './useProposals.js';

// Proposed stories for the open backlog (its proposals file; the tab is always there, the file may not be), and the
// moves between the backlog and Proposed. `review` is the useReview result, used when a moved story has suggestions.
export function useProposedFlow({ current, stories, backlog, initials, actions, review, ask, reveal }) {
  const proposals = useProposals(current, backlog?.headers, initials);
  const [proposedNotice, setProposedNotice] = useState(null);
  useEffect(() => setProposedNotice(null), [current]);

  // Move proposed stories into the backlog. Nothing changes when acceptProposed refuses. The backlog is replaced
  // first and the proposals second, so a crash between the two saves leaves a duplicate rather than a lost story.
  const accept = (ids) => {
    const result = acceptProposed(stories, proposals.stories, ids, backlog.headers, initials);
    if (result.error) return setProposedNotice({ kind: 'error', text: result.error });
    actions.replaceStories(result.backlog);
    proposals.actions.replaceStories(result.proposals);
    result.accepted.forEach((story) => reveal(story.epic, story.feature));
    const names = result.accepted.map((s) => s.code).join(', ');
    setProposedNotice({ kind: 'ok', text: `Accepted ${result.accepted.length === 1 ? '1 story' : `${result.accepted.length} stories`} into the backlog: ${names}.` });
  };
  const acceptSelected = (ids) => ids.size && accept(new Set(ids));
  const acceptAll = () => accept(new Set(proposals.stories.map((s) => s.id)));

  // Editor -> Proposed for the open story. Its open review suggestions are marked dismissed (after a confirm, only
  // when there are any). Order: backlog, proposals, review, like accept, so a crash leaves a duplicate, not a lost story.
  const moveToProposed = async (story) => {
    const result = moveStoryToProposed(stories, proposals.stories, story.id, backlog.headers, initials);
    if (result.error) return review.notify(result.error);
    const units = openUnitsFor(review.rows, story.code);
    const message = `${story.code} has ${units.length} open review suggestion${units.length > 1 ? 's' : ''}. Moving it to Proposed marks ${units.length > 1 ? 'them' : 'it'} as dismissed.`;
    if (units.length && !(await ask({ title: `Move ${story.code} to Proposed?`, message, confirmLabel: 'Move to Proposed' }))) return;
    actions.replaceStories(result.backlog);
    proposals.actions.replaceStories(result.proposals);
    if (units.length) review.decide(units.flatMap((u) => u.indexes), 'dismissed');
    // The stories below it were renumbered: their open suggestions follow them. Links to the moved story now name its placeholder.
    review.retarget(new Map([...result.recoded, [story.code, result.moved.code]]));
    setProposedNotice({ kind: 'ok', text: `Moved ${story.code} to Proposed as ${result.moved.code}.` }); // shown in the Proposed tab
  };

  return { proposals, proposedNotice, acceptSelected, acceptAll, moveToProposed };
}
