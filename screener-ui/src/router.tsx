import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import NewCandidate from './pages/NewCandidate';
import CandidateDetail from './pages/CandidateDetail';
import JobStatus from './pages/JobStatus';
import ReportDetail from './pages/ReportDetail';
import RoleLeaderboard from './pages/RoleLeaderboard';
import Openings from './pages/Openings';
import NewOpening from './pages/NewOpening';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'candidates/new', element: <NewCandidate /> },
      { path: 'candidates/:id', element: <CandidateDetail /> },
      { path: 'candidates/:id/jobs/:jobId', element: <JobStatus /> },
      { path: 'candidates/:id/reports/:reportId', element: <ReportDetail /> },
      { path: 'roles/:role', element: <RoleLeaderboard /> },
      { path: 'openings', element: <Openings /> },
      { path: 'openings/new', element: <NewOpening /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
