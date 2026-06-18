from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import CanvasBoard, CanvasObject

# TabularInline use karne se ek hi board ke andar uske saare objects tabular form mein dikhenge
class CanvasObjectInline(admin.TabularInline):
    model = CanvasObject
    extra = 0  # Extra empty slots pehle se nahi dikhayega
    fields = ('element_id', 'obj_type', 'x', 'y', 'width', 'height', 'text_content', 'color_hex')

@admin.register(CanvasBoard)
class CanvasBoardAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'created_at', 'updated_at')
    list_filter = ('created_at', 'user')
    search_fields = ('title', 'user__username')
    inlines = [CanvasObjectInline]  # Board open karte hi uske andar ke objects niche load ho jayenge

@admin.register(CanvasObject)
class CanvasObjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'board', 'element_id', 'obj_type', 'x', 'y')
    list_filter = ('obj_type', 'board')
    search_fields = ('element_id', 'text_content')