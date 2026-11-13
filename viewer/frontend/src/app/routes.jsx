import { Navigate, Route, Routes } from 'react-router';
import HomePage from './HomePage.jsx';
import NotFoundPage from './NotFoundPage.jsx';
import BacklogTool from '../tools/backlog/BacklogTool.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/backlog" element={<Navigate replace to="/backlog/editor" />} />
      <Route path="/backlog/:tab" element={<BacklogTool />} />
      <Route path="/backlog-portal/*" element={<Navigate replace to="/backlog" />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
