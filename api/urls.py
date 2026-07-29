from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GameViewSet, ProfileViewSet, PostViewSet, CommentViewSet,
    RegisterView, LoginView, FollowViewSet,
    ListingViewSet, RentalListingViewSet,
    CreateCheckoutOrderView, VerifyPaymentView,
    MyOrdersView, MySalesView, UpdateOrderStatusView,
    SendOTPView, VerifyOTPView,
    UpvotePostView,
    RawgProxyView,
)

router = DefaultRouter()
router.register(r'games',    GameViewSet)
router.register(r'profiles', ProfileViewSet)
router.register(r'posts',    PostViewSet)
router.register(r'comments', CommentViewSet)
router.register(r'follows',  FollowViewSet, basename='follow')
router.register(r'listings', ListingViewSet, basename='listing')
router.register(r'rentals',  RentalListingViewSet, basename='rental')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/',    LoginView.as_view(),    name='login'),

    # ── Community ────────────────────────────────────────────
    path('posts/<int:pk>/upvote/', UpvotePostView.as_view(), name='post-upvote'),

    # ── Marketplace — OTP ────────────────────────────────────
    path('marketplace/send-otp/',    SendOTPView.as_view(),   name='marketplace-send-otp'),
    path('marketplace/verify-otp/',  VerifyOTPView.as_view(), name='marketplace-verify-otp'),

    # ── Marketplace — Checkout, verify, orders ───────────────
    path('marketplace/checkout/<int:listing_id>/', CreateCheckoutOrderView.as_view(), name='marketplace-checkout'),
    path('marketplace/verify-payment/',            VerifyPaymentView.as_view(),       name='marketplace-verify-payment'),
    path('marketplace/my-orders/',                 MyOrdersView.as_view(),            name='marketplace-my-orders'),
    path('marketplace/my-sales/',                  MySalesView.as_view(),             name='marketplace-my-sales'),
    path('marketplace/orders/<int:order_id>/update-status/', UpdateOrderStatusView.as_view(), name='marketplace-update-order-status'),

    # ── RAWG proxy ───────────────────────────────────────────
    path('rawg/<path:endpoint>', RawgProxyView.as_view(), name='rawg-proxy'),

    path('', include(router.urls)),
]