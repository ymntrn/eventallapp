/** Inline stroke icons (24×24, currentColor). Decorative: always aria-hidden. */
type P = { size?: number; filled?: boolean };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
});

export const IconHeart = ({ size = 22, filled = false }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
  </svg>
);

export const IconSliders = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const IconBack = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const IconClose = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconSearch = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
);

export const IconMap = ({ size = 22, filled = false }: P) => (
  <svg {...base(size)}>
    <path d="M12 21s-6.5-6-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21Z" fill={filled ? 'currentColor' : 'none'} />
    <circle cx="12" cy="9.8" r="2.3" fill={filled ? 'var(--bg)' : 'none'} stroke={filled ? 'var(--bg)' : 'currentColor'} />
  </svg>
);

export const IconUser = ({ size = 22, filled = false }: P) => (
  <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
    <circle cx="12" cy="8" r="3.8" />
    <path d="M4.5 20.5c.9-3.9 3.9-6 7.5-6s6.6 2.1 7.5 6Z" />
  </svg>
);

export const IconGear = ({ size = 22, filled = false }: P) => (
  <svg {...base(size)}>
    <path
      d="M12 3.5l1.6 1.9 2.4-.5.8 2.3 2.3.8-.5 2.4 1.9 1.6-1.9 1.6.5 2.4-2.3.8-.8 2.3-2.4-.5L12 20.5l-1.6-1.9-2.4.5-.8-2.3-2.3-.8.5-2.4L3.5 12l1.9-1.6-.5-2.4 2.3-.8.8-2.3 2.4.5Z"
      fill={filled ? 'currentColor' : 'none'}
    />
    <circle cx="12" cy="12" r="2.8" fill={filled ? 'var(--bg)' : 'none'} stroke={filled ? 'var(--bg)' : 'currentColor'} />
  </svg>
);

export const IconLocate = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <circle cx="12" cy="12" r="6.5" />
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
  </svg>
);

export const IconExternal = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconChevron = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);
