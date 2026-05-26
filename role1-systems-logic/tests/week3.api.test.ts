import request from "supertest";
import { createApp } from "../src/week3/app";

describe("Week 3 auth and topic APIs", () => {
  const app = createApp();

  it("supports signup, login, queue and review contract routes", async () => {
    const signup = await request(app).post("/auth/signup").send({
      email: "lead@example.com",
      name: "Team Lead",
      password: "StrongPass123",
    });

    expect(signup.status).toBe(201);
    expect(signup.body.access_token).toBeDefined();

    const login = await request(app).post("/auth/login").send({
      email: "lead@example.com",
      password: "StrongPass123",
    });

    expect(login.status).toBe(200);
    const token = login.body.access_token;
    expect(typeof token).toBe("string");

    const queue = await request(app)
      .get("/api/v1/topics/queue")
      .set("Authorization", `Bearer ${token}`);

    expect(queue.status).toBe(200);
    expect(queue.body).toHaveProperty("user_stats");
    expect(queue.body).toHaveProperty("queue");

    const review = await request(app)
      .post("/api/v1/topics/review")
      .set("Authorization", `Bearer ${token}`)
      .send({
        topic_id: "uuid-v4-12345",
        quality_score: 4,
        session_duration: 300,
      });

    expect(review.status).toBe(200);
    expect(review.body.ok).toBe(true);
    expect(review.body.updated_topic_id).toBe("uuid-v4-12345");
  });

  it("rejects protected route without token", async () => {
    const response = await request(app).get("/topics");
    expect(response.status).toBe(401);
  });
});
