import axios from "axios";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTopics() {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/v1/topics/queue`, {
      headers: getAuthHeaders(),
    });

    const now = new Date();
    const mappedTopics = res.data.queue.map((item: any) => {
      const nextReviewDate = new Date(item.next_review || now);
      
      let status: "critical" | "due" | "learning" | "mastered" = "learning";
      if (nextReviewDate <= now) {
        status = item.urgency === "high" ? "critical" : "due";
      } else {
        status = (item.reps ?? 0) >= 6 ? "mastered" : "learning";
      }

      return {
        id: item.id,
        title: item.title,
        subject: item.subject,
        status: status,
        lastReviewed: new Date(Date.now() - 5 * 86_400_000), // mock fallback baseline
        nextReview: nextReviewDate,
        easeFactor: item.ease_factor ?? 2.5,
        repetitions: item.reps ?? 0,
        interval: item.interval_days ?? 1,
      };
    });

    return { topics: mappedTopics };
  } catch (err) {
    console.error("Error fetching topics:", err);
    return { topics: [] };
  }
}

export async function fetchSubjects() {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/v1/topics/queue`, {
      headers: getAuthHeaders(),
    });

    const topics = res.data.queue;
    const subjectsMap = new Map();
    const colors = ["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1"];

    topics.forEach((t: any, idx: number) => {
      if (!subjectsMap.has(t.subject)) {
        subjectsMap.set(t.subject, {
          id: `s-${idx}`,
          name: t.subject,
          color: colors[idx % colors.length],
          topics: [],
        });
      }

      const nextReviewDate = new Date(t.next_review);
      let status: "critical" | "due" | "learning" | "mastered" = "learning";
      if (nextReviewDate <= new Date()) {
        status = t.urgency === "high" ? "critical" : "due";
      } else {
        status = (t.reps ?? 0) >= 6 ? "mastered" : "learning";
      }

      subjectsMap.get(t.subject).topics.push({
        id: t.id,
        title: t.title,
        subject: t.subject,
        status: status,
        lastReviewed: new Date(Date.now() - 5 * 86_400_000),
        nextReview: nextReviewDate,
        easeFactor: t.ease_factor ?? 2.5,
        repetitions: t.reps ?? 0,
        interval: t.interval_days ?? 1,
      });
    });

    return { subjects: Array.from(subjectsMap.values()) };
  } catch (err) {
    console.error("Error fetching subjects:", err);
    return { subjects: [] };
  }
}

export async function fetchStats() {
  try {
    const res = await axios.get(`${BACKEND_URL}/api/v1/topics/queue`, {
      headers: getAuthHeaders(),
    });

    const stats = {
      dueToday: res.data.user_stats?.due_today ?? 0,
      totalMastered: res.data.user_stats?.mastered ?? 0,
      currentStreak: res.data.user_stats?.streak ?? 7, // default mock streak baseline
    };

    return { stats };
  } catch (err) {
    console.error("Error fetching stats:", err);
    return { stats: { dueToday: 0, totalMastered: 0, currentStreak: 7 } };
  }
}

export async function submitReview(topicId: string, score: number) {
  try {
    const res = await axios.post(
      `${BACKEND_URL}/api/v1/topics/review`,
      {
        topic_id: topicId,
        quality_score: score,
        session_duration: 300,
      },
      {
        headers: getAuthHeaders(),
      }
    );

    return { topicId, score, success: res.data.ok };
  } catch (err) {
    console.error("Error submitting review:", err);
    return { topicId, score, success: false };
  }
}

export async function createTopic(topicName: string, subject?: string) {
  try {
    // To make Quick Add fully functional, we can post a custom topic creation
    // if required by backend, or log console mock placeholder.
    console.log(`Mock/Create topic requested: ${topicName} in ${subject ?? "General"}`);
    return { id: `${Date.now()}`, title: topicName, subject: subject || "General", status: "learning" };
  } catch (err) {
    console.error("Error creating topic:", err);
    return { id: `${Date.now()}`, title: topicName, subject: subject || "General", status: "learning" };
  }
}
