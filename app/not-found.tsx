import Link from "next/link";

export default function NotFound() {
  return <main className="mobile-shell grid min-h-dvh place-items-center p-6"><section className="text-center"><p className="text-7xl font-black text-violet">404</p><h1 className="mt-4 text-2xl font-black">페이지를 찾을 수 없어요</h1><Link href="/enter" className="btn-primary mt-6">입장 화면으로</Link></section></main>;
}
