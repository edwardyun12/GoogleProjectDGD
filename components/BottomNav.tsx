import Link from "next/link";

const items = [
  { href: "/home", label: "홈", icon: "⌂" },
  { href: "/card", label: "카드", icon: "▤" },
  { href: "/my_qr", label: "내 QR", icon: "▦" },
];

export function BottomNav({ current }: { current: string }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-md border-t border-black/10 bg-white/95 px-4 pt-3 backdrop-blur">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-xs font-bold ${current === item.href ? "text-violet" : "text-black/45"}`}
        >
          <span className="text-2xl leading-none">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
