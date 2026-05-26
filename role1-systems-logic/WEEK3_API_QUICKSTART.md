# Week 3 API Quickstart (Role 1)

## 1) Start server

```bash
npm --prefix role1-systems-logic run dev
```

Default port: `4001`

## 2) Signup

```bash
curl -X POST http://localhost:4001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"lead@example.com","name":"Team Lead","password":"StrongPass123"}'
```

## 3) Login

```bash
curl -X POST http://localhost:4001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lead@example.com","password":"StrongPass123"}'
```

Copy `access_token` from response.

## 4) Fetch queue (contract route)

```bash
curl http://localhost:4001/api/v1/topics/queue \
  -H "Authorization: Bearer <access_token>"
```

## 5) Submit review (contract route)

```bash
curl -X POST http://localhost:4001/api/v1/topics/review \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"topic_id":"uuid-v4-12345","quality_score":4,"session_duration":300}'
```

## 6) Compatibility routes

- `GET /topics`
- `POST /topics/:id/review`

These are supported alongside contract routes for team flexibility.
