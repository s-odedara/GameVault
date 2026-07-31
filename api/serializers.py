import re
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.validators import RegexValidator
from rest_framework import serializers
from .models import Game, Profile, Post, Comment, Listing, Order, RentalListing, CheckoutOTP
from .utils import fetch_game_cover
from .validators import validate_image_file

# ── Shared helpers ─────────────────────────────────────────────────────────────
USERNAME_VALIDATOR = RegexValidator(
    regex=r'^[a-zA-Z0-9_.-]+$',
    message="Username can only contain letters, numbers, and . _ - (no spaces or special characters)."
)

PHONE_10_REGEX = re.compile(r'^\d{10}$')    # Exactly 10 digits, no spaces or dashes


def reject_blank(value, field_name):
    if value is None or not str(value).strip():
        raise serializers.ValidationError(f"{field_name} cannot be empty.")
    return value.strip() if isinstance(value, str) else value


def validate_10_digit_phone(value):
    """Reusable: ensures exactly 10 digits (Indian mobile format)."""
    cleaned = value.strip()
    if not PHONE_10_REGEX.match(cleaned):
        raise serializers.ValidationError(
            "Mobile number must be exactly 10 digits (e.g., 9876543210). No spaces, dashes, or country code."
        )
    return cleaned


# ── Game ──────────────────────────────────────────────────────────────────────
class GameSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Game
        fields = '__all__'

    def validate_title(self, value):
        value = reject_blank(value, "Title")
        if len(value) > 100:
            raise serializers.ValidationError("Title must be 100 characters or fewer.")
        return value

    def validate_genre(self, value):
        value = reject_blank(value, "Genre")
        if len(value) > 50:
            raise serializers.ValidationError("Genre must be 50 characters or fewer.")
        return value

    def validate_platform(self, value):
        value = reject_blank(value, "Platform")
        if len(value) > 255:
            raise serializers.ValidationError("Platform must be 255 characters or fewer.")
        return value

    def validate_rating(self, value):
        if value is None:
            return value
        if value < 0 or value > 5:
            raise serializers.ValidationError("Rating must be between 0 and 5.")
        return value

    def validate_notes(self, value):
        if value and len(value) > 2000:
            raise serializers.ValidationError("Notes must be 2000 characters or fewer.")
        return value

    def validate_release_date(self, value):
        if value and value > date.today() + timedelta(days=365 * 5):
            raise serializers.ValidationError("Release date is too far in the future.")
        return value

    def validate_image(self, value):
        if value:
            validate_image_file(value)
        return value

    def create(self, validated_data):
        if not validated_data.get('image_url') and not validated_data.get('image'):
            cover_url = fetch_game_cover(validated_data.get('title'))
            if cover_url:
                validated_data['image_url'] = cover_url
        return super().create(validated_data)


# ── Profile ───────────────────────────────────────────────────────────────────
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = '__all__'
        read_only_fields = ['user']

    def validate_bio(self, value):
        if value and len(value) > 1000:
            raise serializers.ValidationError("Bio must be 1000 characters or fewer.")
        return value

    def validate_gamer_tag(self, value):
        if value and len(value) > 50:
            raise serializers.ValidationError("Gamer tag must be 50 characters or fewer.")
        return value


# ── Post (Community) ──────────────────────────────────────────────────────────
class PostSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Post
        fields = '__all__'
        read_only_fields = ['user', 'upvotes']    # upvotes changed via UpvoteView

    def validate_title(self, value):
        value = reject_blank(value, "Title")
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        if len(value) > 255:
            raise serializers.ValidationError("Title must be 255 characters or fewer.")
        return value

    def validate_content(self, value):
        value = reject_blank(value, "Content")
        if len(value) > 5000:
            raise serializers.ValidationError("Post content must be 5000 characters or fewer.")
        return value


# ── Comment ───────────────────────────────────────────────────────────────────
class CommentSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Comment
        fields = '__all__'
        read_only_fields = ['user']

    def validate_content(self, value):
        value = reject_blank(value, "Comment")
        if len(value) > 1000:
            raise serializers.ValidationError("Comment must be 1000 characters or fewer.")
        return value


# ── Register ──────────────────────────────────────────────────────────────────
class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        min_length=3,
        max_length=30,
        validators=[USERNAME_VALIDATOR],
    )
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ['id', 'username', 'password']

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        return user


# ======================================================================
# MARKETPLACE SERIALIZERS
# ======================================================================

