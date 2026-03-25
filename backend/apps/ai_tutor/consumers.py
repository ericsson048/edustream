import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer

from apps.billing.services import can_use_ai

from .models import AITutorMessage


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
        if not prompt:
            await self.send(text_data=json.dumps({"kind": "error", "detail": "prompt is required"}))
            return

        allowed, reason = await self._can_use_ai()
        if not allowed:
            await self.send(text_data=json.dumps({"kind": "error", "detail": reason}))
            return

        response_text = (
            "Tutor IA: voici une explication structuree de votre question. "
            f"Point cle: {prompt[:180]}"
        )
        await self._save_message(prompt, response_text)
        await self.send(text_data=json.dumps({"kind": "ai_response", "response": response_text}))

    async def _can_use_ai(self):
        return await sync_to_async(can_use_ai)(self.scope["user"])

    async def _save_message(self, prompt, response_text):
        await sync_to_async(AITutorMessage.objects.create)(user=self.scope["user"], prompt=prompt, response=response_text)
