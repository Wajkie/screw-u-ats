import { NavLink, Outlet } from 'react-router-dom';
import styles from './Layout.module.scss';

export default function Layout() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`;

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <NavLink to="/" className={styles.brand}>Screener</NavLink>
        <ul className={styles.navList}>
          <li><NavLink to="/" end className={linkClass}>Dashboard</NavLink></li>
          <li><NavLink to="/candidates/new" className={linkClass}>New Candidate</NavLink></li>
          <li><NavLink to="/openings" className={linkClass}>Openings</NavLink></li>
        </ul>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
