import { useState } from 'react';

interface Props {
  text: string;
  label?: string;
  copiedLabel?: string;
}

const CopyButton: React.FC<Props> = ({ text, label = 'Copy', copiedLabel = 'Copied!' }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button type="button" className="copy-btn" onClick={handleClick}>
      {copied ? copiedLabel : label}
    </button>
  );
};

export default CopyButton;
