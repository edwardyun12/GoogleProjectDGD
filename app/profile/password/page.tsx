import { AppBar } from "@/components/AppBar";
import { PasswordForm } from "@/components/PasswordForm";
import { requireParticipantSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  await requireParticipantSession();
  return (
    <main className="shell pad-b">
      <AppBar title="비밀번호 변경" backHref="/profile" />
      <div className="pad relative z-10 mt-4">
        <p className="mb-7 text-[15px] leading-6 text-white/50">파티 중에는 이름과 비밀번호로만 다시 입장할 수 있어요.</p>
        <PasswordForm />
      </div>
    </main>
  );
}
