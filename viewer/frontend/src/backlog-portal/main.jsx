import { createRoot } from 'react-dom/client';
import '../shared/style.css';
import '../tools/backlog/backlog.css';
import App from '../tools/backlog/BacklogTool.jsx';
import { ConfirmProvider } from '../shared/ui/ConfirmDialog.jsx';

createRoot(document.getElementById('root')).render(<ConfirmProvider><App /></ConfirmProvider>);
