"""
LLMService — Google Gemini API wrapper.
Iteration 2: wire up the LLM connection using the google-genai SDK.
"""
import logging
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    """
    Thin async wrapper around the Gemini API.

    Iteration 2 provides:
        complete(prompt)       — raw single-turn text completion
        chat(messages)         — multi-turn conversation

    Iteration 4 will add:
        classify(description, context)  — NIC code classification with GraphRAG context
    """

    def __init__(self):
        if not settings.GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY is not set. "
                "Get a key at https://aistudio.google.com/app/apikey "
                "and add it to backend/.env"
            )
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model  = settings.LLM_MODEL
        logger.info("LLMService ready  |  model=%s", self._model)

    # ── Core methods ──────────────────────────────────────────────────────────

    async def complete(self, prompt: str, system: str | None = None) -> str:
        """
        Single-turn prompt → text response.

        Args:
            prompt: The user message.
            system: Optional system instruction that sets model behaviour/persona.

        Returns:
            Plain-text reply from the model.
        """
        logger.debug("LLM ▶  model=%s  prompt=%.120s", self._model, prompt)

        config = None
        if system:
            config = types.GenerateContentConfig(system_instruction=system)

        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=config,
        )

        text = response.text
        logger.debug("LLM ◀  chars=%d  preview=%.120s", len(text), text)
        return text

    async def chat(self, messages: list[dict]) -> str:
        """
        Multi-turn conversation.

        Args:
            messages: [{"role": "user"|"model", "content": "..."}, ...]

        Returns:
            The model's latest reply as plain text.
        """
        contents = [
            types.Content(
                role=m["role"],
                parts=[types.Part(text=m["content"])],
            )
            for m in messages
        ]
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=contents,
        )
        return response.text

    # ── Iteration 4 stub ──────────────────────────────────────────────────────

    async def classify(self, description: str, context: list) -> dict:
        """NIC code classification with GraphRAG context — implemented in Iteration 4."""
        raise NotImplementedError("LLMService.classify() — Iteration 4")


# ── Module-level singleton ────────────────────────────────────────────────────
# Import and use directly in routes:
#   from app.services.llm import llm_service
llm_service = LLMService()