import { Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import styles from './Boundary.module.scss';

interface ErrorBoundaryState { error: Error | null }
interface ErrorBoundaryProps { children: ReactNode; fallback: ReactNode }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Boundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

function Spinner() {
  return (
    <div className={styles.spinnerWrap} aria-label="Loading">
      <div className={styles.spinner} />
    </div>
  );
}

function ErrorState({ error }: { error?: Error | null }) {
  return (
    <div className={styles.errorState} role="alert">
      <p className={styles.errorTitle}>Something went wrong</p>
      {error?.message && <p className={styles.errorMessage}>{error.message}</p>}
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  pending?: boolean;
}

export function Boundary({ children, fallback, pending }: BoundaryProps) {
  return (
    <ErrorBoundary fallback={<ErrorState />}>
      <Suspense fallback={fallback ?? <Spinner />}>
        <div className={styles.wrap}>
          {children}
          {pending && <div className={styles.pendingOverlay} aria-hidden="true"><Spinner /></div>}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
