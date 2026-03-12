# EduStream Backend (Django + DRF + Channels)

Backend complet pour le frontend EduStream, implémente selon `BACKEND_GUIDE.md`.

## Domaines couverts
- Auth + rôles: `STUDENT`, `INSTRUCTOR`, `ADMIN`
- LMS: cours, modules, leçons, ressources, inscriptions, progression, notes, certificats
- Learning: assignments, submissions, quiz, attempts, notifications
- Billing: plans, subscriptions, checkout cours, transactions, webhook Stripe, earnings instructeur
- AI Tutor: endpoint quota-aware `/api/v1/ai/tutor/chat/`
- Live sessions: REST + WebSocket de signalisation
- Community: discussions, commentaires, study groups
- Messaging: conversations, messages

## Démarrage
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py makemigrations
python manage.py migrate
python manage.py seed_demo_data
python manage.py createsuperuser
python manage.py runserver
```

## Préfixes API
- HTTP: `/api/v1/`
- Auth: `/api/v1/auth/`
- Billing: `/api/v1/billing/`
- AI: `/api/v1/ai/`
- WebSocket live: `/ws/live/<session_id>/`
- Swagger UI: `/api/docs/`
- OpenAPI JSON: `/api/schema/`

## Endpoints clés
- `GET /api/v1/billing/plans/`
- `POST /api/v1/billing/subscribe/`
- `POST /api/v1/billing/checkout/<course_id>/`
- `POST /api/v1/billing/webhook/`
- `GET /api/v1/billing/instructor/earnings/`
- `POST /api/v1/ai/tutor/chat/`
- `POST /api/v1/live-sessions/`
- `POST /api/v1/live-sessions/<id>/join/`

## Alignement frontend -> backend
- `Catalog`, `CourseDetails`, `MyCourses`: `/courses`, `/modules`, `/lessons`, `/enrollments`
- `Assignments`, `Grades`, `Quiz`: `/assignments`, `/submissions`, `/quizzes`, `/quiz-attempts`
- `Community`: `/discussions`, `/discussion-comments`, `/study-groups`
- `Messages`: `/conversations`, `/messages`
- `StudentSchedule`, `LiveMeeting`: `/live-sessions` + WebSocket `ws/live/...`
- `Chatbot`: `/ai/tutor/chat/`
