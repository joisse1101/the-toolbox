import { createRoot } from 'react-dom/client';
import './shared/style.css';

function Launcher() {
  return (
    <main className="page">
      <h1>Team lead tools</h1>
      <p className="muted">Local tools that keep their data as plain files in this repo.</p>
      <ul className="tool-list">
        <li>
          <a href="/backlog-portal/">
            <div className="card">
              <strong>Backlog portal</strong>
              Write user stories with acceptance criteria and keep them as CSV backlogs in <code>planner/data/user-stories/</code>.
            </div>
          </a>
        </li>
      </ul>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Launcher />);
