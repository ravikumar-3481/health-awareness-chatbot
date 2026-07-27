import uuid
from datetime import datetime
from supabase import create_client
from api.config import Config
from utils.logger import Logger

config = Config()


class BookingSystem:
    """
    Confidential Counselor & Helpline Booking Management System.
    Handles booking slots, anonymous patient inquiries, counselor availability,
    and status updates via Supabase DB.
    """
    def __init__(self):
        self.logger = Logger()
        self.log = self.logger.get_logger()
        try:
            self.client = create_client(config.get_supabase_url(), config.get_supabase_key())
        except Exception as e:
            self.client = None
            self.log.warning(f"BookingSystem Supabase client initialization warning: {e}")

    def create_booking(self, alias_name: str, contact_info: str, counselor_type: str, preferred_date: str, preferred_time: str, notes: str = "") -> dict:
        """
        Creates a confidential booking for a counseling or helpline session.
        Uses an anonymous alias to preserve confidentiality.
        """
        booking_code = f"HLP-{uuid.uuid4().hex[:6].upper()}"
        
        booking_data = {
            "booking_code": booking_code,
            "alias_name": alias_name or "Anonymous Patient",
            "contact_info": contact_info,
            "counselor_type": counselor_type or "General Health Counselor",
            "preferred_date": preferred_date,
            "preferred_time": preferred_time,
            "notes": notes,
            "status": "confirmed",
            "created_at": datetime.utcnow().isoformat()
        }

        if self.client:
            try:
                result = self.client.table("counselor_bookings").insert(booking_data).execute()
                if result.data:
                    self.log.info(f"Created confidential booking: {booking_code}")
                    return result.data[0]
            except Exception as e:
                self.log.error(f"Supabase insertion failed for booking {booking_code}: {e}")

        # Fallback return when DB table doesn't exist or client offline
        return booking_data

    def get_all_bookings(self) -> list:
        """Retrieves all counselor bookings for the Admin Dashboard."""
        if self.client:
            try:
                result = self.client.table("counselor_bookings").select("*").order("created_at", desc=True).execute()
                return result.data
            except Exception as e:
                self.log.error(f"Failed to fetch bookings: {e}")
                return []
        return []

    def update_booking_status(self, booking_code: str, status: str) -> dict:
        """Updates status of a booking (confirmed, completed, cancelled)."""
        if self.client:
            try:
                result = self.client.table("counselor_bookings").update({"status": status}).eq("booking_code", booking_code).execute()
                if result.data:
                    return result.data[0]
            except Exception as e:
                self.log.error(f"Failed to update booking status {booking_code}: {e}")
        return {"booking_code": booking_code, "status": status}

    def delete_booking(self, booking_code: str) -> bool:
        """Deletes a booking record."""
        if self.client:
            try:
                result = self.client.table("counselor_bookings").delete().eq("booking_code", booking_code).execute()
                return bool(result.data)
            except Exception as e:
                self.log.error(f"Failed to delete booking {booking_code}: {e}")
                return False
        return True
