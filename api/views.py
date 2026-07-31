from rest_framework import viewsets, generics, status
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.conf import settings
import logging
import razorpay

from . import auth_throttle
from .models import Game, Profile, Post, Comment, Follow, Listing, Order, RentalListing, CheckoutOTP
from .serializers import (
    GameSerializer, ProfileSerializer, PostSerializer, CommentSerializer,
    RegisterSerializer, ListingSerializer, OrderSerializer, CheckoutFormSerializer,
    RentalListingSerializer,
)
from .permissions import IsOwnerOrReadOnly, IsSellerOrReadOnly
from .utils import send_otp_sms

logger = logging.getLogger('gamevault')


class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Game.objects.filter(user=user).order_by('-added_at')
        return Game.objects.none()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly])
    def toggle_wishlist(self, request, pk=None):
        game = self.get_object()
        game.is_wishlisted = not game.is_wishlisted
        game.save(update_fields=['is_wishlisted'])
        return Response(GameSerializer(game).data)


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        qs = Post.objects.all()
        sort = self.request.query_params.get('sort', 'new')
        if sort == 'top':
            qs = qs.order_by('-upvotes', '-created_at')
        else:
            qs = qs.order_by('-created_at')
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all().order_by('created_at')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class RegisterView(generics.CreateAPIView):
    """POST /api/register/"""
    queryset = Token.objects.none()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_scope = 'auth'

    def create(self, request, *args, **kwargs):
        ip = auth_throttle.get_client_ip(request)
        wait = auth_throttle.seconds_until_unblocked(ip)
        if wait:
            return Response(
                {"error": f"Too many attempts. Please try again in {wait} seconds."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={'Retry-After': str(wait)},
            )

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            auth_throttle.record_failure(ip)
            raise ValidationError(serializer.errors)

        user = serializer.save()
        auth_throttle.record_success(ip)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user_id": user.id, "username": user.username},
            status=status.HTTP_201_CREATED,
        )


