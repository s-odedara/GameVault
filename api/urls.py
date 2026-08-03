from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GameViewSet, ProfileViewSet, PostViewSet, CommentViewSet,
    RegisterView, LoginView, GoogleLoginView, FollowViewSet,
    ListingViewSet, RentalListingViewSet,
    CreateCheckoutOrderView, VerifyPaymentView,
    MyOrdersView, MySalesView, UpdateOrderStatusView,
    SendOTPView, VerifyOTPView,
    UpvotePostView,
    RawgProxyView,
    GamingNewsView,
    CreateRentalOrderView, UpdateRentalStatusView, MyRentalsView, MyLentItemsView,
    VerifyRentalPaymentView, VerifyHandoverOTPView, make_me_admin, RaiseDisputeView,
    PayoutDetailsView
)
from .admin_views import (
    AdminDashboardStatsView, AdminUsersView,
    AdminListingsView, AdminApproveListingView, AdminUserDeleteView,
    AdminEscrowOrdersView, AdminDisputesView, AdminResolveDisputeView,
    AdminUserDetailsView
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
    path('auth/google/', GoogleLoginView.as_view(), name='google-login'),

    # ── Community ────────────────────────────────────────────
    path('posts/<int:pk>/upvote/', UpvotePostView.as_view(), name='post-upvote'),

    # ── Marketplace — OTP ────────────────────────────────────
    path('marketplace/send-otp/',    SendOTPView.as_view(),   name='marketplace-send-otp'),
    path('marketplace/verify-otp/',  VerifyOTPView.as_view(), name='marketplace-verify-otp'),

    # ── Marketplace — Checkout, verify, orders ───────────────
    path('marketplace/checkout/<int:listing_id>/', CreateCheckoutOrderView.as_view(), name='marketplace-checkout'),
    path('marketplace/verify-payment/',            VerifyPaymentView.as_view(),       name='marketplace-verify-payment'),
    path('marketplace/verify-handover/',           VerifyHandoverOTPView.as_view(),   name='marketplace-verify-handover'),
    path('marketplace/my-orders/',                 MyOrdersView.as_view(),            name='marketplace-my-orders'),
    path('marketplace/my-sales/',                  MySalesView.as_view(),             name='marketplace-my-sales'),
    path('marketplace/orders/<int:order_id>/update-status/', UpdateOrderStatusView.as_view(), name='marketplace-update-order-status'),
    path('users/profile/payout-details/',          PayoutDetailsView.as_view(),       name='payout-details'),

    # ── Rentals ──────────────────────────────────────────────
    path('rentals/checkout/<int:listing_id>/',     CreateRentalOrderView.as_view(),   name='rentals-checkout'),
    path('rentals/verify-payment/',                VerifyRentalPaymentView.as_view(), name='rentals-verify-payment'),
    path('rentals/orders/<int:order_id>/update-status/', UpdateRentalStatusView.as_view(), name='rentals-update-status'),
    path('rentals/my-rentals/',                    MyRentalsView.as_view(),           name='rentals-my-rentals'),
    path('rentals/my-lent-items/',                 MyLentItemsView.as_view(),         name='rentals-my-lent-items'),

    # ── RAWG proxy ───────────────────────────────────────────
    path('rawg/<path:endpoint>', RawgProxyView.as_view(), name='rawg-proxy'),

    path('disputes/raise/', RaiseDisputeView.as_view(), name='raise-dispute'),

    # ── Gaming News (NewsAPI proxy) ──────────────────────────
    path('gaming-news/', GamingNewsView.as_view(), name='gaming-news'),

    # ── Temporary Admin Endpoint ─────────────────────────────
    path('make-me-admin/', make_me_admin, name='make-me-admin'),

    # ── Admin Endpoints ──────────────────────────────────────
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin-stats'),
    path('admin/users/', AdminUsersView.as_view(), name='admin-users'),
    path('admin/users/<int:user_id>/', AdminUserDeleteView.as_view(), name='admin-user-delete'),
    path('admin/users/<int:user_id>/details/', AdminUserDetailsView.as_view(), name='admin-user-details'),
    path('admin/listings/', AdminListingsView.as_view(), name='admin-listings'),
    path('admin/listings/<str:listing_type>/<int:listing_id>/approve/', AdminApproveListingView.as_view(), name='admin-approve-listing'),
    path('admin/escrow/', AdminEscrowOrdersView.as_view(), name='admin-escrow'),
    path('admin/disputes/', AdminDisputesView.as_view(), name='admin-disputes'),
    path('admin/disputes/<int:dispute_id>/resolve/', AdminResolveDisputeView.as_view(), name='admin-resolve-dispute'),

    path('', include(router.urls)),
]