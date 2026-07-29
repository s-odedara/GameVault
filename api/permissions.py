from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` or `user` attribute.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # 🔥 FIX: Purani/legacy rows jinka 'user' field kabhi set hi nahi
        # hua (None) — ye pehle KISI se bhi delete/edit nahi ho paati thi,
        # kyunki `None == request.user` hamesha False hota hai. Ab koi bhi
        # logged-in user un "orphan" entries ko clean kar sakta hai.
        if obj.user is None:
            return True

        # Write permissions are only allowed to the owner of the profile.
        # Agar Profile model mein field ka naam 'user' hai, to obj.user use karein
        return obj.user == request.user


# 🔥 NAYA: Marketplace Listing model 'seller' field use karta hai (user nahi),
# isliye alag permission class — sirf seller khud apni listing edit/remove kar sake
class IsSellerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.seller == request.user