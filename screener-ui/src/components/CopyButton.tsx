import { useState } from 'react';
import styles from './CopyButton.module.scss';

interface Props {
  text: string;
  label?: string;
  copiedLabel?: string;
}

export default function CopyButton({ text, label = 'Copy', copiedLabel = 'Copied!' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button type="button" className={styles.btn} onClick={handleClick}>
      {copied ? copiedLabel : label}
    </button>
  );
}
