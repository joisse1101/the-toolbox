import { Link } from 'react-router';

export default function HomePage() {
  return (
    <main className="page">
      <h1>Backlog planner</h1>
      <p className="muted">Local tools that keep their data as plain files in this repo.</p>
      <ul className="tool-list">
        <li>
          <Link to="/backlog">
            <div className="card">
              <strong>Backlog portal</strong>
              Write user stories with acceptance criteria and keep them as CSV backlogs, one folder per backlog, in <code>viewer/data/</code>.
            </div>
          </Link>
        </li>
      </ul>
    </main>
  );
}
