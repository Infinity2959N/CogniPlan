import { randomUUID } from "crypto";
import { calculateNextReview } from "../sm2";
import {
  ReviewSubmissionRequest,
  ReviewSubmissionResponse,
  TopicQueueItem,
  TopicsQueueResponse,
} from "../types";
import { CreateUserInput, StudyLogRecord, TopicRecord, UserRecord, Week3DataStore } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function getOrCreateStudyLog(studyLogs: StudyLogRecord[], userId: string, topicId: string): StudyLogRecord {
  const existing = studyLogs.find((log) => log.user_id === userId && log.topic_id === topicId);
  if (existing) {
    return existing;
  }

  const created: StudyLogRecord = {
    user_id: userId,
    topic_id: topicId,
    last_reviewed: null,
    next_review: nowIso(),
    ease_factor: 2.5,
    reps: 0,
    interval_days: 1,
    lapses: 0,
    total_study_seconds: 0,
  };

  studyLogs.push(created);
  return created;
}

function getTopicsDueTodayFrom(
  topics: TopicRecord[],
  studyLogs: StudyLogRecord[],
  userId: string
): TopicsQueueResponse {
  const now = Date.now();
  const dueRows: TopicQueueItem[] = [];

  for (const log of studyLogs) {
    if (log.user_id !== userId) continue;
    if (new Date(log.next_review).getTime() > now) continue;

    const topic = topics.find((candidate) => candidate.id === log.topic_id);
    if (!topic) continue;

    dueRows.push({
      id: topic.id,
      subject: topic.subject,
      title: topic.title,
      urgency: topic.urgency,
      reps: log.reps,
      next_review: log.next_review,
    });
  }

  const mastered = studyLogs.filter((log) => log.user_id === userId && log.reps >= 6).length;

  return {
    user_stats: {
      due_today: dueRows.length,
      mastered,
      streak: 0,
    },
    queue: dueRows,
  };
}

function applyReviewTo(
  studyLogs: StudyLogRecord[],
  userId: string,
  input: ReviewSubmissionRequest
): ReviewSubmissionResponse {
  const log = getOrCreateStudyLog(studyLogs, userId, input.topic_id);

  const result = calculateNextReview(
    {
      topic_id: log.topic_id,
      last_reviewed: log.last_reviewed,
      next_review: log.next_review,
      ease_factor: log.ease_factor,
      reps: log.reps,
      interval_days: log.interval_days,
      lapses: log.lapses,
      total_study_seconds: log.total_study_seconds,
    },
    input.quality_score
  );

  log.last_reviewed = result.updated.last_reviewed;
  log.next_review = result.updated.next_review;
  log.ease_factor = result.updated.ease_factor;
  log.reps = result.updated.reps;
  log.interval_days = result.updated.interval_days;
  log.lapses = result.updated.lapses;
  log.total_study_seconds += Math.max(0, input.session_duration);

  return {
    ok: true,
    updated_topic_id: log.topic_id,
    next_review: log.next_review,
    reps: log.reps,
    ease_factor: log.ease_factor,
    interval_days: log.interval_days,
  };
}

export const SQL_DUE_QUEUE_QUERY = `
SELECT
  t.id,
  s.name AS subject,
  t.title,
  t.urgency,
  sl.reps,
  sl.next_review
FROM study_logs sl
JOIN topics t ON t.id = sl.topic_id
JOIN subjects s ON s.id = t.subject_id
WHERE sl.user_id = $1
  AND sl.next_review <= NOW()
  AND t.is_archived = FALSE
ORDER BY sl.next_review ASC;
`.trim();

export function createInMemoryStore(): Week3DataStore {
  const users: UserRecord[] = [];

  const topics: TopicRecord[] = [
    {
      id: "uuid-v4-12345",
      subject: "Computer Architecture",
      title: "Pipelining Hazards",
      urgency: "high",
    },
    {
      id: "uuid-v4-67890",
      subject: "Operating Systems",
      title: "Deadlock Prevention",
      urgency: "medium",
    },
  ];

  const studyLogs: StudyLogRecord[] = [];

  return {
    kind: "memory",
    async createUser(input: CreateUserInput): Promise<UserRecord> {
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        name: input.name,
        password_hash: input.passwordHash,
      };

      users.push(user);

      for (const topic of topics) {
        getOrCreateStudyLog(studyLogs, user.id, topic.id);
      }

      return user;
    },
    async findUserByEmail(email: string): Promise<UserRecord | undefined> {
      return users.find((user) => user.email === email.toLowerCase());
    },
    async getTopicsDueToday(userId: string): Promise<TopicsQueueResponse> {
      return getTopicsDueTodayFrom(topics, studyLogs, userId);
    },
    async applyReview(userId: string, input: ReviewSubmissionRequest): Promise<ReviewSubmissionResponse> {
      return applyReviewTo(studyLogs, userId, input);
    },
    getSqlDueQueueQuery(): string {
      return SQL_DUE_QUEUE_QUERY;
    },
  };
}
