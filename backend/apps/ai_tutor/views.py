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
