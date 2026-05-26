import { calculateNextReview } from "../sm2";
import { ReviewSubmissionRequest, ReviewSubmissionResponse, TopicsQueueResponse } from "../types";
import { CreateUserInput, UserRecord, Week3DataStore } from "./types";
import { prisma } from "./prismaClient";

const DEFAULT_SEED_TOPICS = [
  { title: "Pipelining Hazards", urgency: "high" as const },
  { title: "Deadlock Prevention", urgency: "medium" as const },
];

const SQL_DUE_QUEUE_QUERY = `
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

function toUserRecord(user: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}): UserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    password_hash: user.passwordHash,
  };
}

async function seedDefaultTopicsForUser(userId: string): Promise<void> {
  const existing = await prisma.topic.count({
    where: {
      subject: {
        userId,
      },
    },
  });

  if (existing > 0) {
    return;
  }

  const subject = await prisma.subject.create({
    data: {
      userId,
      name: "Core Concepts",
      syllabusCode: "COGNIPLAN-CORE",
    },
  });

  for (const topic of DEFAULT_SEED_TOPICS) {
    const createdTopic = await prisma.topic.create({
      data: {
        subjectId: subject.id,
        title: topic.title,
        urgency: topic.urgency,
      },
    });

    await prisma.studyLog.create({
      data: {
        userId,
        topicId: createdTopic.id,
        nextReview: new Date(),
        easeFactor: 2.5,
        reps: 0,
        intervalDays: 1,
        lapses: 0,
        totalStudySeconds: 0,
      },
    });
  }
}

export function createPrismaStore(): Week3DataStore {
  return {
    kind: "prisma",
    async createUser(input: CreateUserInput): Promise<UserRecord> {
      const created = await prisma.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: input.passwordHash,
        },
      });

      await seedDefaultTopicsForUser(created.id);
      return toUserRecord(created);
    },

    async findUserByEmail(email: string): Promise<UserRecord | undefined> {
      const found = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      return found ? toUserRecord(found) : undefined;
    },

    async getTopicsDueToday(userId: string): Promise<TopicsQueueResponse> {
      const now = new Date();

      const dueLogs = await prisma.studyLog.findMany({
        where: {
          userId,
          nextReview: { lte: now },
          topic: {
            isArchived: false,
          },
        },
        include: {
          topic: {
            include: {
              subject: true,
            },
          },
        },
        orderBy: {
          nextReview: "asc",
        },
      });

      const mastered = await prisma.studyLog.count({
        where: {
          userId,
          reps: { gte: 6 },
        },
      });

      return {
        user_stats: {
          due_today: dueLogs.length,
          mastered,
          streak: 0,
        },
        queue: dueLogs.map((log: {
          topic: { id: string; subject: { name: string }; title: string; urgency: "low" | "medium" | "high" };
          reps: number;
          nextReview: Date;
        }) => ({
          id: log.topic.id,
          subject: log.topic.subject.name,
          title: log.topic.title,
          urgency: log.topic.urgency,
          reps: log.reps,
          next_review: log.nextReview.toISOString(),
        })),
      };
    },

    async applyReview(userId: string, input: ReviewSubmissionRequest): Promise<ReviewSubmissionResponse> {
      const existing = await prisma.studyLog.findUnique({
        where: {
          userId_topicId: {
            userId,
            topicId: input.topic_id,
          },
        },
      });

      if (!existing) {
        throw new Error("Study log not found for the given topic");
      }

      const updated = calculateNextReview(
        {
          topic_id: existing.topicId,
          last_reviewed: existing.lastReviewed ? existing.lastReviewed.toISOString() : null,
          next_review: existing.nextReview.toISOString(),
          ease_factor: existing.easeFactor,
          reps: existing.reps,
          interval_days: existing.intervalDays,
          lapses: existing.lapses,
          total_study_seconds: existing.totalStudySeconds,
        },
        input.quality_score
      );

      const persisted = await prisma.studyLog.update({
        where: {
          userId_topicId: {
            userId,
            topicId: input.topic_id,
          },
        },
        data: {
          lastReviewed: updated.updated.last_reviewed ? new Date(updated.updated.last_reviewed) : null,
          nextReview: new Date(updated.updated.next_review),
          easeFactor: updated.updated.ease_factor,
          reps: updated.updated.reps,
          intervalDays: updated.updated.interval_days,
          lapses: updated.updated.lapses,
          totalStudySeconds: {
            increment: Math.max(0, input.session_duration),
          },
        },
      });

      return {
        ok: true,
        updated_topic_id: persisted.topicId,
        next_review: persisted.nextReview.toISOString(),
        reps: persisted.reps,
        ease_factor: persisted.easeFactor,
        interval_days: persisted.intervalDays,
      };
    },

    getSqlDueQueueQuery(): string {
      return SQL_DUE_QUEUE_QUERY;
    },
  };
}
