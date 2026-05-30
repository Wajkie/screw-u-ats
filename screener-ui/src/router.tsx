import { createBrowserRouter } from 'react-router-dom';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';

const Placeholder = ({ label }: { label: string }) => <p>{label}</p>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Placeholder label="Dashboard" /> },
      { path: 'candidates/new', element: <Placeholder label="New Candidate" /> },
      { path: 'candidates/:id', element: <Placeholder label="Candidate Detail" /> },
      { path: 'candidates/:id/jobs/:jobId', element: <Placeholder label="Job Status" /> },
      { path: 'candidates/:id/reports/:reportId', element: <Placeholder label="Report Detail" /> },
      { path: 'roles/:role', element: <Placeholder label="Role Leaderboard" /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
