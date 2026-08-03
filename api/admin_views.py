from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.contrib.auth.models import User
from .models import Order, RentalOrder, Listing, RentalListing, Profile
from django.db.models import Sum
from django.db import transaction

from django.db.models.functions import TruncDate

class AdminDashboardStatsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        total_escrowed_sales = Order.objects.filter(status__in=['Escrowed', 'Shipped']).count()
        total_escrowed_rentals = RentalOrder.objects.filter(status__in=['Escrowed', 'Active']).count()
        
        platform_fee_sales = Order.objects.aggregate(total=Sum('platform_fee'))['total'] or 0
        platform_fee_rentals = RentalOrder.objects.aggregate(total=Sum('platform_fee'))['total'] or 0
        
        # Revenue Graph Data
        sales_revenue = Order.objects.annotate(date=TruncDate('created_at')).values('date').annotate(total=Sum('platform_fee')).order_by('date')
        rentals_revenue = RentalOrder.objects.annotate(date=TruncDate('created_at')).values('date').annotate(total=Sum('platform_fee')).order_by('date')
        
        revenue_map = {}
        for item in sales_revenue:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m-%d')
                revenue_map[date_str] = revenue_map.get(date_str, 0) + float(item['total'] or 0)
                
        for item in rentals_revenue:
            if item['date']:
                date_str = item['date'].strftime('%Y-%m-%d')
                revenue_map[date_str] = revenue_map.get(date_str, 0) + float(item['total'] or 0)

        revenue_graph = [{"date": k, "revenue": v} for k, v in sorted(revenue_map.items())]
        
        return Response({
            "total_users": total_users,
            "total_escrowed_orders": total_escrowed_sales + total_escrowed_rentals,
            "total_platform_fees": platform_fee_sales + platform_fee_rentals,
            "revenue_graph": revenue_graph
        })


class AdminUsersView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.filter(is_active=True).values('id', 'username', 'email', 'date_joined', 'is_staff')
        return Response({"users": list(users)})

class AdminListingsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Fetch all listings with detailed info for admin review
        market_qs = Listing.objects.all().order_by('-created_at')
        market = [{
            'id': l.id,
            'title': l.title,
            'seller__username': l.seller.username,
            'price': l.price,
            'is_approved': l.is_approved,
            'created_at': l.created_at,
            'description': l.description,
            'image': request.build_absolute_uri(l.image.url) if l.image else None,
            'image2': request.build_absolute_uri(l.image2.url) if l.image2 else None,
            'image3': request.build_absolute_uri(l.image3.url) if l.image3 else None,
            'image4': request.build_absolute_uri(l.image4.url) if l.image4 else None,
            'location': l.location,
            'seller_contact': l.seller_contact
        } for l in market_qs]

        rentals_qs = RentalListing.objects.all().order_by('-created_at')
        rentals = [{
            'id': l.id,
            'title': l.title,
            'owner__username': l.owner.username,
            'rental_charges': l.rental_charges,
            'is_approved': l.is_approved,
            'created_at': l.created_at,
            'description': l.description,
            'image': request.build_absolute_uri(l.image.url) if l.image else None,
            'image2': request.build_absolute_uri(l.image2.url) if l.image2 else None,
            'image3': request.build_absolute_uri(l.image3.url) if l.image3 else None,
            'image4': request.build_absolute_uri(l.image4.url) if l.image4 else None,
            'location': l.location,
            'owner_contact': l.owner_contact
        } for l in rentals_qs]
        
        return Response({
            "marketplace": market,
            "rentals": rentals
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
        sales = Order.objects.filter(status__in=['Escrowed', 'Shipped']).values(
            'id', 'amount', 'created_at', 'buyer__username', 'seller__username', 'listing__title', 'status'
        )
        rentals = RentalOrder.objects.filter(status__in=['Escrowed', 'Active']).values(
            'id', 'total_amount', 'created_at', 'renter__username', 'owner__username', 'listing__title', 'status'
        )
        return Response({
            "sales": list(sales),
            "rentals": list(rentals)
        })

from .models import Dispute

class AdminDisputesView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        disputes = Dispute.objects.select_related('user').all().order_by('-created_at')
        
        sale_order_ids = [d.order_id for d in disputes if d.order_type == 'sale']
        rent_order_ids = [d.order_id for d in disputes if d.order_type == 'rent']
        
        sale_orders = {o.id: o for o in Order.objects.filter(id__in=sale_order_ids).select_related('buyer', 'seller', 'listing')}
        rent_orders = {o.id: o for o in RentalOrder.objects.filter(id__in=rent_order_ids).select_related('renter', 'owner', 'listing')}
        
        results = []
        for d in disputes:
            item_details = None
            if d.order_type == 'sale':
                order = sale_orders.get(d.order_id)
                if order:
                    item_details = {
                        'buyer': order.buyer.username,
                        'seller': order.seller.username,
                        'listing_title': order.listing.title,
                        'amount': order.amount,
                        'images': [
                            request.build_absolute_uri(order.listing.image.url) if order.listing.image else None,
                            request.build_absolute_uri(order.listing.image2.url) if order.listing.image2 else None,
                            request.build_absolute_uri(order.listing.image3.url) if order.listing.image3 else None,
                            request.build_absolute_uri(order.listing.image4.url) if order.listing.image4 else None,
                        ]
                    }
            elif d.order_type == 'rent':
                order = rent_orders.get(d.order_id)
                if order:
                    item_details = {
                        'buyer': order.renter.username, # labeled buyer for generic UI mapping
                        'seller': order.owner.username,
                        'listing_title': order.listing.title,
                        'amount': order.total_amount,
                        'images': [
                            request.build_absolute_uri(order.listing.image.url) if order.listing.image else None,
                            request.build_absolute_uri(order.listing.image2.url) if order.listing.image2 else None,
                            request.build_absolute_uri(order.listing.image3.url) if order.listing.image3 else None,
                            request.build_absolute_uri(order.listing.image4.url) if order.listing.image4 else None,
                        ]
                    }
                    
            results.append({
                'id': d.id,
                'user__username': d.user.username,
                'order_id': d.order_id,
                'order_type': d.order_type,
                'reason': d.reason,
                'status': d.status,
                'created_at': d.created_at,
                'item_details': item_details
            })
            
        return Response({"disputes": results})

class AdminResolveDisputeView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def post(self, request, dispute_id):
        new_status = request.data.get('status') # 'Resolved' or 'Refunded'
        if new_status not in ['Resolved', 'Refunded']:
            return Response({"error": "Invalid status."}, status=400)
            
        try:
            with transaction.atomic():
                dispute = Dispute.objects.select_for_update().get(pk=dispute_id)
                if dispute.status != 'Open':
                    return Response({"error": f"Dispute is already {dispute.status}."}, status=400)
                
                # Fetch order
                if dispute.order_type == 'sale':
                    order = Order.objects.get(pk=dispute.order_id)
                    amount_to_release = order.amount
                    seller = order.seller
                    buyer = order.buyer
                elif dispute.order_type == 'rent':
                    order = RentalOrder.objects.get(pk=dispute.order_id)
                    amount_to_release = order.total_amount
                    seller = order.owner
                    buyer = order.renter
                else:
                    return Response({"error": "Invalid order type."}, status=400)

                # Process outcome
                if new_status == 'Resolved':
                    # Seller wins - release funds to seller
                    if dispute.order_type == 'sale':
                        order.status = 'Delivered'
                    else:
                        order.status = 'Completed'
                    order.save(update_fields=['status'])
                    
                    seller_profile, _ = Profile.objects.get_or_create(user=seller)
                    seller_profile.wallet_balance += amount_to_release
                    seller_profile.save(update_fields=['wallet_balance'])
                    
                elif new_status == 'Refunded':
                    # Buyer wins - refund funds to buyer
                    order.status = 'Cancelled'
                    order.save(update_fields=['status'])
                    
                    buyer_profile, _ = Profile.objects.get_or_create(user=buyer)
                    buyer_profile.wallet_balance += amount_to_release
                    buyer_profile.save(update_fields=['wallet_balance'])
                
                dispute.status = new_status
                dispute.save(update_fields=['status'])
                
                return Response({"success": True, "message": f"Dispute marked as {new_status}. Funds routed."})
        except Dispute.DoesNotExist:
            return Response({"error": "Dispute not found."}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

class AdminUserDetailsView(generics.GenericAPIView):
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        # Sell list (Marketplace and Rentals)
        market_sell_qs = Listing.objects.filter(seller_id=user_id).order_by('-created_at')
        market_sell = [{
            'id': l.id,
            'title': l.title,
            'price': l.price,
            'status': l.status,
            'created_at': l.created_at,
            'is_approved': l.is_approved
        } for l in market_sell_qs]
        
        rental_sell_qs = RentalListing.objects.filter(owner_id=user_id).order_by('-created_at')
        rental_sell = [{
            'id': l.id,
            'title': l.title,
            'rental_charges': l.rental_charges,
            'status': l.status,
            'created_at': l.created_at,
            'is_approved': l.is_approved
        } for l in rental_sell_qs]
        
        # Buy list (Marketplace Orders and Rental Orders)
        market_buy_qs = Order.objects.filter(buyer_id=user_id).order_by('-created_at')
        market_buy = [{
            'id': o.id,
            'listing_title': o.listing.title,
            'amount': o.amount,
            'status': o.status,
            'created_at': o.created_at
        } for o in market_buy_qs]
        
        rental_buy_qs = RentalOrder.objects.filter(renter_id=user_id).order_by('-created_at')
        rental_buy = [{
            'id': o.id,
            'listing_title': o.listing.title,
            'total_amount': o.total_amount,
            'status': o.status,
            'created_at': o.created_at
        } for o in rental_buy_qs]

        return Response({
            'sell_list': {'marketplace': market_sell, 'rentals': rental_sell},
            'buy_list': {'marketplace': market_buy, 'rentals': rental_buy}
        })

