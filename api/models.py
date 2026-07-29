from django.db import models
from django.contrib.auth.models import User
from .validators import validate_image_file

class Game(models.Model):
    STATUS_CHOICES = [
        ('Playing', 'Playing'),
        ('Completed', 'Completed'),
        ('Plan to Play', 'Plan to Play'),
        ('Dropped', 'Dropped'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    title = models.CharField(max_length=100)
    genre = models.CharField(max_length=50)
    platform = models.CharField(max_length=255)
    release_date = models.DateField()
    rating = models.DecimalField(max_digits=4, decimal_places=2)

    image = models.ImageField(upload_to='game_images/', null=True, blank=True, validators=[validate_image_file])
    image_url = models.URLField(max_length=500, blank=True, null=True)

    # FIX Bug #3: exact RAWG ID stored at add-time → eliminates description mix-up
    rawg_game_id = models.IntegerField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Plan to Play')
    notes = models.TextField(blank=True, null=True)
    is_wishlisted = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True, null=True)

    def __str__(self):
        return self.title


class Follow(models.Model):
    follower = models.ForeignKey(User, related_name='following_set', on_delete=models.CASCADE)
    following = models.ForeignKey(User, related_name='followers_set', on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower} follows {self.following}"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True, null=True)
    favourite_genres = models.CharField(max_length=200, blank=True, null=True)
    gamer_tag = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    content = models.TextField()
    # ── NEW: Reddit-style upvote counter + tag ──────────────
    upvotes = models.IntegerField(default=0)
    tags = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on {self.post.title}"


# ======================================================================
# MARKETPLACE — P2P Physical Game Trading
# ======================================================================

class Listing(models.Model):
    CATEGORY_CHOICES = [
        ('Physical Game', 'Physical Game'),
        ('Console', 'Console'),
        ('Controller/Peripheral', 'Controller / Peripheral'),
        ('Merchandise', 'Merchandise'),
        ('Collectible', 'Collectible'),
        ('Other', 'Other'),
    ]
    CONDITION_CHOICES = [
        ('New', 'New — sealed/unused'),
        ('Like New', 'Like New — barely used'),
        ('Good', 'Good — normal wear'),
        ('Fair', 'Fair — visible wear, fully working'),
    ]
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Sold', 'Sold'),
        ('Removed', 'Removed'),
    ]

    seller = models.ForeignKey(User, related_name='listings', on_delete=models.CASCADE)
    title = models.CharField(max_length=150)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='Other')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='Good')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=100, blank=True, null=True)
    # ── PART 4.1: Photo and seller_contact are now REQUIRED (no null/blank) ──
    image = models.ImageField(upload_to='marketplace_images/', validators=[validate_image_file])
    seller_contact = models.CharField(max_length=10)   # exactly 10-digit mobile
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} (₹{self.price}) by {self.seller.username}"


# ── PART 4.2: Rental Listing ──────────────────────────────────────────────────
class RentalListing(models.Model):
    RENTAL_PERIOD_CHOICES = [
        (7,  '7 Days'),
        (14, '14 Days'),
        (30, '30 Days'),
    ]
    CONDITION_CHOICES = [
        ('New', 'New — sealed/unused'),
        ('Like New', 'Like New — barely used'),
        ('Good', 'Good — normal wear'),
        ('Fair', 'Fair — visible wear, fully working'),
    ]
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Rented', 'Rented'),
        ('Removed', 'Removed'),
    ]

    owner = models.ForeignKey(User, related_name='rental_listings', on_delete=models.CASCADE)
    title = models.CharField(max_length=150)
    description = models.TextField()
    category = models.CharField(max_length=30, default='Physical Game')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='Good')
    # Rental-specific validations (enforced by serializer too)
    rental_period = models.IntegerField(choices=RENTAL_PERIOD_CHOICES)          # days
    rental_charges = models.DecimalField(max_digits=10, decimal_places=2)       # price per period
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    location = models.CharField(max_length=100, blank=True, null=True)
    # Photo and contact required (Part 4.1 rule applied here too)
    image = models.ImageField(upload_to='rental_images/', validators=[validate_image_file])
    owner_contact = models.CharField(max_length=10)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Available')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[RENT] {self.title} — ₹{self.rental_charges}/{self.rental_period}d"


# ── PART 4.3: OTP for Checkout Verification ──────────────────────────────────
import random
from django.utils import timezone

class CheckoutOTP(models.Model):
    """
    Stores the 6-digit OTP sent via Twilio SMS for checkout verification.
    - OTPs expire after 5 minutes (checked in VerifyOTPView).
    - Consumed (is_used=True) after one successful verification → replay-safe.
    - One active OTP per phone — sending a new OTP overwrites the old one.
    """
    phone_number = models.CharField(max_length=10)    # 10-digit Indian mobile
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()               # created_at + 5 min
    is_used = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=['phone_number', 'is_used'])]

    @classmethod
    def generate_for(cls, phone: str):
        """Create (or overwrite) a fresh 6-digit OTP for this phone number."""
        otp = f"{random.randint(0, 999999):06d}"
        expires = timezone.now() + timezone.timedelta(minutes=5)
        # Invalidate all previous OTPs for this phone to prevent parallel use
        cls.objects.filter(phone_number=phone, is_used=False).delete()
        return cls.objects.create(
            phone_number=phone,
            otp_code=otp,
            expires_at=expires,
        )

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"OTP {self.otp_code} for {self.phone_number} (used={self.is_used})"


class Order(models.Model):
    # Full delivery lifecycle + COD support
    STATUS_CHOICES = [
        ('Pending', 'Pending'),              # Order placed, payment not yet confirmed
        ('COD_Confirmed', 'COD Confirmed'),  # COD order accepted by seller
        ('Paid', 'Paid'),                    # Online payment verified
        ('Shipped', 'Shipped'),              # Seller has dispatched the item
        ('Delivered', 'Delivered'),          # Buyer has received the item
        ('Cancelled', 'Cancelled'),          # Payment fail / buyer cancelled
    ]

    PAYMENT_METHOD_CHOICES = [
        ('Razorpay', 'Razorpay (Online)'),
        ('COD', 'Cash on Delivery'),
    ]

    listing = models.ForeignKey(Listing, related_name='orders', on_delete=models.CASCADE)
    buyer = models.ForeignKey(User, related_name='purchases', on_delete=models.CASCADE)
    seller = models.ForeignKey(User, related_name='sales', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Payment method + Razorpay identifiers (null for COD)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='Razorpay')
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)

    # Buyer Contact & Shipping Details (collected in checkout modal)
    phone_number = models.CharField(max_length=10, blank=True, null=True)   # 10 digits
    email = models.EmailField(blank=True, null=True)
    street_address = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    zip_code = models.CharField(max_length=20, blank=True, null=True)

    # ID/Trust Verification
    gov_id_number = models.CharField(max_length=50, blank=True, null=True)
    gov_id_doc = models.FileField(upload_to='id_verification/', null=True, blank=True)

    # Shipping / Delivery Tracking
    tracking_number = models.CharField(max_length=100, blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} — {self.listing.title} [{self.payment_method}] — {self.status}"