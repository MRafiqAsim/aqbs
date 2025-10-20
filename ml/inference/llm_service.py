"""LLM inference service with support for multiple providers."""
import json
from typing import Optional, Dict, Any
from backend.config import settings
from ml.prompts import get_question_generation_prompt, get_system_prompt

# Try to import MLX, but it's optional (only works on macOS)
try:
    import mlx_lm
    MLX_AVAILABLE = True
except ImportError:
    MLX_AVAILABLE = False
    print("MLX not available - will use Ollama or OpenAI instead")


class LLMService:
    """Handles LLM inference for question generation."""

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self.provider = settings.llm_provider

    def load_model(self):
        """Load the LLM model based on provider."""
        if self.provider == "mlx":
            if not MLX_AVAILABLE:
                raise ValueError("MLX is not available. Use 'ollama' or 'openai' provider instead.")
            self._load_mlx_model()
        elif self.provider == "ollama":
            # Ollama doesn't require loading - it's API based
            print("Using Ollama provider (API-based)")
        elif self.provider == "openai":
            # OpenAI doesn't require loading - it's API based
            print("Using OpenAI provider (API-based)")
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    def _load_mlx_model(self):
        """Load MLX model for Apple Silicon."""
        try:
            print(f"Loading MLX model: {settings.model_name}")
            self.model, self.tokenizer = mlx_lm.load(
                settings.model_name,
                tokenizer_config={"trust_remote_code": True}
            )
            print("MLX model loaded successfully")
        except Exception as e:
            print(f"Error loading MLX model: {e}")
            raise

    def generate_questions(
        self,
        text: str,
        num_questions: int = None
    ) -> Dict[str, Any]:
        """
        Generate questions from text using LLM.

        Args:
            text: Source text
            num_questions: Number of questions to generate

        Returns:
            Dictionary containing generated questions
        """
        if num_questions is None:
            num_questions = settings.default_questions_per_chunk

        # Generate prompt
        user_prompt = get_question_generation_prompt(text, num_questions)
        system_prompt = get_system_prompt()

        # Combine prompts for instruction-tuned models
        full_prompt = f"""<|system|>
{system_prompt}
<|user|>
{user_prompt}
<|assistant|>
"""

        # Generate response based on provider
        if self.provider == "mlx":
            response = self._generate_mlx(full_prompt)
        elif self.provider == "ollama":
            response = self._generate_ollama(full_prompt)
        elif self.provider == "openai":
            response = self._generate_openai(user_prompt, system_prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

        # Parse JSON response
        try:
            # Clean response - remove markdown code blocks if present
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
            response = response.strip()

            # Try to find valid JSON by looking for the questions array structure
            # Method 1: Find complete JSON object
            json_start = response.find('{')
            if json_start > 0:
                response = response[json_start:]

            # Method 2: Find the last complete closing brace for the main object
            # Count braces to find where the JSON actually ends
            brace_count = 0
            json_end = -1
            for i, char in enumerate(response):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i
                        break

            if json_end != -1:
                response = response[:json_end + 1]

            questions_data = json.loads(response)
            return questions_data
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Response length: {len(response)}")
            print(f"Response preview: {response[:500]}...")
            print(f"Response end: ...{response[-200:]}")
            raise ValueError(f"Invalid JSON response from LLM: {str(e)}")

    def _generate_mlx(self, prompt: str) -> str:
        """Generate response using MLX."""
        if self.model is None:
            self.load_model()

        try:
            # MLX uses a sampler for temperature control
            from mlx_lm.sample_utils import make_sampler

            sampler = make_sampler(
                temp=settings.mlx_temperature,
                top_p=0.95
            )

            response = mlx_lm.generate(
                self.model,
                self.tokenizer,
                prompt=prompt,
                max_tokens=settings.mlx_max_tokens,
                sampler=sampler,
                verbose=False
            )
            return response
        except Exception as e:
            print(f"MLX generation error: {e}")
            raise

    def _generate_ollama(self, prompt: str) -> str:
        """Generate response using Ollama API."""
        import requests

        try:
            response = requests.post(
                f"{settings.ollama_base_url}/api/generate",
                json={
                    "model": settings.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": settings.mlx_temperature,
                        "num_predict": settings.mlx_max_tokens
                    }
                }
            )
            response.raise_for_status()
            return response.json()["response"]
        except Exception as e:
            print(f"Ollama generation error: {e}")
            raise

    def _generate_openai(self, user_prompt: str, system_prompt: str) -> str:
        """Generate response using OpenAI API."""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)

            response = client.chat.completions.create(
                model=settings.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=settings.mlx_temperature,
                max_tokens=settings.mlx_max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"OpenAI generation error: {e}")
            raise


# Global instance
llm_service = LLMService()
