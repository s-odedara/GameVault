"""
🔥 NAYA (Security): Har API exception yahan se guzarta hai.

Pehle jab bhi koi unexpected error hota tha (DB crash, bug, third-party
API fail), agar DEBUG=True accidentally production mein reh jaata to
Django poora stack trace + file paths + SQL query client ko dikha deta.
Aur agar DEBUG=False bhi hota, kai views mein humne khud `str(e)` seedha
Response mein daal diya tha (e.g. Razorpay error), jo internal details
leak karta hai.

Ab: client ko HAMESHA ek generic message + chhota error_id milta hai.
Poori detail (asli exception, stack trace, request path) server ke
logs mein jaati hai — error_id se dono ko match kiya ja sakta hai.
"""
import logging
import uuid

from rest_framework.views import exception_handler as drf_default_exception_handler
from rest_framework.response import Response
from rest_framework import status as drf_status

logger = logging.getLogger('gamevault')


def custom_exception_handler(exc, context):
    error_id = uuid.uuid4().hex[:8]
    request = context.get('request')
    view = context.get('view')

    # Poori detail sirf server logs mein — kabhi client ko nahi
    logger.error(
        "error_id=%s view=%s path=%s user=%s exc=%r",
        error_id,
        view.__class__.__name__ if view else '?',
        getattr(request, 'path', '?'),
        getattr(getattr(request, 'user', None), 'id', 'anon'),
        exc,
        exc_info=True,
    )

    response = drf_default_exception_handler(exc, context)

    if response is not None:
        # DRF ne already handle kiya (ValidationError, NotFound, PermissionDenied,
        # Throttled, AuthenticationFailed, etc.) — ye messages already client-safe
        # hain (koi stack trace/file path nahi hoti), bas error_id add karte hain
        # taaki support/debug karte waqt reference ho sake.
        if isinstance(response.data, dict):
            response.data['error_id'] = error_id
        else:
            response.data = {'detail': response.data, 'error_id': error_id}
        return response

    # response None matlab ye ek TRUE unexpected error hai (DB crash, bug, etc.)
    # — DRF ise khud handle nahi karta, isliye hum khud generic 500 banate hain.
    # str(exc) YAHAN KABHI client ko nahi bhejte.
    return Response(
        {
            "error": "Something went wrong on our end. Please try again in a moment.",
            "error_id": error_id,
        },
        status=drf_status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
