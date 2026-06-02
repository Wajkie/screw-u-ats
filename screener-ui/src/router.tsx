import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';
import Dashboard from './pages/Dashboard';
import NewCandidate from './pages/NewCandidate';
import CandidateDetail from './pages/CandidateDetail';
import JobStatus from './pages/JobStatus';
import ReportDetail from './pages/ReportDetail';

const Placeholder = ({ label }: { label: string }) => <p>{label}</p>;

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
      { path: 'roles/:role', element: <Placeholder label="Role Leaderboard" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
