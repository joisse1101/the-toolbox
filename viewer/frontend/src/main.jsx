import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './shared/style.css';
import './tools/backlog/backlog.css';
import AppRoutes from './app/routes.jsx';
import { ConfirmProvider } from './shared/ui/ConfirmDialog.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ConfirmProvider>
      <AppRoutes />
    </ConfirmProvider>
  </BrowserRouter>,
);
