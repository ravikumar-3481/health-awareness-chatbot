from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(
    title="Health Awareness Chatbot API",
    description="Backend service powered by FastAPI and Uvicorn for Health Awareness Chatbot",
    version="1.0.0",
)

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend static files directory
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


class ChatRequest(BaseModel):
    question: str = Field(..., example="What are the common symptoms of diabetes?")
    top_k: Optional[int] = Field(default=3, ge=1, le=10, example=3)


class ChatResponse(BaseModel):
    answer: str
    sources: List[str]


class AddUrlRequest(BaseModel):
    url: str = Field(..., example="https://example.com/health")
    category: Optional[str] = Field(default="", example="Medical")
    notes: Optional[str] = Field(default="", example="General guidance")


# Initialize RAG Pipeline lazily
try:
    from rag_pipeline.rag import RAGPipeline
    rag_pipeline = RAGPipeline()
except Exception as e:
    rag_pipeline = None
    print(f"Warning: RAG Pipeline initialization failed: {e}")


# Initialize Admin Panel lazily
try:
    from admin.admin import AdminPanel
    admin_panel = AdminPanel()
except Exception as e:
    admin_panel = None
    print(f"Warning: AdminPanel initialization failed: {e}")


@app.get("/", tags=["Frontend"])
def root():
    index_file = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "status": "online",
        "message": "Welcome to Health Awareness Chatbot API",
        "docs_url": "/docs",
    }



@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "healthy": True,
        "rag_pipeline_loaded": rag_pipeline is not None,
        "admin_panel_loaded": admin_panel is not None,
    }


@app.post("/api/chat", response_model=ChatResponse, tags=["Chat"])
def chat(request: ChatRequest):
    if not rag_pipeline:
        raise HTTPException(
            status_code=503,
            detail="RAG Pipeline is not initialized properly on the server."
        )

    try:
        result = rag_pipeline.answer(request.question, top_k=request.top_k)
        return ChatResponse(
            answer=result.get("answer", ""),
            sources=result.get("sources", [])
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred while processing your request: {str(e)}"
        )


# ==========================================
# Admin Routes
# ==========================================

def get_admin_panel():
    if not admin_panel:
        raise HTTPException(
            status_code=503,
            detail="Admin Panel is not initialized properly on the server."
        )
    return admin_panel


@app.get("/api/admin/urls", tags=["Admin"])
def get_all_urls():
    ap = get_admin_panel()
    try:
        return {"urls": ap.get_all_urls()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/urls", tags=["Admin"])
def add_url(request: AddUrlRequest):
    ap = get_admin_panel()
    try:
        res = ap.add_url(url=request.url, category=request.category, notes=request.notes)
        return {"message": "URL added successfully", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/add-data", tags=["Admin"])
def add_and_process_url(request: AddUrlRequest):
    ap = get_admin_panel()
    try:
        res = ap.add_data(url=request.url, category=request.category, notes=request.notes)
        return {"message": "URL added and processed successfully", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/admin/scrape", tags=["Admin"])
def scrape_url(url: str):
    ap = get_admin_panel()
    try:
        res = ap.scrape_and_process(url=url)
        if not res:
            raise HTTPException(status_code=400, detail="Failed to scrape and process URL.")
        return {"message": "URL scraped and processed", "data": res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/admin/urls", tags=["Admin"])
def delete_url(url: str):
    ap = get_admin_panel()
    try:
        success = ap.delete_url(url=url)
        if not success:
            raise HTTPException(status_code=404, detail="URL not found for deletion.")
        return {"message": "URL deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class BookingRequest(BaseModel):
    alias_name: str = Field(..., example="Patient Anonymous")
    contact_info: str = Field(..., example="patient@example.com")
    counselor_type: str = Field(..., example="Mental Health Specialist")
    preferred_date: str = Field(..., example="2026-08-01")
    preferred_time: str = Field(..., example="14:00")
    notes: Optional[str] = Field(default="", example="Need urgent confidential consultation")


try:
    from features.booking import BookingSystem
    booking_system = BookingSystem()
except Exception as e:
    booking_system = None
    print(f"Warning: BookingSystem initialization warning: {e}")


@app.get("/api/admin/preview", tags=["Admin"])
def preview_url_text(url: str, max_chars: int = 1000):
    ap = get_admin_panel()
    try:
        text = ap.preview_text(url=url, max_chars=max_chars)
        if text is None:
            raise HTTPException(status_code=404, detail="URL entry not found.")
        return {"url": url, "preview": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/bookings", tags=["Bookings"])
def create_booking(request: BookingRequest):
    try:
        res = booking_system.create_booking(
            alias_name=request.alias_name,
            contact_info=request.contact_info,
            counselor_type=request.counselor_type,
            preferred_date=request.preferred_date,
            preferred_time=request.preferred_time,
            notes=request.notes or ""
        )
        return {"message": "Booking created successfully", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/admin/bookings", tags=["Admin Bookings"])
def get_all_bookings():
    try:
        bookings = booking_system.get_all_bookings()
        return {"bookings": bookings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/admin/bookings/{booking_code}/status", tags=["Admin Bookings"])
def update_booking_status(booking_code: str, status: str):
    try:
        res = booking_system.update_booking_status(booking_code=booking_code, status=status)
        return {"message": "Booking status updated", "data": res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


try:
    from features.authentication import AuthenticationSystem, AuthRequest, GoogleAuthRequest
    auth_system = AuthenticationSystem()
except Exception as e:
    auth_system = None
    print(f"Warning: AuthenticationSystem initialization warning: {e}")



@app.post("/api/auth/signup", tags=["Auth"])
def auth_signup(request: AuthRequest):
    if not auth_system:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    try:
        res = auth_system.sign_up(email=request.email, password=request.password, role=request.role or "user", name=request.name or "")
        return {"message": "User registered successfully", "data": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/auth/login", tags=["Auth"])
def auth_login(request: AuthRequest):
    if not auth_system:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    try:
        res = auth_system.sign_in(email=request.email, password=request.password)
        return {"message": "Sign in successful", "data": res}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/auth/google/url", tags=["Auth"])
def get_google_auth_url(redirect_to: Optional[str] = None):
    if not auth_system:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    return auth_system.get_google_auth_url(redirect_to=redirect_to or "")


@app.post("/api/auth/google", tags=["Auth"])
def google_sign_in(request: GoogleAuthRequest):
    if not auth_system:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    try:
        res = auth_system.google_sign_in(id_token=request.id_token or "")
        return {"message": "Google sign in successful", "data": res}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@app.get("/api/admin/pending-approvals", tags=["Admin Auth"])
def get_pending_admin_approvals():
    if not auth_system:
        return {"pending_admins": []}
    return {"pending_admins": auth_system.get_pending_admins()}


@app.get("/api/admin/all-admins", tags=["Admin Auth"])
def get_all_admins():
    if not auth_system:
        return {"admins": []}
    return {"admins": auth_system.get_all_admins()}


@app.post("/api/admin/approve-admin", tags=["Admin Auth"])
def approve_admin_request(email: str):
    if not auth_system:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
    success = auth_system.approve_admin(email=email)
    if not success:
        raise HTTPException(status_code=440, detail="Admin request not found")
    return {"message": "Admin user approved successfully", "email": email}


@app.delete("/api/admin/bookings/{booking_code}", tags=["Admin Bookings"])
def delete_booking(booking_code: str):
    try:
        success = booking_system.delete_booking(booking_code=booking_code)
        return {"message": "Booking deleted successfully", "success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("app:app", host=host, port=port, reload=True)
