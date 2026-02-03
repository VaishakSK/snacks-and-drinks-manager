export function SelectionTile({ icon, title, children }) {
  return (
    <div className="choice-card">
      <div className="choice-icon">{icon}</div>
      <div>
        <div className="choice-title">{title}</div>
        <div className="choice-content">{children}</div>
      </div>
    </div>
  );
}

export function CupIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7h12v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7z" />
      <path d="M15 8h3a3 3 0 0 1 0 6h-3" />
      <path d="M7 4v2" />
      <path d="M11 4v2" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5a7.5 7.5 0 0 1-10.5-10.5 7 7 0 1 0 10.5 10.5z" />
    </svg>
  );
}

export function SnackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="6" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="14" cy="12" r="1" />
      <circle cx="11" cy="14" r="1" />
    </svg>
  );
}

export function MugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="6" width="9" height="12" rx="2" />
      <path d="M14 8h2a3 3 0 0 1 0 6h-2" />
      <path d="M8 4v2" />
    </svg>
  );
}

export function BeanIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8.5 4c-2 0-4 2-4 6s2 10 4 10 4-4 4-10-2-6-4-6z" />
      <path d="M8.5 4c1 3 1 9 0 16" />
      <path d="M15.5 4c-2 0-4 2-4 6s2 10 4 10 4-4 4-10-2-6-4-6z" />
      <path d="M15.5 4c-1 3-1 9 0 16" />
    </svg>
  );
}

export function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14c6-8 12-8 16-8-1 7-5 11-12 12-3 0-4-2-4-4z" />
      <path d="M8 14c2-2 4-3 8-4" />
    </svg>
  );
}

export function GlassIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h12l-2 14a4 4 0 0 1-4 3h0a4 4 0 0 1-4-3L6 4z" />
      <path d="M8 9h8" />
    </svg>
  );
}

export function SandwichIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9 6 9-6" />
      <path d="M4 10h16" />
      <path d="M5 16h14" />
    </svg>
  );
}

export function CookieIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="6" />
      <circle cx="10" cy="10" r="1" />
      <circle cx="14" cy="13" r="1" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

export function BowlIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12a8 8 0 0 0 16 0" />
      <path d="M6 12h12" />
      <path d="M7 16h10" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M4 10h16" />
    </svg>
  );
}
