import type { Story } from '#shared/types.ts';
import type { ReviewUnit } from '#shared/review/review.ts';
import type { GroupRef } from '#frontend/src/tools/backlog/shell/useBacklog.ts';
import type { BacklogActions } from '#frontend/src/tools/backlog/shell/useBacklog.ts';
import type { Level } from '#frontend/src/shared/lib/collapse.ts';
import TabHeader from '#frontend/src/shared/ui/TabHeader.tsx';
import EmptyState from '#frontend/src/shared/ui/EmptyState.tsx';
import ResizeHandle from '#frontend/src/shared/ui/ResizeHandle.tsx';
import useListWidth from '#frontend/src/shared/hooks/useListWidth.ts';
import StoryList from '#frontend/src/tools/backlog/shared/StoryList.tsx';
import type { OtherBacklogsIndex } from '#shared/backlog/other-backlogs.ts';
import StoryForm from '#frontend/src/tools/backlog/shared/story-form/StoryForm.tsx';

// The Editor tab: the story list beside the form of the selected story.
export default function EditorTab({
  hidden, stories, problems, others, suggestionCounts, selectedId, selected, selectedUnits, focusRequest, renumberDisabled, collapse, actions,
  onFocused, onAdd, onMove, onMoveGroup, onRenumber, onApplySuggestion, onDismissSuggestion, onMoveToProposed,
}: {
  hidden: boolean;
  stories: Story[];
  problems: Map<number, string[]>;
  others: OtherBacklogsIndex;
  suggestionCounts: Map<string, number>;
  selectedId: number | null;
  selected: Story | null | undefined;
  selectedUnits: ReviewUnit[];
  focusRequest: { id: string | undefined } | null;
  renumberDisabled: boolean;
  collapse: { closed: ReadonlySet<string>; toggleKey: (key: string) => void; toggleLevel: (level: Level) => void };
  actions: BacklogActions;
  onFocused: () => void;
  onAdd: () => void;
  onMove: (id: number, epic: string, beforeId: number | null) => void;
  onMoveGroup: (group: GroupRef, beforeKey: string | null) => void;
  onRenumber: () => void;
  onApplySuggestion: (unit: ReviewUnit) => void;
  onDismissSuggestion: (unit: ReviewUnit) => void;
  onMoveToProposed: (story: Story) => void;
}) {
  const list = useListWidth('editor');
  return (
    <div id="editor" role="tabpanel" aria-labelledby="tabEditor" hidden={hidden}>
      <TabHeader title="Editor" />
      {!hidden && !stories.length && (
        <EmptyState title="No stories yet" help="Draft a story here, or use the explore and propose skills." action={{ id: 'addStoryBtn', label: 'Add story', onClick: onAdd }} />
      )}
      {!hidden && stories.length > 0 && (
        <div className="editor" style={list.style}>
          <StoryList stories={stories} problems={problems} suggestionCounts={suggestionCounts} selectedId={selectedId} onSelect={actions.selectStory} onAdd={onAdd} onMove={onMove} onMoveGroup={onMoveGroup} onRenumber={onRenumber} renumberDisabled={renumberDisabled} collapse={collapse} />
          {selected && (
            <StoryForm
              story={selected} stories={stories} problems={problems} others={others} suggestions={selectedUnits} focusRequest={focusRequest}
              onFocused={onFocused} onEdit={actions.editStory} onCommitEpic={actions.commitEpic} onOpen={actions.selectStory}
              onApplySuggestion={onApplySuggestion} onDismissSuggestion={onDismissSuggestion} onMoveToProposed={onMoveToProposed} onDelete={actions.deleteSelected}
            />
          )}
          <ResizeHandle className="list-divider" {...list.handleProps} />
        </div>
      )}
    </div>
  );
}
