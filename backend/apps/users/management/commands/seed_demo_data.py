from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.billing.models import SubscriptionPlan, Transaction, UserSubscription
from apps.community.models import Discussion, DiscussionComment, StudyGroup
from apps.courses.models import Course, Enrollment, Lesson, Module, Progress
from apps.learning.models import Assignment, Quiz, QuizAttempt, QuizQuestion, Submission
from apps.live.models import LiveParticipant, LiveSession
from apps.messaging.models import Conversation, ConversationParticipant, Message

User = get_user_model()


class Command(BaseCommand):
    help = "Seed demo accounts and realistic demo data for EduStream."

    def handle(self, *args, **options):
        now = timezone.now()

        admin_user, _ = User.objects.update_or_create(
            email="admin@edustream.com",
            defaults={"full_name": "Admin EduStream", "role": "ADMIN", "is_staff": True, "is_superuser": True},
        )
        admin_user.set_password("password123")
        admin_user.save()

        instructor_user, _ = User.objects.update_or_create(
            email="instructor@edustream.com",
            defaults={"full_name": "Sarah Chen", "role": "INSTRUCTOR", "is_staff": False, "is_superuser": False},
        )
        instructor_user.set_password("password123")
        instructor_user.save()

        student_user, _ = User.objects.update_or_create(
            email="student@edustream.com",
            defaults={"full_name": "Alex Johnson", "role": "STUDENT", "is_staff": False, "is_superuser": False},
        )
        student_user.set_password("password123")
        student_user.save()

        maria, _ = User.objects.update_or_create(
            email="maria@edustream.com",
            defaults={"full_name": "Maria Garcia", "role": "STUDENT"},
        )
        maria.set_password("password123")
        maria.save()

        free_plan, _ = SubscriptionPlan.objects.update_or_create(
            name="Free",
            defaults={
                "price_monthly": Decimal("0"),
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "ai_monthly_limit": 20,
                "is_active": True,
            },
        )
        pro_plan, _ = SubscriptionPlan.objects.update_or_create(
            name="Pro",
            defaults={
                "price_monthly": Decimal("19.99"),
                "has_unlimited_ai": False,
                "has_unlimited_streams": False,
                "ai_monthly_limit": 200,
                "is_active": True,
            },
        )
        unlimited_plan, _ = SubscriptionPlan.objects.update_or_create(
            name="Unlimited",
            defaults={
                "price_monthly": Decimal("49.99"),
                "has_unlimited_ai": True,
                "has_unlimited_streams": True,
                "ai_monthly_limit": 0,
                "is_active": True,
            },
        )

        UserSubscription.objects.update_or_create(
            user=student_user,
            defaults={
                "plan": pro_plan,
                "status": "ACTIVE",
                "current_period_start": now - timedelta(days=3),
                "current_period_end": now + timedelta(days=27),
                "ai_prompts_used_this_month": 12,
            },
        )
        UserSubscription.objects.update_or_create(
            user=instructor_user,
            defaults={
                "plan": unlimited_plan,
                "status": "ACTIVE",
                "current_period_start": now - timedelta(days=10),
                "current_period_end": now + timedelta(days=20),
                "ai_prompts_used_this_month": 4,
            },
        )
        UserSubscription.objects.update_or_create(
            user=admin_user,
            defaults={
                "plan": unlimited_plan,
                "status": "ACTIVE",
                "current_period_start": now - timedelta(days=5),
                "current_period_end": now + timedelta(days=25),
                "ai_prompts_used_this_month": 1,
            },
        )

        course1, _ = Course.objects.update_or_create(
            slug="advanced-react-patterns-best-practices",
            defaults={
                "title": "Advanced React Patterns & Best Practices",
                "description": "Master modern React architecture with advanced hooks and scalable patterns.",
                "category": "Development",
                "level": "ADVANCED",
                "thumbnail_url": "https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=1200&q=80",
                "price": Decimal("89.99"),
                "platform_fee_percentage": Decimal("30.00"),
                "is_published": True,
                "instructor": instructor_user,
            },
        )
        course2, _ = Course.objects.update_or_create(
            slug="machine-learning-a-z-practice",
            defaults={
                "title": "Machine Learning A-Z Practice",
                "description": "Hands-on ML fundamentals and real project implementation.",
                "category": "Data Science",
                "level": "INTERMEDIATE",
                "thumbnail_url": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=1200&q=80",
                "price": Decimal("94.99"),
                "platform_fee_percentage": Decimal("30.00"),
                "is_published": True,
                "instructor": instructor_user,
            },
        )

        module1, _ = Module.objects.update_or_create(course=course1, order=1, defaults={"title": "React Deep Dive"})
        module2, _ = Module.objects.update_or_create(course=course1, order=2, defaults={"title": "Performance Optimization"})

        lesson1, _ = Lesson.objects.update_or_create(
            module=module1,
            order=1,
            defaults={
                "title": "Hooks in Production",
                "content": "Understand advanced hook composition and anti-patterns.",
                "video_url": "https://example.com/videos/hooks-production",
                "duration_seconds": 1300,
            },
        )
        lesson2, _ = Lesson.objects.update_or_create(
            module=module2,
            order=1,
            defaults={
                "title": "Rendering Performance",
                "content": "Memoization, code-splitting and profiling techniques.",
                "video_url": "https://example.com/videos/rendering-performance",
                "duration_seconds": 1450,
            },
        )

        Enrollment.objects.get_or_create(student=student_user, course=course1, defaults={"is_active": True})
        Enrollment.objects.get_or_create(student=student_user, course=course2, defaults={"is_active": True})
        Enrollment.objects.get_or_create(student=maria, course=course1, defaults={"is_active": True})

        enrollment = Enrollment.objects.get(student=student_user, course=course1)
        Progress.objects.update_or_create(
            enrollment=enrollment,
            lesson=lesson1,
            defaults={"completion": Decimal("75.00"), "is_completed": False, "last_position_seconds": 980},
        )
        Progress.objects.update_or_create(
            enrollment=enrollment,
            lesson=lesson2,
            defaults={"completion": Decimal("22.00"), "is_completed": False, "last_position_seconds": 320},
        )

        assignment1, _ = Assignment.objects.update_or_create(
            course=course1,
            title="React Hooks Project",
            defaults={
                "description": "Build a feature with custom hooks and proper cleanup.",
                "due_date": now + timedelta(days=5),
                "points": 100,
                "type": "PROJECT",
                "created_by": instructor_user,
            },
        )
        assignment2, _ = Assignment.objects.update_or_create(
            course=course1,
            title="Component Lifecycle Quiz",
            defaults={
                "description": "Short quiz about lifecycle and effects.",
                "due_date": now + timedelta(days=2),
                "points": 50,
                "type": "QUIZ",
                "created_by": instructor_user,
            },
        )

        Submission.objects.update_or_create(
            assignment=assignment1,
            student=student_user,
            defaults={
                "content_text": "Implemented reusable hooks for data fetching.",
                "grade": Decimal("92.00"),
                "feedback": "Great architecture and naming.",
                "status": "GRADED",
            },
        )
        Submission.objects.update_or_create(
            assignment=assignment2,
            student=student_user,
            defaults={"content_text": "Quiz answers submitted.", "status": "SUBMITTED"},
        )

        quiz, _ = Quiz.objects.update_or_create(
            lesson=lesson1,
            defaults={"title": "Module 2 Quiz", "passing_score": 70, "time_limit_minutes": 15, "created_by": instructor_user},
        )
        q1, _ = QuizQuestion.objects.update_or_create(
            quiz=quiz,
            order=1,
            defaults={
                "prompt": "What is useEffect primarily used for?",
                "options": ["Manage local state", "Perform side effects", "Define routes", "Create classes"],
                "correct_index": 1,
            },
        )
        QuizQuestion.objects.update_or_create(
            quiz=quiz,
            order=2,
            defaults={
                "prompt": "Which hook memoizes expensive calculations?",
                "options": ["useRef", "useMemo", "useEffect", "useId"],
                "correct_index": 1,
            },
        )
        QuizAttempt.objects.update_or_create(
            quiz=quiz,
            student=student_user,
            defaults={
                "answers": {str(q1.id): 1},
                "score": Decimal("85.00"),
                "passed": True,
                "submitted_at": now - timedelta(hours=2),
            },
        )

        discussion, _ = Discussion.objects.update_or_create(
            author=student_user,
            title="Tips for mastering useEffect?",
            defaults={
                "content": "I am still confused about dependency arrays in complex components.",
                "category": "Homework Help",
                "tags": ["React", "Hooks", "Frontend"],
                "likes_count": 24,
            },
        )
        DiscussionComment.objects.update_or_create(
            discussion=discussion,
            author=instructor_user,
            content="Start with exhaustive-deps and refactor effects into clear responsibilities.",
        )
        group, _ = StudyGroup.objects.update_or_create(
            name="React Developers Club",
            defaults={
                "description": "Weekly peer session for React practice and code review.",
                "created_by": instructor_user,
                "next_session_at": now + timedelta(days=1),
            },
        )
        group.members.add(student_user, maria, instructor_user)

        convo, _ = Conversation.objects.update_or_create(
            name="Sarah & Alex",
            defaults={"is_group": False, "created_by": instructor_user},
        )
        ConversationParticipant.objects.get_or_create(conversation=convo, user=student_user)
        ConversationParticipant.objects.get_or_create(conversation=convo, user=instructor_user)
        Message.objects.update_or_create(
            conversation=convo,
            sender=instructor_user,
            content="Great job on the assignment! Continue like this.",
        )
        Message.objects.update_or_create(
            conversation=convo,
            sender=student_user,
            content="Thanks! Could we review cleanup functions next class?",
        )

        live_session, _ = LiveSession.objects.update_or_create(
            course=course1,
            title="Advanced React Patterns - Q&A",
            defaults={
                "instructor": instructor_user,
                "scheduled_at": now + timedelta(hours=3),
                "duration_minutes": 90,
                "room_name": "live-react-qa",
                "status": "LIVE",
            },
        )
        LiveParticipant.objects.get_or_create(session=live_session, user=instructor_user, defaults={"role": "HOST"})
        LiveParticipant.objects.get_or_create(session=live_session, user=student_user, defaults={"role": "STUDENT"})

        Transaction.objects.update_or_create(
            student=student_user,
            course=course1,
            defaults={
                "amount_paid": Decimal("89.99"),
                "platform_fee": Decimal("27.00"),
                "instructor_earning": Decimal("62.99"),
                "stripe_payment_intent_id": "pi_demo_react",
                "status": "COMPLETED",
            },
        )
        Transaction.objects.update_or_create(
            student=student_user,
            course=course2,
            defaults={
                "amount_paid": Decimal("94.99"),
                "platform_fee": Decimal("28.50"),
                "instructor_earning": Decimal("66.49"),
                "stripe_payment_intent_id": "pi_demo_ml",
                "status": "COMPLETED",
            },
        )

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully (accounts + realistic data)."))
