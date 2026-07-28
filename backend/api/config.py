from dotenv import load_dotenv
import os

class Config:
    def __init__(self):
        load_dotenv()
        pass
    
    def get_mistral_api_key(self):
        try:
            mistral_api_key = os.getenv("MISTRAL_API_KEY")
            if not mistral_api_key:
                print("MISTRAL_API_KEY is not set")
                raise ValueError("MISTRAL_API_KEY is not set")
            return mistral_api_key
        except Exception as e:
            print(f"Failed to get Mistral API key: {e}")
            raise

    def get_supabase_url(self):
        try:
            supabase_url = os.getenv("SUPABASE_URL")
            if not supabase_url:
                print("SUPABASE_URL is not set")
                raise ValueError("SUPABASE_URL is not set")
            return supabase_url
        except Exception as e:
            print(f"Failed to get Supabase URL: {e}")
            raise

    def get_supabase_key(self):
        try:
            supabase_key = os.getenv("SUPABASE_KEY")
            if not supabase_key:
                print("SUPABASE_KEY is not set")
                raise ValueError("SUPABASE_KEY is not set")
            return supabase_key
        except Exception as e:
            print(f"Failed to get Supabase key: {e}")
            raise

    def get_hf_token(self):
        try:
            hf_token = os.getenv("HUGGINGFACE_API_TOKEN")
            if not hf_token:
                print("HUGGINGFACE_API_TOKEN is not set")
                raise ValueError("HUGGINGFACE_API_TOKEN is not set")
            return hf_token
        except Exception as e:
            print(f"Failed to get Supabase key: {e}")
            raise

    def get_qdrant_url(self):
        try:
            qdrant_url = os.getenv("QDRANT_URL")
            if not qdrant_url:
                print("QDRANT_URL is not set")
                raise ValueError("QDRANT_URL is not set")
            return qdrant_url
        except Exception as e:
            print(f"Failed to get Qdrant URL: {e}")
            raise

    def get_qdrant_api_key(self):
        try:
            qdrant_api_key = os.getenv("QDRANT_API_KEY")
            if not qdrant_api_key:
                print("QDRANT_API_KEY is not set")
                raise ValueError("QDRANT_API_KEY is not set")
            return qdrant_api_key
        except Exception as e:
            print(f"Failed to get Qdrant API key: {e}")
            raise