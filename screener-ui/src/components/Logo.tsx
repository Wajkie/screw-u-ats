export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect x="2"  y="14" width="6" height="8" rx="1.5" fill="currentColor" opacity="0.45" />
      <rect x="9"  y="8"  width="6" height="14" rx="1.5" fill="currentColor" opacity="0.72" />
      <rect x="16" y="2"  width="6" height="20" rx="1.5" fill="currentColor" />
    </svg>
  );
}
