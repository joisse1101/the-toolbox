import TabHeader from '../../../../shared/ui/TabHeader.tsx';
import EmptyState from '../../../../shared/ui/EmptyState.tsx';
import ResizeHandle from '../../../../shared/ui/ResizeHandle.tsx';
import useListWidth from '../../../../shared/hooks/useListWidth.ts';
import StoryList from '../../shared/StoryList.tsx';
import StoryForm from '../../shared/story-form/StoryForm.tsx';

// The Editor tab: the story list beside the form of the selected story.
export default function EditorTab({
  hidden, stories, problems, suggestionCounts, selectedId, selected, selectedUnits, focusRequest, renumberDisabled, collapse, actions,
  onFocused, onAdd, onMove, onMoveGroup, onRenumber, onApplySuggestion, onDismissSuggestion, onMoveToProposed,
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
              story={selected} stories={stories} problems={problems} suggestions={selectedUnits} focusRequest={focusRequest}
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
