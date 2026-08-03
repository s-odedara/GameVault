import os

file_path = 'd:/HOPE18/GameVault_Project_FIXED/GameVault_Project/api/views.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update VerifyPaymentView
old_verify_payment = """        order = get_object_or_404(Order, razorpay_order_id=razorpay_order_id, buyer=request.user)

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
        print(f"--- DEBUG OTP FOR TESTING: {order.handover_otp} ---")
        order.razorpay_payment_id = razorpay_payment_id
        order.razorpay_signature  = razorpay_signature
        order.status = 'Escrowed'
        order.save()
        
        order.listing.status = 'Sold'
        order.listing.save(update_fields=['status'])"""

new_verify_payment = """        import random
        from decimal import Decimal
        from django.db import transaction
        
        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(razorpay_order_id=razorpay_order_id, buyer=request.user)

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

                # ── Escrow & Commission Logic ──
                base_amount = Decimal(str(order.amount))
                platform_fee = base_amount * Decimal('0.05')
                seller_earnings = base_amount - platform_fee

                order.platform_fee = platform_fee
                order.seller_earnings = seller_earnings
                order.handover_otp = str(random.randint(1000, 9999))
                print(f"--- DEBUG OTP FOR TESTING: {order.handover_otp} ---")
                order.razorpay_payment_id = razorpay_payment_id
                order.razorpay_signature  = razorpay_signature
                order.status = 'Escrowed'
                order.save()
                
                listing = order.listing
                listing.status = 'Sold'
                listing.save(update_fields=['status'])
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)"""

content = content.replace(old_verify_payment, new_verify_payment)

# 2. Update VerifyRentalPaymentView
old_rental = """        order = get_object_or_404(RentalOrder, pk=order_id, renter=request.user)

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
        print(f"--- DEBUG OTP FOR TESTING: {order.handover_otp} ---")
        
        order.status = 'Escrowed'
        order.save()
        
        order.listing.status = 'Rented'
        order.listing.save(update_fields=['status'])"""

new_rental = """        import razorpay
        import random
        from decimal import Decimal
        from django.db import transaction
        
        try:
            with transaction.atomic():
                order = RentalOrder.objects.select_for_update().get(pk=order_id, renter=request.user)

                if order.status == 'Escrowed':
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
                    return Response({"error": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

                # ── Escrow & Commission Logic ──
                # 5% commission based ONLY on base Rent price (exclude security deposit)
                base_rent = Decimal(str(order.total_amount)) - Decimal(str(order.security_deposit))
                platform_fee = base_rent * Decimal('0.05')
                seller_earnings = base_rent - platform_fee

                order.platform_fee = platform_fee
                order.seller_earnings = seller_earnings
                order.handover_otp = str(random.randint(1000, 9999))
                print(f"--- DEBUG OTP FOR TESTING: {order.handover_otp} ---")
                
                order.status = 'Escrowed'
                order.save()
                
                listing = order.listing
                listing.status = 'Rented'
                listing.save(update_fields=['status'])
        except RentalOrder.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)"""

content = content.replace(old_rental, new_rental)

# 3. Update VerifyHandoverOTPView
old_handover = """        if order_type == 'sale':
            order = get_object_or_404(Order, pk=order_id, seller=request.user)
            if order.status != 'Shipped':
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
            return Response({"error": "Invalid order type."}, status=status.HTTP_400_BAD_REQUEST)"""

new_handover = """        from django.db import transaction
        from .models import Profile
        
        try:
            with transaction.atomic():
                if order_type == 'sale':
                    order = Order.objects.select_for_update().get(pk=order_id, seller=request.user)
                    if order.status != 'Shipped':
                        return Response({"error": f"Invalid order status for handover: {order.status}"}, status=status.HTTP_400_BAD_REQUEST)
                    if order.handover_otp != otp:
                        return Response({"error": "Invalid OTP. Handover failed."}, status=status.HTTP_400_BAD_REQUEST)
                    
                    order.status = 'Delivered'
                    order.save(update_fields=['status'])
                    
                    seller_profile, _ = Profile.objects.get_or_create(user=order.seller)
                    seller_profile.wallet_balance += order.seller_earnings
                    seller_profile.save(update_fields=['wallet_balance'])
                    
                    return Response({"success": True, "message": "Handover successful! Order is now Delivered and funds released."})
                    
                elif order_type == 'rent':
                    order = RentalOrder.objects.select_for_update().get(pk=order_id, owner=request.user)
                    if order.status != 'Escrowed':
                        return Response({"error": f"Invalid rental status for handover: {order.status}"}, status=status.HTTP_400_BAD_REQUEST)
                    if order.handover_otp != otp:
                        return Response({"error": "Invalid OTP. Handover failed."}, status=status.HTTP_400_BAD_REQUEST)
                    
                    order.status = 'In Use'
                    order.save(update_fields=['status'])
                    
                    owner_profile, _ = Profile.objects.get_or_create(user=order.owner)
                    owner_profile.wallet_balance += order.seller_earnings
                    owner_profile.save(update_fields=['wallet_balance'])
                    
                    return Response({"success": True, "message": "Handover successful! Item is now In Use and earnings released."})
                else:
                    return Response({"error": "Invalid order type."}, status=status.HTTP_400_BAD_REQUEST)
        except (Order.DoesNotExist, RentalOrder.DoesNotExist):
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)"""

content = content.replace(old_handover, new_handover)

# 4. Append PayoutDetailsView
payout_details_class = """
class PayoutDetailsView(generics.GenericAPIView):
    \"\"\"GET/PUT /api/users/profile/payout-details/\"\"\"
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from .models import Profile
        profile, _ = Profile.objects.get_or_create(user=request.user)
        return Response({
            'account_holder_name': profile.account_holder_name or '',
            'bank_account_number': profile.bank_account_number or '',
            'ifsc_code': profile.ifsc_code or '',
            'bank_name': profile.bank_name or ''
        })

    def put(self, request):
        from .models import Profile
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.account_holder_name = request.data.get('account_holder_name', profile.account_holder_name)
        profile.bank_account_number = request.data.get('bank_account_number', profile.bank_account_number)
        profile.ifsc_code = request.data.get('ifsc_code', profile.ifsc_code)
        profile.bank_name = request.data.get('bank_name', profile.bank_name)
        profile.save()
        return Response({'success': True, 'message': 'Payout details updated successfully.'})
"""

if "PayoutDetailsView" not in content:
    content += payout_details_class

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated views.py")
