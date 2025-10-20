"""Question generation prompt templates."""

SYSTEM_PROMPT = """You are an expert educational content creator specializing in generating high-quality assessment questions from text content. Your task is to analyze the given text and create clear, accurate, and pedagogically sound questions."""

QUESTION_GENERATION_PROMPT = """Based on the following text, generate {num_questions} educational questions.

TEXT:
{text}

REQUIREMENTS:
1. Generate exactly {num_questions} questions
2. Create a mix of question types: Multiple Choice (MCQ), Fill-in-the-Blank, and True/False
3. Each question should test understanding of key concepts from the text
4. Questions should be clear, unambiguous, and grammatically correct
5. For MCQs: provide 4 options (A, B, C, D) with exactly one correct answer
6. Include detailed explanations for each answer
7. Assign appropriate difficulty levels: easy, medium, or hard
8. Identify the topic/subject for each question

OUTPUT FORMAT:
Return ONLY a valid JSON object in this exact structure (no additional text):
{{
  "questions": [
    {{
      "type": "mcq",
      "question": "Question text here?",
      "options": [
        {{"label": "A", "text": "First option"}},
        {{"label": "B", "text": "Second option"}},
        {{"label": "C", "text": "Third option"}},
        {{"label": "D", "text": "Fourth option"}}
      ],
      "correct_answer": "B",
      "explanation": "Detailed explanation of why B is correct",
      "difficulty": "medium",
      "topic": "Topic name"
    }},
    {{
      "type": "fill_in_blank",
      "question": "The capital of France is _______.",
      "correct_answer": "Paris",
      "explanation": "Paris is the capital city of France",
      "difficulty": "easy",
      "topic": "Geography"
    }},
    {{
      "type": "true_false",
      "question": "The Earth is flat.",
      "correct_answer": "False",
      "explanation": "The Earth is a sphere (oblate spheroid)",
      "difficulty": "easy",
      "topic": "Science"
    }}
  ]
}}

Remember: Return ONLY the JSON object, no markdown formatting, no code blocks, no additional text."""


def get_question_generation_prompt(text: str, num_questions: int = 5) -> str:
    """
    Generate a prompt for question generation.

    Args:
        text: Source text to generate questions from
        num_questions: Number of questions to generate

    Returns:
        Formatted prompt string
    """
    return QUESTION_GENERATION_PROMPT.format(
        text=text,
        num_questions=num_questions
    )


def get_system_prompt() -> str:
    """Get the system prompt."""
    return SYSTEM_PROMPT
