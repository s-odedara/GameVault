from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth.models import User
from .models import Order, RentalOrder, Listing, RentalListing
from django.db.models import Sum

class AdminDashboardStatsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        total_escrowed_sales = Order.objects.filter(status='Escrowed').count()
        total_escrowed_rentals = RentalOrder.objects.filter(status='Escrowed').count()
        
        platform_fee_sales = Order.objects.aggregate(total=Sum('platform_fee'))['total'] or 0
        platform_fee_rentals = RentalOrder.objects.aggregate(total=Sum('platform_fee'))['total'] or 0
        
        return Response({
            "total_users": total_users,
            "total_escrowed_orders": total_escrowed_sales + total_escrowed_rentals,
            "total_platform_fees": platform_fee_sales + platform_fee_rentals,
        })

class AdminUsersView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.filter(is_active=True).values('id', 'username', 'email', 'date_joined', 'is_staff')
        return Response({"users": list(users)})

class AdminListingsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Fetch all listings
        market = Listing.objects.all().values('id', 'title', 'seller__username', 'price', 'is_approved', 'created_at')
        rentals = RentalListing.objects.all().values('id', 'title', 'owner__username', 'rental_charges', 'is_approved', 'created_at')
        
        return Response({
            "marketplace": list(market),
            "rentals": list(rentals)
        })

class AdminApproveListingView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def post(self, request, listing_type, listing_id):
        action = request.data.get('action') # 'approve' or 'reject'
        is_approved = True if action == 'approve' else False
        
        if listing_type == 'market':
            try:
                listing = Listing.objects.get(pk=listing_id)
                listing.is_approved = is_approved
                if action == 'reject':
                    listing.status = 'Removed'
                listing.save()
            except Listing.DoesNotExist:
                return Response({"error": "Listing not found"}, status=404)
        elif listing_type == 'rental':
            try:
                listing = RentalListing.objects.get(pk=listing_id)
                listing.is_approved = is_approved
                if action == 'reject':
                    listing.status = 'Removed'
                listing.save()
            except RentalListing.DoesNotExist:
                return Response({"error": "Rental listing not found"}, status=404)
        else:
            return Response({"error": "Invalid listing type"}, status=400)
            
        return Response({"success": True, "message": f"Listing {action}d successfully."})

class AdminUserDeleteView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, user_id):
        try:
            user_to_delete = User.objects.get(pk=user_id)
            if user_to_delete.is_superuser:
                return Response({"error": "Cannot delete a superuser."}, status=status.HTTP_400_BAD_REQUEST)
            user_to_delete.is_active = False
            user_to_delete.save(update_fields=['is_active'])
            return Response({"success": True, "message": "User successfully deactivated."})
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

class AdminEscrowOrdersView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        sales = Order.objects.filter(status='Escrowed').values(
            'id', 'amount', 'created_at', 'buyer__username', 'seller__username', 'listing__title'
        )
        rentals = RentalOrder.objects.filter(status='Escrowed').values(
            'id', 'total_amount', 'created_at', 'renter__username', 'owner__username', 'listing__title'
        )
        return Response({
            "sales": list(sales),
            "rentals": list(rentals)
        })

from .models import Dispute

class AdminDisputesView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        disputes = Dispute.objects.all().order_by('-created_at').values(
            'id', 'user__username', 'order_id', 'order_type', 'reason', 'status', 'created_at'
        )
        return Response({"disputes": list(disputes)})

class AdminResolveDisputeView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def post(self, request, dispute_id):
        new_status = request.data.get('status') # 'Resolved' or 'Refunded'
        try:
            dispute = Dispute.objects.get(pk=dispute_id)
            dispute.status = new_status
            dispute.save(update_fields=['status'])
            return Response({"success": True, "message": f"Dispute marked as {new_status}."})
        except Dispute.DoesNotExist:
            return Response({"error": "Dispute not found."}, status=404)
