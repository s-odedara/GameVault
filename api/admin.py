from django.contrib import admin
from .models import Game, Profile, Post, Comment, Follow, Listing, Order
# Register your models here.
admin.site.register(Game)
admin.site.register(Profile)
admin.site.register(Post)
admin.site.register(Comment)
admin.site.register(Follow)
admin.site.register(Listing)
admin.site.register(Order)