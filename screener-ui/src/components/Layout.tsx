import { NavLink, Outlet, Link } from 'react-router-dom';
import { Boundary } from './Boundary';
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
        <div className={styles.navFooter}>
          <Link to="/privacy" className={styles.navFooterLink}>Privacy</Link>
          <Link to="/data-removal" className={styles.navFooterLink}>Data removal</Link>
        </div>
      </nav>
      <main className={styles.main}>
        <Boundary>
          <Outlet />
        </Boundary>
      </main>
    </div>
  );
}