class ListingSerializer(serializers.ModelSerializer):
    seller_username = serializers.ReadOnlyField(source='seller.username')

    class Meta:
        model = Listing
        fields = '__all__'
        read_only_fields = ['seller', 'status']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            url = instance.image.url
            if not url.startswith('http'):
                request = self.context.get('request')
                if request:
                    url = request.build_absolute_uri(url)
            ret['image'] = url
        else:
            ret['image'] = None
        return ret

    def validate_title(self, value):
        value = reject_blank(value, "Title")
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        if len(value) > 150:
            raise serializers.ValidationError("Title must be 150 characters or fewer.")
        return value

    def validate_description(self, value):
        value = reject_blank(value, "Description")
        if len(value) > 3000:
            raise serializers.ValidationError("Description must be 3000 characters or fewer.")
        return value

    def validate_price(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Price must be greater than ₹0.")
        if value > 1000000:
            raise serializers.ValidationError("Price seems unrealistically high. Please double-check.")
        return value

    def validate_location(self, value):
        if value and len(value) > 100:
            raise serializers.ValidationError("Location must be 100 characters or fewer.")
        return value

    def validate_image(self, value):
        if value:
            validate_image_file(value)
        return value

    def validate_seller_contact(self, value):
        """PART 4.1: Seller's contact must be exactly 10 digits."""
        return validate_10_digit_phone(value)


# ── Rental Listing ─────────────────────────────────────────────────────────────
class RentalListingSerializer(serializers.ModelSerializer):
    owner_username = serializers.ReadOnlyField(source='owner.username')

    class Meta:
        model = RentalListing
        fields = '__all__'
        read_only_fields = ['owner', 'status']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.image:
            url = instance.image.url
            if not url.startswith('http'):
                request = self.context.get('request')
                if request:
                    url = request.build_absolute_uri(url)
            ret['image'] = url
        else:
            ret['image'] = None
        return ret

    def validate_rental_period(self, value):
        allowed = [7, 14, 30]
        if value not in allowed:
            raise serializers.ValidationError(f"Rental period must be one of: {allowed} days.")
        return value

    def validate_rental_charges(self, value):
        if value <= 0:
            raise serializers.ValidationError("Rental charges must be greater than ₹0.")
        return value

    def validate_security_deposit(self, value):
        if value < 0:
            raise serializers.ValidationError("Security deposit cannot be negative.")
        return value

    def validate_owner_contact(self, value):
        return validate_10_digit_phone(value)

    def validate_image(self, value):
        if value:
            validate_image_file(value)
        return value


# ── Checkout Form (Buy + OTP verified) ────────────────────────────────────────
class CheckoutFormSerializer(serializers.Serializer):
    """
    Validates buyer data from checkout modal.
    PART 4.3: phone_number MUST be exactly 10 digits (re-validated here as
    belt-and-suspenders — the OTP step already enforces this on the frontend).
    """
    payment_method = serializers.ChoiceField(choices=['Razorpay', 'COD'])
    # ── STRICT: 10-digit mobile (Part 4.3) ────────────────────────────────
    phone_number  = serializers.CharField(max_length=10)
    email         = serializers.EmailField()
    street_address= serializers.CharField(max_length=255)
    city          = serializers.CharField(max_length=100)
    state         = serializers.CharField(max_length=100)
    zip_code      = serializers.CharField(max_length=20)
    gov_id_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    gov_id_doc    = serializers.FileField(required=False, allow_null=True)

    def validate_phone_number(self, value):
        return validate_10_digit_phone(value)

    def validate_zip_code(self, value):
        value = value.strip()
        if not re.match(r'^[\d\-\s]{4,10}$', value):
            raise serializers.ValidationError("Enter a valid ZIP / PIN code.")
        return value


# ── Order ─────────────────────────────────────────────────────────────────────
class OrderSerializer(serializers.ModelSerializer):
    listing_title  = serializers.ReadOnlyField(source='listing.title')
    listing_image  = serializers.SerializerMethodField()
    buyer_username = serializers.ReadOnlyField(source='buyer.username')
    seller_username= serializers.ReadOnlyField(source='seller.username')

    class Meta:
        model = Order
        fields = '__all__'
        read_only_fields = [
            'buyer', 'seller', 'amount', 'payment_method',
            'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
            'status', 'created_at', 'updated_at',
        ]

    def get_listing_image(self, obj):
        listing = obj.listing
        if listing.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(listing.image.url)
        return None
