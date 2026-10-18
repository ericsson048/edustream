import json
import re
from urllib import error, request

from django.conf import settings


class OpenRouterError(Exception):
    pass


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "cohere/north-mini-code:free"
MAX_HISTORY = 6

JSON_MODELS = [
    ("cohere/north-mini-code:free", 8192),
    ("nvidia/nemotron-3-super-120b-a12b:free", 8192),
    ("nvidia/nemotron-3-ultra-550b-a55b:free", 8192),
]


def _post(messages: list[dict], model: str, max_tokens: int) -> dict:
    api_key = settings.OPENROUTER_API_KEY.strip()
    if not api_key:
        raise OpenRouterError("OPENROUTER_API_KEY is not configured.")

    payload = {
        "model": model,
        "messages": messages,
        "reasoning": {"enabled": True},
        "max_tokens": max_tokens,
    }

    data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        OPENROUTER_URL,
        data=data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(req, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise OpenRouterError(detail or "OpenRouter request failed.") from exc
    except error.URLError as exc:
        raise OpenRouterError("OpenRouter is unreachable from the backend.") from exc

    choices = body.get("choices", [])
    if not choices:
        raise OpenRouterError("OpenRouter returned no choices.")

    message = choices[0].get("message", {})
    usage = body.get("usage", {})

    return {
        "content": message.get("content", ""),
        "reasoning_details": message.get("reasoning_details"),
        "role": message.get("role", "assistant"),
        "usage": {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        },
    }


def extract_json(raw: str) -> dict:
    """Extract a JSON object from LLM output even if surrounded by text/fences."""
    raw = (raw or "").strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    raw = re.sub(r"\s*```$", "", raw).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    start = raw.find("{")
    if start == -1:
        raise json.JSONDecodeError("No JSON object found", raw, 0)
    depth = 0
    end = -1
    in_string = False
    escape = False
    for i, ch in enumerate(raw[start:], start):
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if not in_string:
            if ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
    if end == -1:
        raise json.JSONDecodeError("Unterminated JSON object", raw, start)
    return json.loads(raw[start:end])


def generate_json(prompt: str, max_tokens: int = 8192) -> dict:
    """Ask the fallback model list to produce a JSON object."""
    last_error: Exception = OpenRouterError("No model available.")
    for model, default_max in JSON_MODELS:
        try:
            result = _post(
                messages=[{"role": "user", "content": prompt}],
                model=model,
                max_tokens=max_tokens or default_max,
            )
            content = (result.get("content") or "").strip()
            if content:
                return extract_json(content)
            last_error = OpenRouterError(f"{model} returned an empty response.")
        except (OpenRouterError, ValueError) as exc:
            last_error = exc
            continue
    raise OpenRouterError(str(last_error))


def _trim_history(history: list[dict] | None) -> list[dict]:
    if not history:
        return []
    return history[-MAX_HISTORY:]


def build_system_prompt() -> str:
    return (
        "You are EduStream AI, a helpful assistant for an online learning platform called EduStream. "
        "The platform lets students take courses, instructors create content, and admins manage everything. "
        "Key features: course catalog with modules/lessons/quizzes, live sessions, assignments, "
        "community study groups, direct messaging, AI tutor, progress tracking, certificates. "
        "Roles: ADMIN, INSTRUCTOR, STUDENT. "
        "Users can subscribe to plans (Free/Pro/Unlimited). "
        "Answer concisely and helpfully based on this context. "
        "When asked about platform features, explain how they work. "
        "Keep responses short and practical."
    )


def ask(
    messages: list[dict],
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
) -> dict:
    full_messages = [{"role": "system", "content": build_system_prompt()}, *messages]
    return _post(full_messages, model, max_tokens)


def ask_with_context(
    user_prompt: str,
    history: list[dict] | None = None,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
) -> dict:
    system = {"role": "system", "content": build_system_prompt()}
    trimmed = _trim_history(history)
    messages = [system, *trimmed, {"role": "user", "content": user_prompt}]
    return _post(messages, model, max_tokens)


def continue_with_reasoning(
    previous_messages: list[dict],
    last_assistant_message: dict,
    follow_up: str,
    model: str = DEFAULT_MODEL,
    max_tokens: int = 1024,
) -> dict:
    system = {"role": "system", "content": build_system_prompt()}
    trimmed = _trim_history(previous_messages)
    messages = [
        system,
        *trimmed,
        {
            "role": "assistant",
            "content": last_assistant_message.get("content", ""),
            "reasoning_details": last_assistant_message.get("reasoning_details"),
        },
        {"role": "user", "content": follow_up},
    ]
    return _post(messages, model, max_tokens)
