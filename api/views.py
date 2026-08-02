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
from django.utils.crypto import get_random_string
import logging
import razorpay
import urllib.parse
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from . import auth_throttle
from .models import Game, Profile, Post, Comment, Follow, Listing, Order, RentalListing, CheckoutOTP, CachedRawgResponse
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
        return Response({"token": token.key, "user_id": user.id, "username": user.username, "is_staff": user.is_staff})

class GoogleLoginView(generics.GenericAPIView):
    """POST /api/auth/google/"""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request, *args, **kwargs):
        credential = request.data.get('credential')
        if not credential:
            return Response({"error": "No credential provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            idinfo = id_token.verify_oauth2_token(
                credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
            email = idinfo.get('email')
            if not email:
                return Response({"error": "Google token missing email"}, status=status.HTTP_400_BAD_REQUEST)

            # Generate proper username
            given_name = idinfo.get('given_name')
            name = idinfo.get('name')
            base_username = given_name if given_name else (name.split()[0] if name else email.split('@')[0])
            
            user = User.objects.filter(email=email).first()
            if not user:
                username = base_username.replace(' ', '')
                count = 1
                while User.objects.filter(username__iexact=username).exists():
                    username = f"{base_username.replace(' ', '')}{count}"
                    count += 1
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=get_random_string(32),
                    first_name=given_name or ''
                )
            else:
                if given_name and not user.first_name:
                    user.first_name = given_name
                    user.save(update_fields=['first_name'])

            token, _ = Token.objects.get_or_create(user=user)
            # Return actual name as actual_name
            actual_name = user.first_name if user.first_name else user.username
            return Response({"token": token.key, "user_id": user.id, "username": user.username, "actual_name": actual_name})
            
        except ValueError:
            return Response({"error": "Invalid token"}, status=status.HTTP_400_BAD_REQUEST)



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

        import random
        from decimal import Decimal
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

        # ── Escrow & Commission Logic ──
        base_amount = Decimal(str(order.amount))
        platform_fee = base_amount * Decimal('0.05')
        seller_earnings = base_amount - platform_fee

        order.platform_fee = platform_fee
        order.seller_earnings = seller_earnings
        order.handover_otp = str(random.randint(1000, 9999))
        order.razorpay_payment_id = razorpay_payment_id
        order.razorpay_signature  = razorpay_signature
        order.status = 'Escrowed'
        order.save()
        
        order.listing.status = 'Sold'
        order.listing.save(update_fields=['status'])

        return Response({"success": True, "message": "Payment verified & Escrowed! 🎉", "order_id": order.id})


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


from .models import RentalOrder
from .serializers import RentalOrderSerializer

class CreateRentalOrderView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, listing_id):
        listing = get_object_or_404(RentalListing, pk=listing_id, status='Available')
        if listing.owner_id == request.user.id:
            return Response({"error": "You cannot rent your own item!"}, status=status.HTTP_400_BAD_REQUEST)

        # Basic checkout details
        phone_number = request.data.get('phone_number')
        email = request.data.get('email')
        street_address = request.data.get('street_address')
        city = request.data.get('city')
        state = request.data.get('state')
        zip_code = request.data.get('zip_code')

        if not phone_number:
            return Response({"error": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)

        # ── RAZORPAY INTEGRATION FOR RENTALS ──
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            return Response(
                {"error": "Payment gateway not configured. Add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to .env."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # Total amount = Rental Charges + 599 (Security Deposit) as per requirement
        total_payable = listing.rental_charges + listing.security_deposit
        amount_paise = int(total_payable * 100)

        import razorpay
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            razorpay_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "payment_capture": 1,
            })
        except Exception as e:
            logger.error("Razorpay order creation failed for rental_listing=%s user=%s: %r", listing_id, request.user.id, e, exc_info=True)
            return Response({"error": "Payment gateway is temporarily unavailable."}, status=status.HTTP_502_BAD_GATEWAY)

        order = RentalOrder.objects.create(
            listing=listing,
            renter=request.user,
            owner=listing.owner,
            total_amount=total_payable,
            security_deposit=listing.security_deposit,
            phone_number=phone_number,
            email=email,
            street_address=street_address,
            city=city,
            state=state,
            zip_code=zip_code,
            status='Requested',
        )

        return Response({
            "success": True,
            "order_id": order.id,
            "razorpay_order_id": razorpay_order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": settings.RAZORPAY_KEY_ID,
            "listing_title": listing.title,
            "message": "Payment initiated! 🎉"
        }, status=status.HTTP_201_CREATED)

class VerifyRentalPaymentView(generics.GenericAPIView):
    """POST /api/rentals/verify-payment/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_order_id   = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature  = request.data.get('razorpay_signature')
        order_id = request.data.get('order_id')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id]):
            return Response({"error": "Missing payment details"}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(RentalOrder, pk=order_id, renter=request.user)

        if order.status == 'Escrowed':
            return Response({"success": True, "message": "Already verified.", "order_id": order.id})

        import razorpay
        import random
        from decimal import Decimal
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
            return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Escrow & Commission Logic ──
        # 5% commission based ONLY on base Rent price (exclude security deposit)
        base_rent = Decimal(str(order.total_amount)) - Decimal(str(order.security_deposit))
        platform_fee = base_rent * Decimal('0.05')
        seller_earnings = base_rent - platform_fee

        order.platform_fee = platform_fee
        order.seller_earnings = seller_earnings
        order.handover_otp = str(random.randint(1000, 9999))
        
        order.status = 'Escrowed'
        order.save()
        
        order.listing.status = 'Rented'
        order.listing.save(update_fields=['status'])

        return Response({"success": True, "message": "Rental Payment verified & Escrowed! 🎉", "order_id": order.id})


class UpdateRentalStatusView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, order_id):
        new_status = request.data.get('status')
        try:
            order = RentalOrder.objects.get(pk=order_id)
        except RentalOrder.DoesNotExist:
            return Response({"error": "Rental order not found."}, status=status.HTTP_404_NOT_FOUND)

        is_owner = order.owner_id == request.user.id
        is_renter = order.renter_id == request.user.id

        if not is_owner and not is_renter:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        valid_transitions = {
            'owner': {
                'Requested': 'Handed Over',
                'Return Initiated': 'Returned & Verified'
            },
            'renter': {
                'Handed Over': 'In Use',
                'In Use': 'Return Initiated'
            }
        }

        role = 'owner' if is_owner else 'renter'
        allowed_next = valid_transitions[role].get(order.status)

        if new_status != allowed_next:
            return Response(
                {"error": f"Cannot transition from '{order.status}' to '{new_status}' as {role}."},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = new_status
        order.save(update_fields=['status'])
        
        # Free up the listing if it's completely returned
        if new_status == 'Returned & Verified':
            order.listing.status = 'Available'
            order.listing.save(update_fields=['status'])

        return Response(RentalOrderSerializer(order, context={'request': request}).data)


class MyRentalsView(generics.ListAPIView):
    serializer_class = RentalOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RentalOrder.objects.filter(renter=self.request.user).order_by('-created_at')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class MyLentItemsView(generics.ListAPIView):
    serializer_class = RentalOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RentalOrder.objects.filter(owner=self.request.user).order_by('-created_at')

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

        # Generate a deterministic cache key string from the parameters
        # Sorting ensures the same parameters in different order map to the same key
        query_params_str = urllib.parse.urlencode(sorted(params.items()))

        params['key'] = settings.RAWG_API_KEY

        try:
            resp = http_requests.get(f'https://api.rawg.io/api/{endpoint}', params=params, timeout=8)
            resp.raise_for_status() # Will trigger RequestException on 4xx/5xx
            data = resp.json()
            
            # Save the successful response to our local fallback cache
            CachedRawgResponse.objects.update_or_create(
                endpoint=endpoint,
                query_params=query_params_str,
                defaults={'data': data}
            )
            return Response(data, status=status.HTTP_200_OK)

        except (http_requests.RequestException, ValueError) as e:
            logger.error("RAWG proxy request failed for endpoint=%s: %r", endpoint, e, exc_info=True)
            
            # ── FALLBACK LOGIC ──
            # First, try to find an exact match for the endpoint and parameters
            try:
                cached = CachedRawgResponse.objects.get(endpoint=endpoint, query_params=query_params_str)
                logger.info("Serving exact fallback cache for %s ? %s", endpoint, query_params_str)
                return Response(cached.data, status=status.HTTP_200_OK)
            except CachedRawgResponse.DoesNotExist:
                # If exact match fails, try to return ANY cached data for that endpoint (better than a blank screen)
                cached_any = CachedRawgResponse.objects.filter(endpoint=endpoint).order_by('-updated_at').first()
                if cached_any:
                    logger.info("Serving generalized fallback cache for %s", endpoint)
                    return Response(cached_any.data, status=status.HTTP_200_OK)
                
                # Absolute failure
                return Response({"error": "Couldn't reach the game database and no offline data available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


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
                    'q': 'video games OR gaming OR PlayStation OR Xbox OR Nintendo OR GTA',
                    'domains': 'ign.com,polygon.com,gamespot.com,pcgamer.com,kotaku.com,gameinformer.com,nintendolife.com,pushsquare.com,destructoid.com',
                    'language': 'en',
                    'sortBy': 'popularity',
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

class VerifyHandoverOTPView(generics.GenericAPIView):
    """POST /api/marketplace/verify-handover/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('order_id')
        order_type = request.data.get('order_type') # 'sale' or 'rent'
        otp = request.data.get('otp')

        if not all([order_id, order_type, otp]):
            return Response({"error": "Missing required fields."}, status=status.HTTP_400_BAD_REQUEST)

        if order_type == 'sale':
            order = get_object_or_404(Order, pk=order_id, seller=request.user)
            if order.status != 'Escrowed':
                return Response({"error": f"Invalid order status for handover: {order.status}"}, status=status.HTTP_400_BAD_REQUEST)
            if order.handover_otp != otp:
                return Response({"error": "Invalid OTP. Handover failed."}, status=status.HTTP_400_BAD_REQUEST)
            
            order.status = 'Delivered'
            order.save(update_fields=['status'])
            return Response({"success": True, "message": "Handover successful! Order is now Delivered."})
            
        elif order_type == 'rent':
            order = get_object_or_404(RentalOrder, pk=order_id, owner=request.user)
            if order.status != 'Escrowed':
                return Response({"error": f"Invalid rental status for handover: {order.status}"}, status=status.HTTP_400_BAD_REQUEST)
            if order.handover_otp != otp:
                return Response({"error": "Invalid OTP. Handover failed."}, status=status.HTTP_400_BAD_REQUEST)
            
            order.status = 'In Use'
            order.save(update_fields=['status'])
            return Response({"success": True, "message": "Handover successful! Item is now In Use."})
        else:
            return Response({"error": "Invalid order type."}, status=status.HTTP_400_BAD_REQUEST)
