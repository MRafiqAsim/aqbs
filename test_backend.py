"""Quick test script to verify backend setup."""
import asyncio
from backend.config import settings


async def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")

    try:
        from backend.api.main import app
        print("✓ FastAPI app imported")

        from backend.models import db_manager
        print("✓ Database manager imported")

        from backend.services.upload_service import upload_service
        print("✓ Upload service imported")

        from backend.services.extraction_service import extraction_service
        print("✓ Extraction service imported")

        from backend.services.question_service import question_service
        print("✓ Question service imported")

        from ml.inference import llm_service
        print("✓ LLM service imported")

        from ml.prompts import get_question_generation_prompt
        print("✓ Prompt templates imported")

        print("\n✅ All imports successful!")
        return True

    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        return False


def test_config():
    """Test configuration loading."""
    print("\nTesting configuration...")

    try:
        print(f"✓ Environment: {settings.environment}")
        print(f"✓ MongoDB URL: {settings.mongodb_url}")
        print(f"✓ LLM Provider: {settings.llm_provider}")
        print(f"✓ Model Name: {settings.model_name}")
        print(f"✓ Upload Dir: {settings.upload_dir}")

        print("\n✅ Configuration loaded successfully!")
        return True

    except Exception as e:
        print(f"\n❌ Configuration failed: {e}")
        return False


async def main():
    """Run all tests."""
    print("=" * 60)
    print("QBank Backend Test Suite")
    print("=" * 60)

    results = []

    # Test imports
    results.append(await test_imports())

    # Test configuration
    results.append(test_config())

    # Summary
    print("\n" + "=" * 60)
    if all(results):
        print("✅ All tests passed! Backend is ready.")
        print("\nNext steps:")
        print("1. Start MongoDB: brew services start mongodb-community")
        print("2. Run backend: ./run_backend.sh")
        print("3. Visit: http://localhost:8000/docs")
    else:
        print("❌ Some tests failed. Please check the errors above.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
