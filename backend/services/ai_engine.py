import os
import asyncio
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

MODEL_NAME = "gemini-3-flash-preview"


async def ask_gemini(prompt: str) -> str:
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.3,
                max_output_tokens=1024,
                response_mime_type="application/json",
            ),
        )

        return response.text or '{"explanation":"Empty response","suggestion":"retry","fix_command":""}'

    except Exception as e:
        print(f"[Gemini Error] {e}")
        return '{"explanation":"AI unavailable","suggestion":"retry","fix_command":""}'