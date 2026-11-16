import { Navigate, Route, Routes } from 'react-router';
import HomePage from './HomePage.tsx';
import NotFoundPage from './NotFoundPage.tsx';
import BacklogTool from '../tools/backlog/BacklogTool.tsx';

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
