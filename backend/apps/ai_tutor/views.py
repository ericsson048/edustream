from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.services import can_use_ai

from .models import AITutorMessage


class TutorChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = request.data.get("prompt", "").strip()
        if not prompt:
            return Response({"detail": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        allowed, reason = can_use_ai(request.user)
        if not allowed:
            status_code = status.HTTP_402_PAYMENT_REQUIRED if reason == "Upgrade to Unlimited." else status.HTTP_403_FORBIDDEN
            return Response({"detail": reason}, status=status_code)

        response_text = (
            "Tutor IA: voici une explication structurée de votre question. "
            f"Point clé: {prompt[:180]}"
        )
        AITutorMessage.objects.create(user=request.user, prompt=prompt, response=response_text)

        subscription = getattr(request.user, "subscription", None)
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            subscription.save(update_fields=["ai_prompts_used_this_month", "updated_at"])

        return Response({"response": response_text})


class InstructorCourseGenerationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in {"INSTRUCTOR", "ADMIN"}:
            return Response({"detail": "Instructor access required."}, status=status.HTTP_403_FORBIDDEN)

        allowed, reason = can_use_ai(request.user)
        if not allowed:
            status_code = status.HTTP_402_PAYMENT_REQUIRED if reason == "Upgrade to Unlimited." else status.HTTP_403_FORBIDDEN
            return Response({"detail": reason}, status=status_code)

        prompt = request.data.get("prompt", "").strip()
        category = request.data.get("category", "Development").strip() or "Development"
        level = request.data.get("level", "INTERMEDIATE").strip() or "INTERMEDIATE"
        if not prompt:
            return Response({"detail": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Mock structured generation for now, shaped for direct editor consumption.
        title = request.data.get("title", "").strip() or f"{prompt[:48].strip().title()} Masterclass"
        modules = [
            {
                "title": "Foundations and Orientation",
                "resources": [
                    {"title": "Course roadmap PDF", "kind": "PDF", "description": "Overview, glossary and study plan.", "file_url": "https://example.com/roadmap.pdf"},
                ],
                "lessons": [
                    {
                        "title": "Course overview and objectives",
                        "content": f"Introduction to {prompt}.",
                        "video_url": "",
                        "duration_seconds": 900,
                        "resources": [
                            {"title": "Kickoff worksheet", "kind": "PDF", "description": "Learner warm-up prompts.", "file_url": "https://example.com/kickoff.pdf"},
                            {"title": "Reference links", "kind": "LINK", "description": "Official documentation and references.", "file_url": "https://example.com/docs"},
                        ],
                    },
                    {
                        "title": "Core concepts and vocabulary",
                        "content": f"Key principles of {prompt}.",
                        "video_url": "",
                        "duration_seconds": 1200,
                        "resources": [
                            {"title": "Vocabulary cheat sheet", "kind": "PDF", "description": "Key terms and definitions.", "file_url": "https://example.com/vocabulary.pdf"},
                        ],
                    },
                ],
                "quiz": {
                    "title": "Module 1 Quiz",
                    "passing_score": 70,
                    "time_limit_minutes": 10,
                    "questions": [
                        {
                            "prompt": f"What is the primary goal of {prompt}?",
                            "options": ["To memorize tools", "To apply core principles", "To skip fundamentals", "To avoid projects"],
                            "correct_index": 1,
                        },
                        {
                            "prompt": "What should learners master first?",
                            "options": ["Buzzwords", "Core vocabulary", "Advanced optimization", "Final certification"],
                            "correct_index": 1,
                        },
                    ],
                },
            },
            {
                "title": "Applied Practice",
                "resources": [
                    {"title": "Project brief", "kind": "PDF", "description": "Hands-on project instructions.", "file_url": "https://example.com/project-brief.pdf"},
                ],
                "lessons": [
                    {
                        "title": "Hands-on workflow",
                        "content": f"Practical execution flow for {prompt}.",
                        "video_url": "",
                        "duration_seconds": 1500,
                        "resources": [
                            {"title": "Starter files", "kind": "ZIP", "description": "Project starter assets.", "file_url": "https://example.com/starter.zip"},
                        ],
                    },
                    {
                        "title": "Common mistakes and review",
                        "content": f"Typical pitfalls in {prompt}.",
                        "video_url": "",
                        "duration_seconds": 1100,
                        "resources": [
                            {"title": "Review checklist", "kind": "PDF", "description": "Final review and self-checklist.", "file_url": "https://example.com/checklist.pdf"},
                        ],
                    },
                ],
                "quiz": {
                    "title": "Module 2 Quiz",
                    "passing_score": 75,
                    "time_limit_minutes": 12,
                    "questions": [
                        {
                            "prompt": "What improves learner outcomes the most?",
                            "options": ["Random practice", "Structured applied exercises", "Skipping review", "Only theory"],
                            "correct_index": 1,
                        }
                    ],
                },
            },
        ]

        response_text = f"Generated a course outline for {title}."
        AITutorMessage.objects.create(user=request.user, prompt=prompt, response=response_text)
        subscription = getattr(request.user, "subscription", None)
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            subscription.save(update_fields=["ai_prompts_used_this_month", "updated_at"])

        return Response(
            {
                "title": title,
                "description": f"A complete {level.lower()} curriculum in {category} focused on {prompt}.",
                "category": category,
                "level": level,
                "learning_objectives": [
                    f"Master the foundations of {prompt}.",
                    "Build practical workflows that can be reused in real projects.",
                    "Evaluate results and improve quality with structured review loops.",
                ],
                "prerequisites": [
                    "Basic computer literacy and willingness to practice weekly.",
                    f"Curiosity about {category.lower()} workflows and terminology.",
                ],
                "price": "79.99",
                "modules": modules,
            }
        )
