from datetime import timedelta

from django.utils import timezone

from apps.courses.models import AttendanceRecord, CourseGrade
from apps.learning.models import QuizAttempt, Submission

JUSTIFICATION_DEADLINE_HOURS = 48
PASS_GRADE = 10  # note /20 pour l'admissibilité


def assignment_note(enrollment, assignment):
    """Note /20 d'un étudiant pour un devoir, ou None si non notée."""
    try:
        submission = Submission.objects.get(assignment=assignment, student=enrollment.student)
    except Submission.DoesNotExist:
        return None
    if submission.status != Submission.Status.GRADED or submission.grade is None:
        return None
    if not assignment.points:
        return None
    return float(submission.grade) / float(assignment.points) * 20


def quiz_note(enrollment, quiz):
    """Meilleure note /20 de l'étudiant au quiz, ou None."""
    best = (
        QuizAttempt.objects.filter(quiz=quiz, student=enrollment.student, submitted_at__isnull=False)
        .order_by("-score")
        .first()
    )
    if best is None:
        return None
    return float(best.score) / 100 * 20


def effective_note(evaluation, enrollment, attempt):
    """Note effective /20 pour une évaluation et une session d'examen."""
    if attempt == 1 and evaluation.quiz_id:
        return quiz_note(enrollment, evaluation.quiz)
    if attempt == 1 and evaluation.assignment_id:
        return assignment_note(enrollment, evaluation.assignment)
    grade = evaluation.grades.filter(enrollment=enrollment, attempt=attempt).first()
    if grade is not None and grade.note is not None:
        return float(grade.note)
    return None


def compute_average(enrollment, attempt):
    """Moyenne pondérée (/20) par les coefficients, sur la session d'examen donnée."""
    evaluations = enrollment.course.evaluations.all()
    weighted = 0.0
    total_coef = 0.0
    for evaluation in evaluations:
        note = effective_note(evaluation, enrollment, attempt)
        if note is None:
            continue
        coef = float(evaluation.coefficient or 1)
        weighted += coef * note
        total_coef += coef
    if total_coef == 0:
        return None
    return round(weighted / total_coef, 2)


def recommended_decision(avg):
    if avg is None:
        return CourseGrade.Decision.PENDING
    if avg >= PASS_GRADE:
        return CourseGrade.Decision.ADMIS
    return CourseGrade.Decision.RATTRAPAGE


def update_course_grade(enrollment, attempt):
    """Recalcule la moyenne et applique la décision recommandée si la délibération est en attente."""
    avg = compute_average(enrollment, attempt)
    grade, _ = CourseGrade.objects.get_or_create(enrollment=enrollment, attempt=attempt)
    grade.average = avg
    if grade.decision == CourseGrade.Decision.PENDING:
        grade.decision = recommended_decision(avg)
    grade.save(update_fields=["average", "decision"])
    return grade


def recompute_course_grades(course):
    """Recompute les moyennes (sessions 1 et 2) de tous les inscrits d'un cours."""
    enrollments = course.enrollments.filter(is_active=True)
    for enrollment in enrollments:
        update_course_grade(enrollment, 1)
        update_course_grade(enrollment, 2)


def create_session_records(session):
    """Crée les fiches de présence pour tous les inscrits actifs de la session."""
    student_ids = session.course.enrollments.filter(is_active=True).values_list("student_id", flat=True)
    existing = set(AttendanceRecord.objects.filter(session=session).values_list("student_id", flat=True))
    records = [
        AttendanceRecord(session=session, student_id=student_id)
        for student_id in student_ids
        if student_id not in existing
    ]
    AttendanceRecord.objects.bulk_create(records)
    return records


def attendance_summary(enrollment):
    """Récapitulatif des présences pour une inscription."""
    records = AttendanceRecord.objects.filter(
        session__course=enrollment.course, student=enrollment.student
    )
    return {
        "total": records.count(),
        "present": records.filter(status=AttendanceRecord.Status.PRESENT).count(),
        "late": records.filter(status=AttendanceRecord.Status.LATE).count(),
        "absent": records.filter(status=AttendanceRecord.Status.ABSENT).count(),
        "excused": records.filter(status=AttendanceRecord.Status.EXCUSED).count(),
        "pending_justifications": records.filter(
            justification_status=AttendanceRecord.JustificationStatus.PENDING
        ).count(),
    }


def attendance_rate(enrollment):
    summary = attendance_summary(enrollment)
    total = summary["total"]
    if total == 0:
        return None
    attended = summary["present"] + summary["late"] + summary["excused"]
    return round(attended / total * 100, 1)


def can_justify(record):
    """Une absence peut être justifiée dans les 48h après fin de séance."""
    if record.status != AttendanceRecord.Status.ABSENT:
        return False
    if record.justification_status in {
        AttendanceRecord.JustificationStatus.PENDING,
        AttendanceRecord.JustificationStatus.APPROVED,
    }:
        return False
    deadline = record.session_end + timedelta(hours=JUSTIFICATION_DEADLINE_HOURS)
    return timezone.now() <= deadline


def eligible_evaluations(enrollment, attempt):
    """Liste des évaluations notées (avec note /20) pour une session."""
    rows = []
    for evaluation in enrollment.course.evaluations.all():
        note = effective_note(evaluation, enrollment, attempt)
        rows.append({"evaluation": evaluation, "note": note})
    return rows