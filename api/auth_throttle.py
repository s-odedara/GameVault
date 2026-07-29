"""
🔥 NAYA (Security — Rate Limiting): Login/Register ke liye exponential
backoff. Ye ek HARD LOCKOUT nahi hai — account kabhi permanently block
nahi hota. Har failed attempt ke baad wait time exponentially badhta hai
(base * 2^attempts, ek max cap tak), aur ek successful login turant
counter reset kar deta hai.

Do independent tracks maintain hote hain:
  - per-IP   (same IP se bahut saare accounts try karna rokta hai)
  - per-account (ek hi account par distributed/many-IP brute force rokta hai)
Dono mein se JO BHI pehle block ho, request reject ho jaati hai.

Saare thresholds settings.py se aate hain (jo khud .env se aate hain) —
yahan kahin bhi number hardcoded nahi hai.
"""
import time
from django.core.cache import cache
from django.conf import settings


def _cache_key(kind, ident):
    return f'auth_throttle:{kind}:{ident}'


def _tracks(ip, username):
    tracks = []
    if ip:
        tracks.append(('ip', ip))
    if username:
        tracks.append(('account', username.strip().lower()))
    return tracks


def seconds_until_unblocked(ip, username=None):
    """
    Agar IP ya account abhi blocked hai to bacha hua wait time (seconds)
    return karta hai. Blocked nahi hai to None.
    """
    now = time.time()
    max_wait = None
    for kind, ident in _tracks(ip, username):
        data = cache.get(_cache_key(kind, ident))
        if data and data.get('blocked_until', 0) > now:
            wait = int(data['blocked_until'] - now) + 1
            max_wait = max(max_wait or 0, wait)
    return max_wait


def record_failure(ip, username=None):
    """Failed login/register attempt ke baad call karo — backoff badhata hai."""
    now = time.time()
    for kind, ident in _tracks(ip, username):
        key = _cache_key(kind, ident)
        data = cache.get(key) or {'attempts': 0}
        attempts = min(data['attempts'] + 1, settings.AUTH_THROTTLE_MAX_TRACKED_ATTEMPTS)
        backoff = min(
            settings.AUTH_THROTTLE_BASE_SECONDS * (2 ** attempts),
            settings.AUTH_THROTTLE_MAX_SECONDS,
        )
        cache.set(
            key,
            {'attempts': attempts, 'blocked_until': now + backoff},
            timeout=settings.AUTH_THROTTLE_WINDOW_SECONDS,
        )


def record_success(ip, username=None):
    """Successful login ke baad call karo — dono counters clear ho jaate hain."""
    for kind, ident in _tracks(ip, username):
        cache.delete(_cache_key(kind, ident))


def get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')
