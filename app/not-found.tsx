import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell grid min-h-dvh place-items-center p-6">
      <section className="text-center">
        <p className="text-7xl font-extrabold text-acid">404</p>
        <h1 className="mt-4 text-2xl font-extrabold">페이지를 찾을 수 없어요</h1>
        <Link href="/enter" className="btn-acid mt-6 w-full">입장 화면으로</Link>
      </section>
    </main>
  );
}
