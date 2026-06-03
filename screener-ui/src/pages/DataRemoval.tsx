import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './DataRemoval.module.scss';

type Status = 'idle' | 'pending' | 'success' | 'error';

function encode(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

export default function DataRemoval() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const handleSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setStatus('pending');
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode({
        'form-name': 'data-removal',
        name,
        email,
        github_username: githubUsername,
        message,
      }),
    })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  };

  if (status === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.successBox}>
          <h1 className={styles.heading}>Request received</h1>
          <p>We'll remove your data within 30 days and confirm by email.</p>
          <Link to="/" className={styles.backLink}>← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Request Data Removal</h1>
      <p className={styles.description}>
        Fill in the form below and we will delete all data associated with your profile within 30 days.
        For questions, see our <Link to="/privacy" className={styles.link}>privacy policy</Link>.
      </p>

      <form
        name="data-removal"
        onSubmit={handleSubmit}
        className={styles.form}
        data-netlify="true"
        netlify-honeypot="bot-field"
      >
        <input type="hidden" name="form-name" value="data-removal" />
        <label className={styles.label} style={{ display: 'none' }}>
          Don't fill this out: <input name="bot-field" />
        </label>

        <label className={styles.label}>
          Full name *
          <input
            className={styles.input}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </label>

        <label className={styles.label}>
          Email address *
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </label>

        <label className={styles.label}>
          GitHub username
          <input
            className={styles.input}
            value={githubUsername}
            onChange={e => setGithubUsername(e.target.value)}
            placeholder="octocat"
          />
        </label>

        <label className={styles.label}>
          Additional information
          <textarea
            className={styles.textarea}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Any context that helps us identify your data…"
          />
        </label>

        {status === 'error' && (
          <p className={styles.errorMsg}>Something went wrong. Please try again or email us directly.</p>
        )}

        <button type="submit" disabled={status === 'pending'} className={styles.submit}>
          {status === 'pending' ? 'Sending…' : 'Submit request'}
        </button>
      </form>
    </div>
  );
}
