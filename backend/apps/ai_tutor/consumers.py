import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from apps.billing.services import can_use_ai

from .models import AITutorConversation, AITutorMessage
from .openrouter import OpenRouterError, ask_with_context, continue_with_reasoning


class TutorChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        await self.accept()

    async def receive(self, text_data):
        payload = json.loads(text_data)
        prompt = (payload.get("prompt") or "").strip()
        follow_up = (payload.get("follow_up") or "").strip()
        assistant_message = payload.get("assistant_message")
        history = payload.get("history")
        conversation_id = payload.get("conversation_id")

        if not prompt and not follow_up:
            await self.send(text_data=json.dumps({"kind": "error", "detail": "prompt is required"}))
            return

        allowed, reason = await self._can_use_ai()
        if not allowed:
            await self.send(text_data=json.dumps({"kind": "error", "detail": reason}))
            return

        try:
            if follow_up and assistant_message:
                result = await sync_to_async(continue_with_reasoning)(
                    previous_messages=history or [],
                    last_assistant_message=assistant_message,
                    follow_up=follow_up,
                )
                prompt_text = follow_up
            else:
                result = await sync_to_async(ask_with_context)(
                    user_prompt=prompt,
                    history=history or None,
                )
                prompt_text = prompt

            content = result.get("content", "")
            usage = result.get("usage", {})

            await self._save_message(prompt_text, content, conversation_id)
            await self.send(
                text_data=json.dumps(
                    {
                        "kind": "ai_response",
                        "response": content,
                        "usage": usage,
                    }
                )
            )
        except OpenRouterError as exc:
            await self.send(text_data=json.dumps({"kind": "error", "detail": str(exc)}))
        except Exception:
            await self.send(text_data=json.dumps({"kind": "error", "detail": "Erreur IA."}))
            return

        await self._increment_usage()

    async def _can_use_ai(self):
        return await sync_to_async(can_use_ai)(self.scope["user"])

    async def _save_message(self, prompt, response_text, conversation_id=None):
        kwargs = {
            "user": self.scope["user"],
            "prompt": prompt,
            "response": response_text,
        }
        if conversation_id:
            conversation = await sync_to_async(AITutorConversation.objects.filter(
                id=conversation_id, user=self.scope["user"]
            ).first)()
            if conversation:
                kwargs["conversation"] = conversation
        await sync_to_async(AITutorMessage.objects.create)(**kwargs)

    async def _increment_usage(self):
        user = self.scope["user"]
        subscription = await sync_to_async(lambda: getattr(user, "subscription", None))()
        if subscription and not subscription.plan.has_unlimited_ai:
            subscription.ai_prompts_used_this_month += 1
            await sync_to_async(subscription.save)(update_fields=["ai_prompts_used_this_month", "updated_at"])
