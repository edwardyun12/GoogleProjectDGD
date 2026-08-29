import "server-only";

export function getServerEnv() {
  const values = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    sessionSecret: process.env.SESSION_SECRET,
  };

  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(`필수 환경변수가 없습니다: ${missing.join(", ")}`);
  }

  return values as { supabaseUrl: string; serviceRoleKey: string; sessionSecret: string };
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}
