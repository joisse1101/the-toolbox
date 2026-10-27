import { createRoot } from 'react-dom/client';
import './shared/style.css';

function Launcher() {
  return (
    <main className="page">
      <h1>Team lead tools</h1>
      <p className="muted">Local tools that keep their data as plain files in this repo.</p>
      <ul className="tool-list">
        <li>
          <a href="/user-story-generator/">
            <div className="card">
              <strong>User story generator</strong>
              Write user stories with acceptance criteria and keep them as CSV backlogs in <code>planner/data/user-stories/</code>.
            </div>
          </a>
        </li>
      </ul>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<Launcher />);
