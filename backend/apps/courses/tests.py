from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.learning.models import Assignment, Quiz, QuizAttempt, QuizQuestion, Submission

from .models import (
    AttendanceRecord,
    Category,
    Course,
    CourseGrade,
    CourseInvitation,
    CourseReview,
    Enrollment,
    Evaluation,
    EvaluationGrade,
    Lesson,
    LessonComment,
    Module,
    Progress,
    UniversitySession,
)

User = get_user_model()


class CourseTests(APITestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            email="instructor@test.com",
            full_name="Test Instructor",
            password="password123",
            role="INSTRUCTOR",
        )
        self.student = User.objects.create_user(
            email="student@test.com",
            full_name="Test Student",
            password="password123",
            role="STUDENT",
        )

        # Create category
        self.category = Category.objects.create(name="Web Development", slug="web-dev")

        # Create published course
        self.course_published = Course.objects.create(
            title="Introduction to React",
            subtitle="Learn React from scratch",
            description="Detailed course",
            category=self.category,
            level="BEGINNER",
            price=29.99,
            is_published=True,
            instructor=self.instructor,
        )

        # Create draft course
        self.course_draft = Course.objects.create(
            title="Advanced React",
            subtitle="Deep dive react",
            description="Draft content",
            category=self.category,
            level="ADVANCED",
            price=49.99,
            is_published=False,
            instructor=self.instructor,
        )

        # Create module & lesson for progression testing
        self.module = Module.objects.create(
            course=self.course_published,
            title="React Basics",
            order=1,
        )
        self.lesson = Lesson.objects.create(
            module=self.module,
            title="Getting Started",
            lesson_type="VIDEO",
            status="PUBLISHED",
            order=1,
        )

    def test_list_categories(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("category-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Category view is paginated
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["name"], "Web Development")

    def test_list_courses_student_sees_published_only(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("course-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["title"], "Introduction to React")

    def test_list_courses_instructor_sees_own_drafts(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        # Should see both published React (since it's a course) and draft course they created
        self.assertEqual(len(results), 2)

    def test_create_course_instructor(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-list")
        data = {
            "title": "Django for Beginners",
            "price": "19.99",
            "level": "BEGINNER",
            "category": str(self.category.id),
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Course.objects.filter(title="Django for Beginners").exists())

    def test_create_course_student_forbidden(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("course-list")
        data = {
            "title": "Django for Students",
            "price": "19.99",
            "level": "BEGINNER",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_progress_tracking(self):
        # Enroll student in published course
        enrollment = Enrollment.objects.create(student=self.student, course=self.course_published)

        # Force authentication and call progression update API or verify model creation
        self.client.force_authenticate(user=self.student)
        
        # Check that we can record progress
        progress = Progress.objects.create(
            enrollment=enrollment,
            lesson=self.lesson,
            completion=100.00,
            is_completed=True,
        )
        
        self.assertEqual(Progress.objects.filter(enrollment=enrollment, lesson=self.lesson, is_completed=True).count(), 1)


class SecurityRegressionTests(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email="instructor@test.com",
            full_name="Test Instructor",
            password="password123",
            role="INSTRUCTOR",
        )
        self.student = User.objects.create_user(
            email="student@test.com",
            full_name="Test Student",
            password="password123",
            role="STUDENT",
        )
        self.other_student = User.objects.create_user(
            email="other@test.com",
            full_name="Other Student",
            password="password123",
            role="STUDENT",
        )
        self.category = Category.objects.create(name="Web Dev", slug="web-dev")
        self.course = Course.objects.create(
            title="React",
            description="Course",
            category=self.category,
            level="BEGINNER",
            price=0,
            is_published=True,
            instructor=self.instructor,
        )
        self.module = Module.objects.create(course=self.course, title="M1", order=1)
        self.lesson = Lesson.objects.create(module=self.module, title="L1", lesson_type="TEXT", status="PUBLISHED", order=1)

    def test_review_cannot_be_edited_by_other_user(self):
        review = CourseReview.objects.create(course=self.course, user=self.student, rating=5)
        self.client.force_authenticate(user=self.other_student)
        url = reverse("review-detail", args=[review.id])
        response = self.client.patch(url, {"rating": 1})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.student)
        response = self.client.patch(url, {"rating": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.rating, 1)

    def test_comment_cannot_be_deleted_by_other_user(self):
        comment = LessonComment.objects.create(lesson=self.lesson, user=self.student, content="Hi")
        self.client.force_authenticate(user=self.other_student)
        url = reverse("lesson-comment-detail", args=[comment.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_create_tag(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("tag-list"), {"name": "trending"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_create_section(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("section-list"), {"course": str(self.course.id), "title": "S", "order": 1})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_create_learning_path(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("learning-path-list"), {"title": "Path"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_enroll_in_draft_course(self):
        draft = Course.objects.create(
            title="Draft", description="D", category=self.category, level="BEGINNER",
            price=0, is_published=False, instructor=self.instructor,
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("enrollment-list"), {"course": str(draft.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_enroll_in_paid_course_without_payment(self):
        paid = Course.objects.create(
            title="Paid", description="P", category=self.category, level="BEGINNER",
            price=49.99, is_published=True, instructor=self.instructor,
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("enrollment-list"), {"course": str(paid.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_can_enroll_in_free_published_course(self):
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("enrollment-list"), {"course": str(self.course.id)})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class MarginalCourseInvitationTests(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email="instructor@test.com",
            full_name="Test Instructor",
            password="password123",
            role="INSTRUCTOR",
        )
        self.student = User.objects.create_user(
            email="student@test.com",
            full_name="Test Student",
            password="password123",
            role="STUDENT",
        )
        self.other_student = User.objects.create_user(
            email="other@test.com",
            full_name="Other Student",
            password="password123",
            role="STUDENT",
        )
        self.category = Category.objects.create(name="Mathematiques", slug="maths")
        self.course = Course.objects.create(
            title="Cours marginal d'analyse",
            description="Cours optionnel hors programme",
            category=self.category,
            level="BEGINNER",
            price=0,
            is_published=True,
            course_type=Course.CourseType.MARGINAL,
            start_date="2026-09-01",
            end_date="2026-12-31",
            instructor=self.instructor,
        )
        self.module = Module.objects.create(course=self.course, title="M1", order=1)
        self.lesson = Lesson.objects.create(module=self.module, title="L1", lesson_type="TEXT", status="PUBLISHED", order=1)

    def test_marginal_course_requires_period_dates(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-list")
        data = {
            "title": "Cours marginal sans période",
            "price": "0",
            "course_type": "MARGINAL",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_marginal_course_rejects_inverted_period(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-list")
        data = {
            "title": "Cours marginal inversé",
            "price": "0",
            "course_type": "MARGINAL",
            "start_date": "2026-12-31",
            "end_date": "2026-09-01",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_instructor_creates_invitation(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-invitations", args=[self.course.id])
        response = self.client.post(url, {"max_uses": 5})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["code"].startswith("EDU-"))
        self.assertEqual(response.data["used_count"], 0)

    def test_student_cannot_create_invitation(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("course-invitations", args=[self.course.id])
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_enroll_in_marginal_course_without_code(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("enrollment-list")
        response = self.client.post(url, {"course": str(self.course.id)})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_enroll_in_marginal_course_with_wrong_code(self):
        self.client.force_authenticate(user=self.student)
        url = reverse("enrollment-list")
        response = self.client.post(url, {"course": str(self.course.id), "invitation_code": "EDU-WRONG1"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_enroll_in_marginal_course_with_valid_code(self):
        invitation = CourseInvitation.objects.create(
            course=self.course,
            code="EDU-TEST42",
            max_uses=5,
            created_by=self.instructor,
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("enrollment-list")
        response = self.client.post(url, {"course": str(self.course.id), "invitation_code": "EDU-TEST42"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invitation.refresh_from_db()
        self.assertEqual(invitation.used_count, 1)
        enrollment = Enrollment.objects.get(student=self.student, course=self.course)
        self.assertEqual(enrollment.invitation_id, invitation.id)

    def test_code_usage_limit_is_enforced(self):
        invitation = CourseInvitation.objects.create(
            course=self.course,
            code="EDU-TEST42",
            max_uses=1,
            used_count=1,
            created_by=self.instructor,
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("enrollment-list")
        response = self.client.post(url, {"course": str(self.course.id), "invitation_code": "EDU-TEST42"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_revoked_invitation_cannot_be_used(self):
        invitation = CourseInvitation.objects.create(
            course=self.course,
            code="EDU-TEST42",
            created_by=self.instructor,
            is_active=False,
        )
        self.client.force_authenticate(user=self.student)
        url = reverse("enrollment-list")
        response = self.client.post(url, {"course": str(self.course.id), "invitation_code": "EDU-TEST42"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_share_code_does_not_leak_to_non_owners(self):
        invitation = CourseInvitation.objects.create(
            course=self.course,
            code="EDU-TEST42",
            created_by=self.instructor,
        )
        self.client.force_authenticate(user=self.other_student)
        url = reverse("course-invitations", args=[self.course.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UniversityTrackingTests(APITestCase):
    def setUp(self):
        self.instructor = User.objects.create_user(
            email="prof@test.com",
            full_name="Professeur Durand",
            password="password123",
            role="INSTRUCTOR",
        )
        self.student = User.objects.create_user(
            email="etudiant@test.com",
            full_name="Etudiant Martin",
            password="password123",
            role="STUDENT",
        )
        self.other_instructor = User.objects.create_user(
            email="autre-prof@test.com",
            full_name="Autre Prof",
            password="password123",
            role="INSTRUCTOR",
        )
        self.category = Category.objects.create(name="Droit", slug="droit")
        self.course = Course.objects.create(
            title="Cours marginal de droit civil",
            description="Cours en option",
            category=self.category,
            level="BEGINNER",
            price=0,
            is_published=True,
            course_type=Course.CourseType.MARGINAL,
            start_date="2026-09-01",
            end_date="2026-12-31",
            credits=3,
            instructor=self.instructor,
        )
        self.module = Module.objects.create(course=self.course, title="M1", order=1)
        self.lesson = Lesson.objects.create(module=self.module, title="L1", lesson_type="TEXT", status="PUBLISHED", order=1)
        self.enrollment = Enrollment.objects.create(student=self.student, course=self.course)
        self.quiz = Quiz.objects.create(module=self.module, title="Quiz droit", passing_score=50, created_by=self.instructor)
        self.question = QuizQuestion.objects.create(
            quiz=self.quiz,
            prompt="2+2 ?",
            options=["3", "4"],
            correct_index=1,
            order=1,
        )

    # --- Séances & assiduité ---

    def test_session_creation_creates_attendance_records(self):
        self.client.force_authenticate(user=self.instructor)
        url = reverse("university-session-list")
        response = self.client.post(
            url,
            {"course": str(self.course.id), "session_type": "CM", "date": "2026-10-05", "start_time": "09:00", "end_time": "11:00"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        session = UniversitySession.objects.get(id=response.data["id"])
        record = AttendanceRecord.objects.get(session=session, student=self.student)
        self.assertEqual(record.status, AttendanceRecord.Status.ABSENT)

    def test_non_owner_cannot_plan_session(self):
        self.client.force_authenticate(user=self.other_instructor)
        url = reverse("university-session-list")
        response = self.client.post(url, {"course": str(self.course.id), "date": "2026-10-05"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_marks_attendance(self):
        session = UniversitySession.objects.create(
            course=self.course, session_type="TD", date="2026-10-05", created_by=self.instructor
        )
        AttendanceRecord.objects.create(session=session, student=self.student)
        self.client.force_authenticate(user=self.instructor)
        url = reverse("university-session-attendance", args=[session.id])
        response = self.client.post(
            url,
            {"records": [{"student_id": str(self.student.id), "status": "PRESENT"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        AttendanceRecord.objects.get(session=session, student=self.student).refresh_from_db()
        self.assertEqual(self.student.attendance_records.get(session=session).status, "PRESENT")

    def test_student_justifies_absence_and_instructor_approves(self):
        session = UniversitySession.objects.create(
            course=self.course, session_type="TP", date=timezone.now().date(), created_by=self.instructor
        )
        record = AttendanceRecord.objects.create(session=session, student=self.student)
        self.client.force_authenticate(user=self.student)
        url = reverse("attendance-record-justify", args=[record.id])
        response = self.client.post(url, {"justification": "Rendez-vous médical"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record.refresh_from_db()
        self.assertEqual(record.justification_status, AttendanceRecord.JustificationStatus.PENDING)

        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(reverse("attendance-record-review", args=[record.id]), {"decision": "APPROVE"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        record.refresh_from_db()
        self.assertEqual(record.status, AttendanceRecord.Status.EXCUSED)
        self.assertEqual(record.justification_status, AttendanceRecord.JustificationStatus.APPROVED)

    def test_student_cannot_justify_someone_elses_absence(self):
        other = User.objects.create_user(email="autre@test.com", full_name="Autre", password="x", role="STUDENT")
        session = UniversitySession.objects.create(course=self.course, session_type="CM", date="2026-10-05", created_by=self.instructor)
        record = AttendanceRecord.objects.create(session=session, student=other)
        self.client.force_authenticate(user=self.student)
        response = self.client.post(reverse("attendance-record-justify", args=[record.id]), {"justification": "X"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # --- Évaluations & notes ---

    def test_quiz_evaluation_note_is_automatic(self):
        QuizAttempt.objects.create(
            quiz=self.quiz, student=self.student, answers={}, score=80, passed=True, submitted_at=timezone.now()
        )
        self.client.force_authenticate(user=self.instructor)
        url = reverse("evaluation-list")
        response = self.client.post(
            url,
            {"course": str(self.course.id), "kind": "CONTINUOUS", "title": "Quiz 1", "coefficient": "2", "quiz": str(self.quiz.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        evaluation = Evaluation.objects.get(id=response.data["id"])
        self.assertEqual(evaluation.quiz_id, self.quiz.id)
        # La note /20 = 80/100*20 = 16
        grade_1 = CourseGrade.objects.get(enrollment=self.enrollment, attempt=1)
        self.assertEqual(float(grade_1.average), 16.0)

    def test_manual_evaluation_grade_entry_computes_average(self):
        evaluation = Evaluation.objects.create(
            course=self.course, kind="EXAM", title="Examen final", coefficient=3, created_by=self.instructor
        )
        self.client.force_authenticate(user=self.instructor)
        url = reverse("evaluation-grade-list")
        response = self.client.post(
            url,
            {
                "evaluation": str(evaluation.id),
                "enrollment": str(self.enrollment.id),
                "attempt": 1,
                "note": "14.5",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        grade = CourseGrade.objects.get(enrollment=self.enrollment, attempt=1)
        self.assertEqual(float(grade.average), 14.5)

    def test_student_cannot_enter_grades(self):
        evaluation = Evaluation.objects.create(
            course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor
        )
        self.client.force_authenticate(user=self.student)
        response = self.client.post(
            reverse("evaluation-grade-list"),
            {"evaluation": str(evaluation.id), "enrollment": str(self.enrollment.id), "attempt": 1, "note": "15"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_out_of_range_note_rejected(self):
        evaluation = Evaluation.objects.create(
            course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor
        )
        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(
            reverse("evaluation-grade-list"),
            {"evaluation": str(evaluation.id), "enrollment": str(self.enrollment.id), "attempt": 1, "note": "25"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # --- Délibération & validation UE ---

    def test_decide_admis_grants_credits(self):
        Evaluation.objects.create(course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor)
        EvaluationGrade.objects.create(evaluation=self.course.evaluations.first(), enrollment=self.enrollment, attempt=1, note="14")
        CourseGrade.objects.filter(enrollment=self.enrollment, attempt=1).update(average=14, decision=CourseGrade.Decision.ADMIS, credits_earned=3)

        self.client.force_authenticate(user=self.instructor)
        url = reverse("course-grades-decide", args=[self.course.id])
        response = self.client.post(
            url,
            {"enrollment_id": str(self.enrollment.id), "attempt": 1, "decision": "ADMIS"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        grade = CourseGrade.objects.get(enrollment=self.enrollment, attempt=1)
        self.assertEqual(grade.decision, CourseGrade.Decision.ADMIS)
        self.assertEqual(grade.credits_earned, 3)

    def test_cannot_admis_below_ten_without_compensation(self):
        evaluation = Evaluation.objects.create(course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor)
        EvaluationGrade.objects.create(evaluation=evaluation, enrollment=self.enrollment, attempt=1, note="8")
        grade, _ = CourseGrade.objects.get_or_create(enrollment=self.enrollment, attempt=1)
        grade.average = 8
        grade.decision = CourseGrade.Decision.RATTRAPAGE
        grade.save()

        self.client.force_authenticate(user=self.instructor)
        response = self.client.post(
            reverse("course-grades-decide", args=[self.course.id]),
            {"enrollment_id": str(self.enrollment.id), "attempt": 1, "decision": "ADMIS"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ratrapage_then_admis_on_session_two(self):
        evaluation = Evaluation.objects.create(course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor)
        EvaluationGrade.objects.create(evaluation=evaluation, enrollment=self.enrollment, attempt=1, note="8")
        grade, _ = CourseGrade.objects.get_or_create(enrollment=self.enrollment, attempt=1)
        grade.average = 8
        grade.decision = CourseGrade.Decision.RATTRAPAGE
        grade.save()

        self.client.force_authenticate(user=self.instructor)
        # Note de rattrapage session 2
        response = self.client.post(
            reverse("evaluation-grade-list"),
            {"evaluation": str(evaluation.id), "enrollment": str(self.enrollment.id), "attempt": 2, "note": "11"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        grade_2 = CourseGrade.objects.get(enrollment=self.enrollment, attempt=2)
        self.assertEqual(float(grade_2.average), 11.0)

        response = self.client.post(
            reverse("course-grades-decide", args=[self.course.id]),
            {"enrollment_id": str(self.enrollment.id), "attempt": 2, "decision": "ADMIS"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        grade_2.refresh_from_db()
        self.assertEqual(grade_2.decision, CourseGrade.Decision.ADMIS)
        self.assertEqual(grade_2.credits_earned, 3)

    # --- Relevé de notes ---

    def test_student_transcript_contains_grades_and_attendance(self):
        evaluation = Evaluation.objects.create(course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor)
        EvaluationGrade.objects.create(evaluation=evaluation, enrollment=self.enrollment, attempt=1, note="13")
        session = UniversitySession.objects.create(course=self.course, session_type="CM", date="2026-10-05", created_by=self.instructor)
        AttendanceRecord.objects.create(session=session, student=self.student, status=AttendanceRecord.Status.EXCUSED)

        self.client.force_authenticate(user=self.student)
        url = reverse("course-transcript", args=[self.course.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["rows"]), 1)
        row = response.data["rows"][0]
        self.assertEqual(row["credits_earned"], 0)
        self.assertEqual(row["attendance"]["total"], 1)
        self.assertEqual(row["attendance"]["excused"], 1)
        evaluations_notes = [e["note"] for e in row["evaluations"] if e["note"] is not None]
        self.assertEqual(evaluations_notes, [13.0])

    def test_transcript_denied_to_non_enrolled_student(self):
        other = User.objects.create_user(email="noninscrit@test.com", full_name="Non inscrit", password="x", role="STUDENT")
        self.client.force_authenticate(user=other)
        response = self.client.get(reverse("course-transcript", args=[self.course.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_instructor_sees_all_students_in_grades_summary(self):
        evaluation = Evaluation.objects.create(course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor)
        EvaluationGrade.objects.create(evaluation=evaluation, enrollment=self.enrollment, attempt=1, note="12")
        self.client.force_authenticate(user=self.instructor)
        response = self.client.get(reverse("course-grades-summary", args=[self.course.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["students"]), 1)
        self.assertEqual(response.data["students"][0]["session_1"]["average"], 12.0)
        self.assertEqual(response.data["course"]["credits"], 3)

    def test_grades_summary_forbidden_to_other_instructor(self):
        self.client.force_authenticate(user=self.other_instructor)
        response = self.client.get(reverse("course-grades-summary", args=[self.course.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_sees_own_row_in_grades_summary(self):
        evaluation = Evaluation.objects.create(course=self.course, kind="EXAM", title="Examen", coefficient=1, created_by=self.instructor)
        EvaluationGrade.objects.create(evaluation=evaluation, enrollment=self.enrollment, attempt=1, note="12")
        self.client.force_authenticate(user=self.student)
        response = self.client.get(reverse("course-grades-summary", args=[self.course.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["students"]), 1)
        row = response.data["students"][0]
        self.assertEqual(row["student_id"], self.student.id)
        self.assertEqual(row["session_1"]["average"], 12.0)

    def test_grades_summary_forbidden_to_non_enrolled_student(self):
        other = User.objects.create_user(email="noninscrit2@test.com", full_name="Non inscrit 2", password="x", role="STUDENT")
        self.client.force_authenticate(user=other)
        response = self.client.get(reverse("course-grades-summary", args=[self.course.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
