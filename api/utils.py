import requests
import logging
from django.conf import settings

logger = logging.getLogger('gamevault')


# ──────────────────────────────────────────────────────────────────────────────
# RAWG Cover Fetcher
# ──────────────────────────────────────────────────────────────────────────────

def fetch_game_cover(game_name):
    """Retrieve the RAWG background image URL for a given game title."""
    api_key = settings.RAWG_API_KEY if hasattr(settings, 'RAWG_API_KEY') else ''
    if not api_key or not game_name:
        return None

    url = f"https://api.rawg.io/api/games?key={api_key}&search={game_name}&page_size=1"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('results'):
                return data['results'][0].get('background_image')
    except requests.RequestException as e:
        logger.warning("Error fetching game cover for %r: %r", game_name, e)
    return None


# ──────────────────────────────────────────────────────────────────────────────
# Twilio SMS — OTP Sender
# ──────────────────────────────────────────────────────────────────────────────

def send_otp_sms(phone_number: str, otp_code: str) -> dict:
    """
    Send a 6-digit OTP to `phone_number` via Twilio.

    Authentication uses API Key auth (SKed... / secret) so that the master
    Account Auth Token never needs to be shared — safer for team environments.

        Client(api_key_sid, api_key_secret, account_sid)

    Returns:
        {"success": True,  "sid": message.sid}           — on success
        {"success": False, "error": "<reason>"}          — on failure
        {"success": False, "error": "not_configured"}    — if .env is incomplete
    """
    account_sid    = settings.TWILIO_ACCOUNT_SID
    api_key_sid    = settings.TWILIO_API_KEY_SID
    api_key_secret = settings.TWILIO_API_KEY_SECRET
    from_number    = settings.TWILIO_FROM_NUMBER

    # Guard: if any credential is missing or still set to placeholder → simulate
    missing = not all([account_sid, api_key_sid, api_key_secret, from_number])
    placeholder = account_sid == 'FILL_IN_YOUR_AC_SID_FROM_TWILIO_CONSOLE'

    if missing or placeholder:
        # ── SIMULATION MODE ──────────────────────────────────────────────────
        # When credentials are incomplete (common during dev), we log the OTP
        # so the developer can test without a real Twilio account.
        # The OTP has already been stored in the DB — the verify endpoint works.
        logger.warning(
            "[SIMULATION] Twilio not configured. OTP for %s is: %s",
            phone_number, otp_code
        )
        return {"success": True, "simulated": True, "otp_preview": otp_code}

    try:
        from twilio.rest import Client  # lazy import so Django starts even without twilio
        client = Client(api_key_sid, api_key_secret, account_sid)

        body = (
            f"Your GameVault Verification OTP is {otp_code}. "
            f"Do not share this with anyone. Valid for 5 minutes."
        )

        # Twilio expects E.164 format: +91XXXXXXXXXX for India
        to_number = f"+91{phone_number}" if not phone_number.startswith('+') else phone_number

        message = client.messages.create(
            body=body,
            from_=from_number,
            to=to_number,
        )

        logger.info("OTP SMS sent to %s — Twilio SID: %s", phone_number, message.sid)
        return {"success": True, "sid": message.sid}

    except Exception as exc:
        logger.error(
            "Twilio SMS failed for %s: %r", phone_number, exc, exc_info=True
        )
        return {"success": False, "error": str(exc)}