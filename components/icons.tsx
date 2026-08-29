type IconProps = { className?: string };

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ className = "h-5 w-5", children }: IconProps & { children: React.ReactNode }) {
  return <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>{children}</svg>;
}

export const BellIcon = (p: IconProps) => <Svg {...p}><path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></Svg>;
export const ChevronLeftIcon = (p: IconProps) => <Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRightIcon = (p: IconProps) => <Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const HomeIcon = (p: IconProps) => <Svg {...p}><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /></Svg>;
export const CardsIcon = (p: IconProps) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 10h5M7 14h8" /></Svg>;
export const ClockIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></Svg>;
export const TrophyIcon = (p: IconProps) => <Svg {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 2.5M17 6h2.5A2.5 2.5 0 0 1 17 8.5" /><path d="M12 14v3M9 20h6M10 17h4" /></Svg>;
export const ShirtIcon = (p: IconProps) => <Svg {...p}><path d="M8.5 4 5 6l-1.5 4 3 1V20h11v-9l3-1L19 6l-3.5-2a3.5 3.5 0 0 1-7 0z" /></Svg>;
export const UsersIcon = (p: IconProps) => <Svg {...p}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3.2 3.2 0 0 1 0 5M17.5 13.8A5.5 5.5 0 0 1 20.5 19" /></Svg>;
export const GiftIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M3.5 13h17M12 9v11" /><path d="M12 9S10.5 4.5 8.4 4.5a2 2 0 0 0 0 4.5zM12 9s1.5-4.5 3.6-4.5a2 2 0 0 1 0 4.5z" /></Svg>;
export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const TrashIcon = (p: IconProps) => <Svg {...p}><path d="M4 7h16M9.5 7V5h5v2M6.5 7l.8 13h9.4l.8-13M10.5 11v5M13.5 11v5" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="M5 12.5 10 17l9-10" /></Svg>;
export const ScanIcon = (p: IconProps) => <Svg {...p}><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" /></Svg>;
export const ImageIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" /></Svg>;
export const CrownIcon = (p: IconProps) => <Svg {...p}><path d="M4 17h16M4.5 8.5 8 12l4-6 4 6 3.5-3.5L18 17H6z" /></Svg>;
export const DragIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" className={p.className ?? "h-5 w-5"} aria-hidden fill="currentColor">
    {[8, 12, 16].flatMap((y) => [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
  </svg>
);
export const WarningIcon = (p: IconProps) => <Svg {...p}><path d="M12 4.5 21 19H3z" /><path d="M12 10v4M12 16.5v.5" /></Svg>;
export const InfoIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.5" /></Svg>;
export const PencilIcon = (p: IconProps) => <Svg {...p}><path d="m4 20 .8-3.6L15.6 5.6a1.8 1.8 0 0 1 2.6 0l1.2 1.2a1.8 1.8 0 0 1 0 2.6L8.6 19.2z" /></Svg>;
export const SunIcon = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3.8" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></Svg>;
export const FlashIcon = (p: IconProps) => <Svg {...p}><path d="M9 3h6v3l-1 2h2l-5 13 1-8H9l1-5H8z" /></Svg>;
export const ExchangeIcon = (p: IconProps) => <Svg {...p}><path d="M4 9h14l-3-3M20 15H6l3 3" /></Svg>;
export const PersonPlusIcon = (p: IconProps) => <Svg {...p}><circle cx="10" cy="8" r="3.2" /><path d="M4 19a6 6 0 0 1 10.5-4M17.5 15v5M15 17.5h5" /></Svg>;
export const CalendarIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3.5v3M16 3.5v3M9.5 15l2 2 3.5-3.5" /></Svg>;
export const GridIcon = (p: IconProps) => (
  <svg viewBox="0 0 24 24" className={p.className ?? "h-5 w-5"} aria-hidden fill="currentColor">
    <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" />
  </svg>
);
export const HeartIcon = (p: IconProps) => <Svg {...p}><path d="M12 19.5S4 14.8 4 9.9A3.9 3.9 0 0 1 12 7.6 3.9 3.9 0 0 1 20 9.9c0 4.9-8 9.6-8 9.6z" /></Svg>;
export const PersonCardIcon = (p: IconProps) => <Svg {...p}><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9.5" cy="11" r="2.2" /><path d="M6 16.4a3.8 3.8 0 0 1 7 0M15 10h3.5M15 13.5h3.5" /></Svg>;
export const ChatIcon = (p: IconProps) => <Svg {...p}><path d="M20 12a7.5 7.5 0 0 1-11 6.6L4.5 20l1.3-4A7.5 7.5 0 1 1 20 12z" /><path d="M9 12h.01M12 12h.01M15 12h.01" /></Svg>;
export const EyeIcon = (p: IconProps) => <Svg {...p}><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" /><circle cx="12" cy="12" r="2.8" /></Svg>;
export const EyeOffIcon = (p: IconProps) => <Svg {...p}><path d="M3 3l18 18M10.6 6.3A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a15 15 0 0 1-3.4 3.9M6.5 8.1A15.2 15.2 0 0 0 2.5 12S6 18 12 18a8.9 8.9 0 0 0 3.3-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></Svg>;
export const TargetIcon = (p: IconProps) => <Svg {...p}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><circle cx="12" cy="10.5" r="2.6" /><path d="M8 17a4.3 4.3 0 0 1 8 0" /></Svg>;

/** 앱 전반에서 브랜드 마크처럼 쓰는 QR 글리프 */
export function QrGlyph({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M3 3h8v8H3zm2 2v4h4V5z" /><path d="M13 3h8v8h-8zm2 2v4h4V5z" /><path d="M3 13h8v8H3zm2 2v4h4v-4z" />
      <rect x="6" y="6" width="2" height="2" /><rect x="16" y="6" width="2" height="2" /><rect x="6" y="16" width="2" height="2" />
      <rect x="13" y="13" width="2" height="2" /><rect x="17" y="13" width="2" height="2" /><rect x="15" y="15" width="2" height="2" />
      <rect x="19" y="15" width="2" height="2" /><rect x="13" y="17" width="2" height="2" /><rect x="17" y="17" width="2" height="2" />
      <rect x="19" y="19" width="2" height="2" /><rect x="15" y="19" width="2" height="2" />
    </svg>
  );
}
