"""
LLMService — Google Gemini API wrapper.
Iteration 2: wire up the LLM connection using the google-genai SDK.
"""
import logging
import json
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

        # ── Iteration 6 ───────────────────────────────────────────────────────────
    
    async def generate_embedding(self, text: str) -> list[float]:
        """
        Generates a 768-dimensional vector embedding for the input text.
        Uses the modern gemini-embedding-2 model truncated to 768 dimensions
        to match our Neo4j vector index constraints.
        """
        logger.debug("LLM Embed ▶ text=%.50s...", text)
        response = await self._client.aio.models.embed_content(
            model='gemini-embedding-2',
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768)
        )
        return response.embeddings[0].values

    async def synthesize_graphrag_context(self, query: str, graph_context: list[dict]) -> dict:
        """
        Iteration 8: Takes the user query and the retrieved Neo4j GraphRAG context,
        and asks the Gemini model to synthesize a final classification explanation.
        Forces the model to output strict JSON.
        """
        # 1. Format the graph data into a readable string for the LLM prompt
        context_str = json.dumps(graph_context, indent=2)
        
        # 2. Build the RAG prompt
        system_instruction = (
            "You are GovIntel.AI, an expert B2G semantic classification agent. "
            "Your job is to match the user's business description to the correct National "
            "Industrial Classification (NIC) code using ONLY the provided graph database context.\n\n"
            "Rules:\n"
            "1. Analyze the user's query against the provided graph context.\n"
            "2. Select the most relevant NIC activity from the context.\n"
            "3. Write a clear explanation of WHY this code matches, explicitly citing "
            "the related processes, products, or sectors found in the graph neighborhood.\n"
            "4. Return ONLY a valid JSON object with the keys: 'nic_code', 'activity_name', and 'explanation'. "
            "Do not use markdown formatting like ```json ... ```. Output raw JSON only."
        )
        
        user_prompt = f"User Query: {query}\n\nRetrieved Graph Context:\n{context_str}"
        
        # 3. Call the LLM (using your existing complete method logic, but adapted for JSON)
        try:
            # Note: Depending on your exact gemini SDK version in complete(), you might be 
            # able to pass generation_config={"response_mime_type": "application/json"}.
            # We enforce it via the system prompt to be safe.
            raw_response = await self.complete(
                prompt=user_prompt, 
                system=system_instruction
            )
            
            # Clean up the response just in case the LLM wrapped it in markdown code blocks
            clean_json = raw_response.strip().removeprefix("```json").removesuffix("```").strip()
            return json.loads(clean_json)
            
        except Exception as e:
            # Fallback if the LLM fails or returns invalid JSON
            return {
                "nic_code": "ERROR",
                "activity_name": "Synthesis Failed",
                "explanation": f"Failed to synthesize graph context: {str(e)}"
            }


# ── Module-level singleton ────────────────────────────────────────────────────
# Import and use directly in routes:
#   from app.services.llm import llm_service
llm_service = LLMService()