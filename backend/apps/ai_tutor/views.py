import json

from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.billing.services import can_use_ai

from .gemini import GeminiGenerationError, generate_module_package
from .models import AITutorConversation, AITutorMessage
from .openrouter import OpenRouterError, _post, ask_with_context, continue_with_reasoning
from .serializers import AITutorConversationSerializer, AITutorMessageSerializer


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

        history = request.data.get("history")
        conversation_id = request.data.get("conversation_id")

        try:
            result = ask_with_context(user_prompt=prompt, history=history or None)
            response_text = result.get("content", "")
            usage = result.get("usage", {})
        except OpenRouterError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        conv = None
        if conversation_id:
            conv = AITutorConversation.objects.filter(id=conversation_id, user=request.user).first()
        AITutorMessage.objects.create(user=request.user, prompt=prompt, response=response_text, conversation=conv)

        subscription = getattr(request.user, "subscription", None)
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            subscription.save(update_fields=["ai_prompts_used_this_month", "updated_at"])

        return Response({"response": response_text, "usage": usage})


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


class InstructorModuleGenerationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in {"INSTRUCTOR", "ADMIN"}:
            return Response({"detail": "Instructor access required."}, status=status.HTTP_403_FORBIDDEN)

        allowed, reason = can_use_ai(request.user)
        if not allowed:
            status_code = status.HTTP_402_PAYMENT_REQUIRED if reason == "Upgrade to Unlimited." else status.HTTP_403_FORBIDDEN
            return Response({"detail": reason}, status=status_code)

        prompt = request.data.get("prompt", "").strip()
        if not prompt:
            return Response({"detail": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = generate_module_package(
                prompt=prompt,
                course_title=request.data.get("course_title", "").strip() or "Untitled course",
                category=request.data.get("category", "").strip() or "General",
                level=request.data.get("level", "").strip() or "INTERMEDIATE",
                module_title=request.data.get("module_title", "").strip(),
            )
        except GeminiGenerationError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        AITutorMessage.objects.create(user=request.user, prompt=prompt, response=f"Generated module package for {payload['title']}.")
        subscription = getattr(request.user, "subscription", None)
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            subscription.save(update_fields=["ai_prompts_used_this_month", "updated_at"])

        return Response(payload)


class InstructorLessonGenerationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role not in {"INSTRUCTOR", "ADMIN"}:
            return Response({"detail": "Instructor access required."}, status=status.HTTP_403_FORBIDDEN)

        allowed, reason = can_use_ai(request.user)
        if not allowed:
            status_code = status.HTTP_402_PAYMENT_REQUIRED if reason == "Upgrade to Unlimited." else status.HTTP_403_FORBIDDEN
            return Response({"detail": reason}, status=status_code)

        prompt = request.data.get("prompt", "").strip()
        if not prompt:
            return Response({"detail": "prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        course_title = request.data.get("course_title", "").strip() or "Untitled course"
        category = request.data.get("category", "").strip() or "General"
        level = request.data.get("level", "").strip() or "INTERMEDIATE"
        module_title = request.data.get("module_title", "").strip() or "Untitled module"
        lesson_title = request.data.get("lesson_title", "").strip()

        system_prompt = (
            "You are a lesson content generator for an LMS platform called EduStream. "
            "Return ONLY valid JSON with this exact shape — no markdown, no backticks, no extra text:\n"
            '{\n'
            '  "title": "string",\n'
            '  "content": "string (markdown, at least 500 characters)",\n'
            '  "lesson_type": "VIDEO|TEXT|QUIZ|ASSIGNMENT|LIVE|DOWNLOAD",\n'
            '  "status": "DRAFT|PUBLISHED",\n'
            '  "video_url": "string (empty string if none)",\n'
            '  "transcript": "string (empty string if none)",\n'
            '  "instructor_notes": "string",\n'
            '  "duration_seconds": 0,\n'
            '  "is_preview": false,\n'
            '  "quiz": {\n'
            '    "title": "string",\n'
            '    "passing_score": 70,\n'
            '    "time_limit_minutes": 10,\n'
            '    "questions": [\n'
            '      {\n'
            '        "prompt": "string",\n'
            '        "options": ["string", "string", "string", "string"],\n'
            '        "correct_index": 0\n'
            '      }\n'
            '    ]\n'
            '  }\n'
            '}\n'
            "Constraints:\n"
            "- Fill every field.\n"
            "- Status is DRAFT unless the prompt explicitly asks for publish-ready.\n"
            "- Quiz must include exactly 4 questions with 4 options each.\n"
            "- Content must be detailed educational markdown (headings, lists, code blocks if applicable).\n"
            f"Context: course={course_title}, category={category}, level={level}, module={module_title}, lesson={lesson_title}\n"
            f"Instructor request: {prompt}"
        )

        try:
            result = _post(
                messages=[{"role": "system", "content": system_prompt}],
                model="cohere/north-mini-code:free",
                max_tokens=4096,
            )
            raw = result.get("content", "")
            response_data = json.loads(raw)
        except (OpenRouterError, json.JSONDecodeError) as exc:
            return Response({"detail": f"AI generation failed: {exc}"}, status=status.HTTP_502_BAD_GATEWAY)

        # Replace literal \n with actual newlines (LLM often double-escapes)
        def _fix_newlines(val: str) -> str:
            return val.replace("\\n", "\n")

        quiz = response_data.get("quiz") or {}
        payload = {
            "title": _fix_newlines(str(response_data.get("title", "")).strip()) or lesson_title or "AI Generated Lesson",
            "content": _fix_newlines(str(response_data.get("content", "")).strip()),
            "lesson_type": str(response_data.get("lesson_type", "TEXT")).strip() or "TEXT",
            "status": str(response_data.get("status", "DRAFT")).strip() or "DRAFT",
            "video_url": str(response_data.get("video_url", "")).strip(),
            "transcript": _fix_newlines(str(response_data.get("transcript", "")).strip()),
            "instructor_notes": _fix_newlines(str(response_data.get("instructor_notes", "")).strip()),
            "duration_seconds": max(int(response_data.get("duration_seconds", 0) or 0), 300),
            "is_preview": bool(response_data.get("is_preview", False)),
            "quiz": {
                "title": _fix_newlines(str(quiz.get("title", "")).strip()) or "Lesson Quiz",
                "passing_score": min(max(int(quiz.get("passing_score", 70) or 70), 1), 100),
                "time_limit_minutes": max(int(quiz.get("time_limit_minutes", 10) or 10), 1),
                "questions": [
                    {
                        "prompt": _fix_newlines(str(q.get("prompt", ""))),
                        "options": [_fix_newlines(str(o)) for o in (q.get("options", [])[:4])],
                        "correct_index": min(max(int(q.get("correct_index", 0) or 0), 0), 3),
                    }
                    for q in (quiz.get("questions") or [])[:6]
                ],
            },
        }

        AITutorMessage.objects.create(user=request.user, prompt=prompt, response=f"Generated lesson package for {payload['title']}.")
        subscription = getattr(request.user, "subscription", None)
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            subscription.save(update_fields=["ai_prompts_used_this_month", "updated_at"])

        return Response(payload)


class TutorReasoningChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = request.data.get("prompt", "").strip()
        history = request.data.get("history")
        follow_up = request.data.get("follow_up")
        assistant_message = request.data.get("assistant_message")

        if not prompt and not follow_up:
            return Response({"detail": "prompt or follow_up is required"}, status=status.HTTP_400_BAD_REQUEST)

        allowed, reason = can_use_ai(request.user)
        if not allowed:
            status_code = status.HTTP_402_PAYMENT_REQUIRED if reason == "Upgrade to Unlimited." else status.HTTP_403_FORBIDDEN
            return Response({"detail": reason}, status=status_code)

        try:
            if follow_up and assistant_message:
                result = continue_with_reasoning(
                    previous_messages=history or [],
                    last_assistant_message=assistant_message,
                    follow_up=follow_up,
                )
            else:
                result = ask_with_context(
                    user_prompt=prompt,
                    history=history or None,
                )
        except OpenRouterError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        conv = None
        if conversation_id := request.data.get("conversation_id"):
            conv = AITutorConversation.objects.filter(id=conversation_id, user=request.user).first()
        AITutorMessage.objects.create(
            user=request.user,
            prompt=follow_up or prompt,
            response=result.get("content", ""),
            conversation=conv,
        )
        subscription = getattr(request.user, "subscription", None)
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            subscription.save(update_fields=["ai_prompts_used_this_month", "updated_at"])

        return Response(result)


class TutorMessageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AITutorMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = AITutorMessage.objects.filter(user=self.request.user)
        conversation = self.request.query_params.get("conversation")
        if conversation:
            qs = qs.filter(conversation_id=conversation)
        return qs


class TutorConversationViewSet(viewsets.ModelViewSet):
    serializer_class = AITutorConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AITutorConversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
