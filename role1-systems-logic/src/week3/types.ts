export interface UserRecord {
  id: string;
  email: string;
  name: string;
  password_hash: string;
}

export interface TopicRecord {
  id: string;
  subject: string;
  title: string;
  urgency: "low" | "medium" | "high";
}

export interface StudyLogRecord {
  user_id: string;
  topic_id: string;
  last_reviewed: string | null;
  next_review: string;
  ease_factor: number;
  reps: number;
  interval_days: number;
  lapses: number;
  total_study_seconds: number;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export interface RequestUser {
  id: string;
  email: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
  passwordHash: string;
}

export interface Week3DataStore {
  readonly kind: "memory" | "prisma";
  createUser(input: CreateUserInput): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | undefined>;
  getTopicsDueToday(userId: string): Promise<import("../types").TopicsQueueResponse>;
  applyReview(
    userId: string,
    input: import("../types").ReviewSubmissionRequest
  ): Promise<import("../types").ReviewSubmissionResponse>;
  getSqlDueQueueQuery(): string;
}
