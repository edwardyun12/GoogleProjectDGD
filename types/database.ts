export type PartyStatus = "ready" | "running" | "ended";
export type MissionStatus = "pending" | "active" | "done";
export type MissionJudge = "self" | "auto_cards" | "matching";

export interface Party {
  id: string;
  name: string;
  host_message: string;
  profile_questions: string[];
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
  age_group: string | null;
  gender: string | null;
  mbti: string | null;
  bio: string | null;
  appearance: string | null;
  appearance_tags: string[];
  custom_answers: Record<string, string>;
  photo_path: string | null;
  card_token: string;
  created_at: string;
}

export interface CardProfile {
  id: string;
  nickname: string;
  age_group: string | null;
  gender: string | null;
  mbti: string | null;
  bio: string | null;
  appearance: string | null;
  appearance_tags: string[];
  photo_path: string | null;
}

export interface MissionView {
  mission: Mission;
  result: "success" | "fail" | null;
  progress: number;
  matches: CardProfile[];
  isBye: boolean;
  /** 호스트 대시보드에서 진행률의 분모로 쓰는 대상 인원 */
  total?: number;
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
