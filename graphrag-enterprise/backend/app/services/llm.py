"""
LLMService — thin wrapper around the OpenAI chat-completions API.
Stub for Iteration 1; fully implemented in Iteration 3.
"""


class LLMService:
    """
    Sends a structured prompt to the configured LLM and returns
    the parsed NIC classification response.

    Planned interface (Iteration 3):
        await llm.complete(prompt: str) -> str
        await llm.classify(description: str, context: list[dict]) -> ClassificationResult
    """

    def __init__(self):
        self._client = None  # openai.AsyncOpenAI — wired in Iteration 3

    async def classify(self, description: str, context: list) -> dict:  # pragma: no cover
        raise NotImplementedError("LLMService.classify() — Iteration 3")