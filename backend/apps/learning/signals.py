from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.courses.models import Enrollment, Progress

from .models import QuizAttempt, UserActivity


@receiver(post_save, sender=Progress)
def record_lesson_activity(sender, instance, created, **kwargs):
    if created:
        UserActivity.objects.create(
            user=instance.enrollment.student,
            kind=UserActivity.Kind.LESSON_STARTED,
            metadata={"lesson_id": str(instance.lesson_id), "course_id": str(instance.enrollment.course_id)},
        )
    elif instance.is_completed:
        UserActivity.objects.create(
            user=instance.enrollment.student,
            kind=UserActivity.Kind.LESSON_COMPLETED,
            metadata={"lesson_id": str(instance.lesson_id), "course_id": str(instance.enrollment.course_id)},
        )


@receiver(post_save, sender=QuizAttempt)
def record_quiz_activity(sender, instance, created, **kwargs):
    if not created:
        return
    kind = UserActivity.Kind.QUIZ_PASSED if instance.passed else UserActivity.Kind.QUIZ_FAILED
    UserActivity.objects.create(
        user=instance.student,
        kind=kind,
        metadata={
            "quiz_id": str(instance.quiz_id),
            "score": float(instance.score),
            "passed": instance.passed,
        },
    )


@receiver(post_save, sender=Enrollment)
def record_enrollment_activity(sender, instance, created, **kwargs):
    if not created:
        return
    UserActivity.objects.create(
        user=instance.student,
        kind=UserActivity.Kind.COURSE_ENROLLED,
        metadata={"course_id": str(instance.course_id)},
    )
