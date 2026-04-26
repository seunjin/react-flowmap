import { Route, Routes } from 'react-router-dom';
import { App } from './app';
import { DashboardPage } from './pages/dashboard-page';
import { ReportsPage } from './pages/reports-page';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<DashboardPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
