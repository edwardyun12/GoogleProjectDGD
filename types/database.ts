export type PartyStatus = "ready" | "running" | "ended";
export type MissionStatus = "pending" | "active" | "done";
export type MissionJudge = "self" | "auto_cards";

export interface Party {
  id: string;
  name: string;
  host_message: string;
  entry_code: string;
  status: PartyStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
}

export interface Participant {
  id: string;
  party_id: string;
  nickname: string;
  age: number | null;
  gender: string | null;
  mbti: string | null;
  appearance: string | null;
  card_token: string;
  created_at: string;
}

export interface Mission {
  id: string;
  party_id: string;
  content: string;
  duration_sec: number;
  order_index: number;
  kind: "scheduled" | "surprise";
  judge_type: MissionJudge;
  auto_target: number | null;
  status: MissionStatus;
  started_at: string | null;
  ends_at: string | null;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
