import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { getServerEnv } from "@/lib/env";

const PARTICIPANT_COOKIE = "htb_session";
const HOST_COOKIE = "htb_host";

export interface ParticipantSession {
  participantId: string;
  partyId: string;
}

function key() {
  return new TextEncoder().encode(getServerEnv().sessionSecret);
}

async function sign(payload: Record<string, string>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key());
}

async function verify<T>(token?: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as T;
  } catch {
    return null;
  }
}

export async function setParticipantSession(session: ParticipantSession) {
  const jar = await cookies();
  jar.set(PARTICIPANT_COOKIE, await sign({ participantId: session.participantId, partyId: session.partyId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function getParticipantSession() {
  const jar = await cookies();
  return verify<ParticipantSession>(jar.get(PARTICIPANT_COOKIE)?.value);
}

export async function requireParticipantSession() {
  const session = await getParticipantSession();
  if (!session) throw new Error("로그인이 필요합니다.");
  return session;
}

export async function setHostSession(partyId: string) {
  const jar = await cookies();
  jar.set(HOST_COOKIE, await sign({ partyId, role: "host" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function hasHostSession(partyId: string) {
  const jar = await cookies();
  const payload = await verify<{ partyId: string; role: string }>(jar.get(HOST_COOKIE)?.value);
  return payload?.role === "host" && payload.partyId === partyId;
}
