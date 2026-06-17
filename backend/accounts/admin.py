from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ['email', 'username', 'role', 'is_staff']
    
    # Custom display handling using safe tuple merging
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Profile Info', {'fields': ('role',)}),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Profile Info', {
            'classes': ('wide',),
            'fields': ('role', 'email', 'first_name'),
        }),
    )