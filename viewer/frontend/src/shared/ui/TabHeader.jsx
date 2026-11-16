// The top line of every tab: its title on the left and its actions (buttons) on the right.
export default function TabHeader({ title, children }) {
  return (
    <div className="tab-header">
      <h2>{title}</h2>
      {children && <div className="tab-actions">{children}</div>}
    </div>
  );
}
