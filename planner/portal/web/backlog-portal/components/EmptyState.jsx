// What a tab shows when it has nothing to list: a title, one line of help and, where one applies, one action
// ({ label, onClick, id }). A tab shows this instead of any other empty message.
export default function EmptyState({ title, help, action }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {help && <p className="muted">{help}</p>}
      {action && <button type="button" id={action.id} onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
