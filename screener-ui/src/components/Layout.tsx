import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <>
      <nav>
        <NavLink to="/">Dashboard</NavLink>
        <NavLink to="/candidates/new">New Candidate</NavLink>
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}
