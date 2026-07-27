import os
from supabase import create_client, Client
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from api.config import Config





class AuthRequest(BaseModel):
    email: str
    password: str
    role: Optional[str] = "user" 
    name: Optional[str] = ""

class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    access_token: Optional[str] = None

class AuthenticationSystem:
    def __init__(self):
        self.config = Config()
        self.supabase_url = self.config.get_supabase_url()
        self.supabase_key = self.config.get_supabase_key()
        
        self.client: Optional[Client] = None

        if self.supabase_url and self.supabase_key:
            try:
                self.client = create_client(self.supabase_url, self.supabase_key)
                print("Supabase client initialized successfully in AuthenticationSystem.")
            except Exception as e:
                print(f"Warning: Failed to initialize Supabase client: {e}")

    def sign_up(self, email: str, password: str, role: str = "user", name: str = "") -> Dict[str, Any]:
        """Register a new user or admin with email/password in Supabase."""
        if not self.client:
            
            return {
                "user": {"id": "mock_user_id", "email": email, "user_metadata": {"role": role, "name": name}},
                "session": {"access_token": "mock_jwt_access_token"}
            }
        
        try:
            res = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "role": role,
                        "name": name or email.split("@")[0]
                    }
                }
            })
            user_data = res.user.model_dump() if hasattr(res.user, "model_dump") else str(res.user)
            session_data = res.session.model_dump() if res.session and hasattr(res.session, "model_dump") else (str(res.session) if res.session else None)
            return {"user": user_data, "session": session_data}
        except Exception as e:
            raise Exception(f"Signup failed: {str(e)}")

    def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user/admin with email/password via Supabase."""
        if not self.client:
            role = "admin" if "admin" in email.lower() else "user"
            return {
                "user": {
                    "id": "mock_user_123",
                    "email": email,
                    "user_metadata": {"role": role, "name": email.split("@")[0].capitalize()}
                },
                "session": {"access_token": "mock_jwt_access_token_123"}
            }

        try:
            res = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            user_dict = res.user.model_dump() if hasattr(res.user, "model_dump") else {}
            metadata = getattr(res.user, 'user_metadata', {}) or {}
            
            if "admin" in email.lower() and not metadata.get("role"):
                metadata["role"] = "admin"

            return {
                "user": user_dict,
                "metadata": metadata,
                "session": res.session.model_dump() if res.session and hasattr(res.session, "model_dump") else None
            }
        except Exception as e:
            raise Exception(f"Authentication failed: {str(e)}")

    def get_google_auth_url(self) -> Dict[str, str]:
        """Generate Google OAuth Sign In URL via Supabase."""
        if not self.client:
            return {"url": "https://accounts.google.com/o/oauth2/auth"}

        try:
            res = self.client.auth.get_url_for_provider({"provider": "google", "options": {"redirect_to": "https://aura-health-ai-assistence.vercel.app/"}})
            return {"url": res.url if hasattr(res, 'url') else str(res)}
        except Exception as e:
            return {"url": "", "error": str(e)}

    def google_sign_in(self, id_token: str) -> Dict[str, Any]:
        """Verify Google OAuth token via Supabase."""
        if not self.client:
            return {
                "user": {
                    "id": "google_user_999",
                    "email": "user@gmail.com",
                    "user_metadata": {"role": "user", "name": "Google User"}
                },
                "session": {"access_token": "mock_google_jwt_token"}
            }

        try:
            res = self.client.auth.sign_in_with_id_token({
                "provider": "google",
                "id_token": id_token
            })
            return {
                "user": res.user.model_dump() if hasattr(res.user, "model_dump") else str(res.user),
                "session": res.session.model_dump() if res.session and hasattr(res.session, "model_dump") else None
            }
        except Exception as e:
            raise Exception(f"Google authentication failed: {str(e)}")