class LoginView(ObtainAuthToken):
    """POST /api/login/"""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        username = request.data.get('username', '')
        password = request.data.get('password', '')

        if not isinstance(username, str) or not isinstance(password, str):
            return Response({"error": "Invalid request format."}, status=status.HTTP_400_BAD_REQUEST)

        username = username.strip()
        if not username or not password:
            return Response({"error": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        if len(username) > 150 or len(password) > 256:
            return Response({"error": "Invalid request format."}, status=status.HTTP_400_BAD_REQUEST)

        ip = auth_throttle.get_client_ip(request)
        wait = auth_throttle.seconds_until_unblocked(ip, username)
        if wait:
            return Response(
                {"error": f"Too many failed attempts. Please try again in {wait} seconds."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={'Retry-After': str(wait)},
            )

        user = authenticate(request, username=username, password=password)

        if user is None:
            auth_throttle.record_failure(ip, username)
            return Response({"error": "Invalid username or password"}, status=status.HTTP_400_BAD_REQUEST)

        auth_throttle.record_success(ip, username)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user_id": user.id, "username": user.username})


class FollowViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def list(self, request):
        if not request.user.is_authenticated:
            return Response([])
        follows = Follow.objects.filter(follower=request.user).select_related('following')
        return Response([
            {'id': f.following.id, 'username': f.following.username} for f in follows
        ])

    @action(detail=True, methods=['post'], url_path='toggle', permission_classes=[IsAuthenticated])
    def toggle(self, request, pk=None):
        target = get_object_or_404(User, pk=pk)
        if target.id == request.user.id:
            return Response({"error": "You can't follow yourself"}, status=status.HTTP_400_BAD_REQUEST)

        existing = Follow.objects.filter(follower=request.user, following=target)
        if existing.exists():
            existing.delete()
            is_following = False
        else:
            Follow.objects.create(follower=request.user, following=target)
            is_following = True

        followers_count = Follow.objects.filter(following=target).count()
        return Response({
            "following": is_following,
            "user_id": target.id,
            "username": target.username,
            "followers_count": followers_count,
        })


# ── Community: Upvote Post ────────────────────────────────────────────────────
class UpvotePostView(generics.GenericAPIView):
    """POST /api/posts/<id>/upvote/  — toggle upvote (add once per user via session flag)"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        # Simple increment — for full per-user tracking, add a PostUpvote junction table
        post.upvotes = post.upvotes + 1
        post.save(update_fields=['upvotes'])
        return Response({"upvotes": post.upvotes})


# ======================================================================
# MARKETPLACE VIEWS — P2P Physical Game Trading
# ======================================================================

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.all()
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsSellerOrReadOnly]

    def get_queryset(self):
        if self.request.query_params.get('mine') == 'true':
            if not self.request.user.is_authenticated:
                return Listing.objects.none()
            return Listing.objects.filter(seller=self.request.user).order_by('-created_at')
        return Listing.objects.filter(status='Active').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(seller=self.request.user)

    def perform_destroy(self, instance):
        instance.status = 'Removed'
        instance.save(update_fields=['status'])


# ── RENTAL LISTING ─────────────────────────────────────────────────────────────
class RentalListingViewSet(viewsets.ModelViewSet):
    """
    CRUD for RentalListing.
    GET  /api/rentals/          — all available rentals (public)
    POST /api/rentals/          — create a new rental listing (auth required)
    GET  /api/rentals/<id>/     — listing detail
    """
    queryset = RentalListing.objects.all()
    serializer_class = RentalListingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsSellerOrReadOnly]

    def get_queryset(self):
        if self.request.query_params.get('mine') == 'true':
            if not self.request.user.is_authenticated:
                return RentalListing.objects.none()
            return RentalListing.objects.filter(owner=self.request.user).order_by('-created_at')
        return RentalListing.objects.filter(status='Available').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


# ── OTP VIEWS ─────────────────────────────────────────────────────────────────

class SendOTPView(generics.GenericAPIView):
    """
    POST /api/marketplace/send-otp/
    Body: { "phone_number": "9876543210" }

    Flow:
    1. Validate: exactly 10 digits.
    2. Generate 6-digit OTP, store in CheckoutOTP (5-min expiry, old ones deleted).
    3. Call send_otp_sms() → real Twilio SMS if credentials are configured,
       simulation (logs OTP to console) otherwise.
    4. Return { "sent": true } — OTP is NEVER returned to the frontend (security).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone = request.data.get('phone_number', '').strip()

        # Validate: exactly 10 digits
        import re
        if not re.match(r'^\d{10}$', phone):
            return Response(
                {"error": "Mobile number must be exactly 10 digits (no spaces, dashes, or country code)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate and persist OTP
        otp_obj = CheckoutOTP.generate_for(phone)

        # Send via Twilio (or log in simulation mode)
        result = send_otp_sms(phone, otp_obj.otp_code)

        if not result.get('success'):
            # Clean up unused OTP if SMS failed
            otp_obj.delete()
            return Response(
                {"error": f"Could not send OTP. Please try again. ({result.get('error', 'Unknown error')})"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_data = {"sent": True}
        # In simulation mode, include a dev-only hint (remove in production)
        if result.get('simulated'):
            response_data["dev_note"] = (
                "Twilio is not yet configured. The OTP has been printed to the Django console log. "
                "Fill in TWILIO_ACCOUNT_SID in .env to enable real SMS."
            )
            response_data["simulated_otp"] = result.get("otp_preview")   # REMOVE in prod

        return Response(response_data, status=status.HTTP_200_OK)


class VerifyOTPView(generics.GenericAPIView):
    """
    POST /api/marketplace/verify-otp/
    Body: { "phone_number": "9876543210", "otp_code": "123456" }

    Checks:
    - OTP exists for this phone
    - OTP is not yet used (replay protection)
    - OTP is not expired (5-min window)
    - OTP code matches exactly

    On success: marks OTP as used, returns { "verified": true }.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone    = request.data.get('phone_number', '').strip()
        otp_code = request.data.get('otp_code', '').strip()

        import re
        if not re.match(r'^\d{10}$', phone):
            return Response({"error": "Invalid phone number."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.match(r'^\d{6}$', otp_code):
            return Response({"error": "OTP must be 6 digits."}, status=status.HTTP_400_BAD_REQUEST)

        # Find the latest unused OTP for this phone
        try:
            otp_obj = CheckoutOTP.objects.filter(
                phone_number=phone,
                is_used=False,
            ).latest('created_at')
        except CheckoutOTP.DoesNotExist:
            return Response(
                {"error": "No OTP found for this number. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Expiry check
        if otp_obj.is_expired():
            return Response(
                {"error": "OTP has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Code match check
        if otp_obj.otp_code != otp_code:
            return Response(
                {"error": "Invalid OTP. Please check the SMS and try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Mark consumed — prevents replay attacks
        otp_obj.is_used = True
        otp_obj.save(update_fields=['is_used'])

        logger.info("OTP verified for phone=%s", phone)
        return Response({"verified": True}, status=status.HTTP_200_OK)


class CreateCheckoutOrderView(generics.GenericAPIView):
    """
    POST /api/marketplace/checkout/<listing_id>/

    ── UPDATED FLOW (with OTP gate) ──────────────────────────────────────────
    The frontend CheckoutModal now enforces OTP verification in Step 2 before
    the user can reach Step 3 (Shipping). By the time this endpoint is called,
    the OTP has already been verified on the frontend side.

    This view accepts both payment methods:
    - payment_method=COD       → Order immediately COD_Confirmed
    - payment_method=Razorpay  → Razorpay order intent created
    """
    permission_classes = [IsAuthenticated]
    throttle_scope = 'payment'

    def post(self, request, listing_id):
        listing = get_object_or_404(Listing, pk=listing_id, status='Active')

        if listing.seller_id == request.user.id:
            return Response({"error": "You can't buy your own listing!"}, status=status.HTTP_400_BAD_REQUEST)

        form = CheckoutFormSerializer(data=request.data)
        if not form.is_valid():
            return Response(form.errors, status=status.HTTP_400_BAD_REQUEST)

        cd = form.validated_data
        payment_method = cd['payment_method']

        # ─── COD FLOW ────────────────────────────────────────────────
        if payment_method == 'COD':
            order = Order.objects.create(
                listing=listing,
                buyer=request.user,
                seller=listing.seller,
                amount=listing.price,
                payment_method='COD',
                phone_number=cd.get('phone_number'),
                email=cd.get('email'),
                street_address=cd.get('street_address'),
                city=cd.get('city'),
                state=cd.get('state'),
                zip_code=cd.get('zip_code'),
                gov_id_number=cd.get('gov_id_number', ''),
                gov_id_doc=cd.get('gov_id_doc'),
                status='COD_Confirmed',
            )
            listing.status = 'Sold'
            listing.save(update_fields=['status'])

            return Response({
                "success": True,
                "payment_method": "COD",
                "order_db_id": order.id,
                "message": "Order confirmed! Pay cash on delivery. 🚚"
            }, status=status.HTTP_201_CREATED)

        # ─── RAZORPAY FLOW ────────────────────────────────────────────
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            return Response(
                {"error": "Payment gateway not configured. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to .env."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        amount_paise = int(listing.price * 100)

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
            })
        except Exception as e:
            logger.error("Razorpay order creation failed for listing=%s user=%s: %r", listing_id, request.user.id, e, exc_info=True)
            return Response({"error": "Payment gateway is temporarily unavailable. Please try again shortly."}, status=status.HTTP_502_BAD_GATEWAY)

        order = Order.objects.create(
            listing=listing,
            buyer=request.user,
            seller=listing.seller,
            amount=listing.price,
            payment_method='Razorpay',
            razorpay_order_id=razorpay_order['id'],
            phone_number=cd.get('phone_number'),
            email=cd.get('email'),
            street_address=cd.get('street_address'),
            city=cd.get('city'),
            state=cd.get('state'),
            zip_code=cd.get('zip_code'),
            gov_id_number=cd.get('gov_id_number', ''),
            gov_id_doc=cd.get('gov_id_doc'),
            status='Pending',
        )

        return Response({
            "payment_method": "Razorpay",
            "order_db_id": order.id,
            "razorpay_order_id": razorpay_order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "listing_title": listing.title,
        })


class VerifyPaymentView(generics.GenericAPIView):
    """POST /api/marketplace/verify-payment/ — HMAC signature verification"""
    permission_classes = [IsAuthenticated]
    throttle_scope = 'payment'

    def post(self, request):
        razorpay_order_id   = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature  = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response({"error": "Missing payment details"}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, razorpay_order_id=razorpay_order_id, buyer=request.user)

        if order.status == 'Paid':
            return Response({"success": True, "message": "Already verified.", "order_id": order.id})

        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            client.utility.verify_payment_signature({
                'razorpay_order_id': razorpay_order_id,
                'razorpay_payment_id': razorpay_payment_id,
                'razorpay_signature': razorpay_signature,
            })
        except razorpay.errors.SignatureVerificationError:
            order.status = 'Cancelled'
            order.save(update_fields=['status'])
            return Response({"error": "Payment verification failed — signature mismatch."}, status=status.HTTP_400_BAD_REQUEST)

        order.razorpay_payment_id = razorpay_payment_id
        order.razorpay_signature  = razorpay_signature
        order.status = 'Paid'
        order.save()
        order.listing.status = 'Sold'
        order.listing.save(update_fields=['status'])

        return Response({"success": True, "message": "Payment verified! 🎉", "order_id": order.id})


class UpdateOrderStatusView(generics.GenericAPIView):
    """PATCH /api/marketplace/orders/<order_id>/update-status/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_id):
        new_status     = request.data.get('status')
        tracking_number = request.data.get('tracking_number', '')

        valid_transitions = {
            'seller': {'Paid': 'Shipped', 'COD_Confirmed': 'Shipped'},
            'buyer':  {'Shipped': 'Delivered'},
        }

        try:
            order = Order.objects.get(pk=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        is_seller = order.seller_id == request.user.id
        is_buyer  = order.buyer_id  == request.user.id

        if not is_seller and not is_buyer:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        role         = 'seller' if is_seller else 'buyer'
        allowed_next = valid_transitions[role].get(order.status)

        if new_status != allowed_next:
            return Response(
                {"error": f"Cannot transition from '{order.status}' to '{new_status}' as {role}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = new_status
        if tracking_number:
            order.tracking_number = tracking_number
        order.save()

        return Response(OrderSerializer(order).data)


class MyOrdersView(generics.ListAPIView):
    """GET /api/marketplace/my-orders/"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(buyer=self.request.user).order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class MySalesView(generics.ListAPIView):
    """GET /api/marketplace/my-sales/"""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(seller=self.request.user).order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ======================================================================
# RAWG API PROXY — key never exposed to frontend
# ======================================================================
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
import requests as http_requests

RAWG_ALLOWED_RESOURCES = ('games', 'platforms', 'stores', 'genres', 'publishers', 'developers', 'tags')


class RawgProxyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'anon'

    def get(self, request, endpoint):
        first_segment = endpoint.strip('/').split('/')[0]
        if first_segment not in RAWG_ALLOWED_RESOURCES:
            return Response({"error": "Invalid endpoint"}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.RAWG_API_KEY:
            return Response({"error": "Game database is not configured. Add RAWG_API_KEY to your .env."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        params = request.query_params.dict()
        params.pop('key', None)
        params['key'] = settings.RAWG_API_KEY

        try:
            resp = http_requests.get(f'https://api.rawg.io/api/{endpoint}', params=params, timeout=8)
        except http_requests.RequestException as e:
            logger.error("RAWG proxy request failed for endpoint=%s: %r", endpoint, e, exc_info=True)
            return Response({"error": "Couldn't reach the game database right now. Please try again."}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            data = resp.json()
        except ValueError:
            data = {"error": "Unexpected response from game database."}

        return Response(data, status=resp.status_code)


# ======================================================================
# GAMING NEWS — NewsAPI Proxy (key never exposed to frontend)
# ======================================================================

class GamingNewsView(APIView):
    """
    GET /api/gaming-news/
    Fetches top gaming/video-game headlines from NewsAPI.
    The NEWS_API_KEY is read from .env — never sent to the frontend.
    Returns up to 15 articles with title, description, url, image, source, publishedAt.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'anon'

    def get(self, request):
        api_key = settings.NEWS_API_KEY
        if not api_key:
            return Response(
                {"error": "News service is not configured. Add NEWS_API_KEY to your .env."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            resp = http_requests.get(
                'https://newsapi.org/v2/everything',
                params={
                    'q': 'video games OR gaming OR PlayStation OR Xbox OR Nintendo OR GTA OR esports',
                    'language': 'en',
                    'sortBy': 'publishedAt',
                    'pageSize': 15,
                    'apiKey': api_key,
                },
                timeout=10,
            )
            data = resp.json()
        except http_requests.RequestException as e:
            logger.error("NewsAPI request failed: %r", e, exc_info=True)
            return Response(
                {"error": "Couldn't fetch gaming news right now. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if data.get('status') != 'ok':
            return Response(
                {"error": data.get('message', 'NewsAPI returned an error.')},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Return a clean, frontend-friendly list
        articles = []
        for a in data.get('articles', []):
            articles.append({
                'title': a.get('title', ''),
                'description': a.get('description', ''),
                'url': a.get('url', ''),
                'image': a.get('urlToImage', ''),
                'source': a.get('source', {}).get('name', ''),
                'published_at': a.get('publishedAt', ''),
            })

        return Response({"articles": articles}, status=status.HTTP_200_OK)
