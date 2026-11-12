import { createRoot } from 'react-dom/client';
import '../shared/style.css';
import './tool.css';
import App from './App.jsx';
import { ConfirmProvider } from './components/ConfirmDialog.jsx';

createRoot(document.getElementById('root')).render(<ConfirmProvider><App /></ConfirmProvider>);
