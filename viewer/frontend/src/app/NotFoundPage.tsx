import { Link } from 'react-router';
import EmptyState from '../shared/ui/EmptyState.tsx';

export default function NotFoundPage() {
  return (
    <main className="page">
      <h1>Backlog planner</h1>
      <EmptyState title="Page not found" help="There is nothing at this address." />
      <p><Link to="/">&larr; Back to all tools</Link></p>
    </main>
  );
}
