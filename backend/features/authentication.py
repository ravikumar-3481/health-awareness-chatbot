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

    # Shared admin approvals store
    admin_approvals: Dict[str, Dict[str, Any]] = {}

    def sign_up(self, email: str, password: str, role: str = "user", name: str = "") -> Dict[str, Any]:
        """Register a new user or admin with email/password in Supabase."""
        is_admin_request = role == "admin"
        approval_status = "pending" if is_admin_request else "approved"

        if is_admin_request:
            AuthenticationSystem.admin_approvals[email.lower()] = {
                "email": email,
                "name": name or email.split("@")[0],
                "status": "pending",
                "requested_at": "Just now"
            }

        if not self.client:
            return {
                "user": {
                    "id": "mock_user_id",
                    "email": email,
                    "user_metadata": {
                        "role": role,
                        "name": name,
                        "admin_approved": not is_admin_request
                    }
                },
                "session": {"access_token": "mock_jwt_access_token"},
                "admin_approved": not is_admin_request
            }
        
        try:
            res = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "role": role,
                        "name": name or email.split("@")[0],
                        "admin_approved": not is_admin_request
                    }
                }
            })
            user_data = res.user.model_dump() if hasattr(res.user, "model_dump") else str(res.user)
            session_data = res.session.model_dump() if res.session and hasattr(res.session, "model_dump") else (str(res.session) if res.session else None)
            return {
                "user": user_data,
                "session": session_data,
                "admin_approved": not is_admin_request
            }
        except Exception as e:
            raise Exception(f"Signup failed: {str(e)}")

    def sign_in(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user/admin with email/password via Supabase."""
        email_key = email.lower()
        if not self.client:
            role = "admin" if "admin" in email.lower() else "user"
            admin_approved = True
            if role == "admin" and email_key in AuthenticationSystem.admin_approvals:
                admin_approved = AuthenticationSystem.admin_approvals[email_key]["status"] == "approved"

            return {
                "user": {
                    "id": "mock_user_123",
                    "email": email,
                    "user_metadata": {"role": role, "name": email.split("@")[0].capitalize(), "admin_approved": admin_approved}
                },
                "metadata": {"role": role, "admin_approved": admin_approved},
                "session": {"access_token": "mock_jwt_access_token_123"},
                "admin_approved": admin_approved
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

            admin_approved = metadata.get("admin_approved", True)
            if metadata.get("role") == "admin" and email_key in AuthenticationSystem.admin_approvals:
                admin_approved = AuthenticationSystem.admin_approvals[email_key]["status"] == "approved"

            return {
                "user": user_dict,
                "metadata": metadata,
                "session": res.session.model_dump() if res.session and hasattr(res.session, "model_dump") else None,
                "admin_approved": admin_approved
            }
        except Exception as e:
            raise Exception(f"Authentication failed: {str(e)}")

    def get_google_auth_url(self, redirect_to: str = "") -> Dict[str, str]:
        """Generate Google OAuth Sign In URL via Supabase."""
        from urllib.parse import quote
        target_redirect = redirect_to or "http://localhost:5173"
        if not self.client:
            return {"url": f"https://accounts.google.com/o/oauth2/v2/auth?redirect_uri={quote(target_redirect)}"}

        try:
            res = self.client.auth.get_url_for_provider({
                "provider": "google",
                "options": {
                    "redirect_to": target_redirect
                }
            })
            url_str = res.url if hasattr(res, 'url') else str(res)
            return {"url": url_str}
        except Exception as e:
            return {"url": "", "error": str(e)}

    def google_sign_in(self, id_token: Optional[str] = None) -> Dict[str, Any]:
        """Verify Google OAuth ID token via Supabase.

        NOTE (fix): earlier this silently returned a fake/mock user+session
        whenever id_token was missing, empty, or a "mock_" placeholder -
        *even when Supabase was properly configured*. That masked the real
        problem: the frontend either isn't sending a real Google id_token,
        or it's using the redirect-based OAuth flow (get_google_auth_url)
        instead of the id_token flow, so this endpoint never receives a
        usable token and login silently "succeeds" with fake data instead
        of failing loudly.

        New behavior:
          - If Supabase is NOT configured at all (self.client is None), we
            still return the mock response - this is expected local/dev
            behavior, unchanged from before.
          - If Supabase IS configured but no real id_token was provided,
            we now raise an exception instead of pretending to log the
            user in. This is almost always a sign the frontend is using
            the wrong flow (see get_google_auth_url) or failed to obtain
            a token from Google Identity Services / One Tap.
          - If Supabase verification itself fails, we raise the real error
            instead of silently falling back to a mock user.
        """
        if not self.client:
            # No Supabase configured -> local/dev fallback (unchanged).
            return {
                "user": {
                    "id": "google_user_999",
                    "email": "user.google@gmail.com",
                    "user_metadata": {"role": "user", "name": "Google User"}
                },
                "session": {"access_token": "mock_google_jwt_token"}
            }

        if not id_token or id_token.startswith("mock_"):
            raise Exception(
                "Google sign-in failed: no valid id_token was provided. "
                "This usually means the frontend is using the OAuth redirect "
                "flow (get_google_auth_url) instead of sending a real Google "
                "ID token, or Google Identity Services / One Tap did not "
                "return a token. Check the frontend Google login handler."
            )

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
            # Surface the real Supabase error instead of masking it with
            # a mock user - masking it is what made this bug hard to find.
            raise Exception(f"Google authentication failed: {str(e)}")

    def get_pending_admins(self) -> list:
        return [v for v in AuthenticationSystem.admin_approvals.values() if v.get("status") == "pending"]

    def get_all_admins(self) -> list:
        admins = list(AuthenticationSystem.admin_approvals.values())
        main_admin = {
            "email": "ravivish517@gmail.com",
            "name": "Super Admin",
            "status": "approved",
            "requested_at": "System Default"
        }
        if not any(a.get("email", "").lower() == main_admin["email"] for a in admins):
            admins.insert(0, main_admin)
        return admins

    def approve_admin(self, email: str) -> bool:
        email_key = email.lower()
        if email_key in AuthenticationSystem.admin_approvals:
            AuthenticationSystem.admin_approvals[email_key]["status"] = "approved"
            return True
        return False