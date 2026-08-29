import Link from "next/link";
import { PasswordForm } from "@/components/PasswordForm";
import { requireParticipantSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  await requireParticipantSession();
  return <main className="mobile-shell page-pad"><Link href="/profile" className="font-bold text-black/50">← 프로필</Link><h1 className="mb-8 mt-5 text-4xl font-black">비밀번호 변경</h1><PasswordForm /></main>;
}
