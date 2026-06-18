from django.db import models
from django.conf import settings

class CanvasBoard(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255, default="Untitled TeachBoard Sandbox")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class CanvasObject(models.Model):
    # Related name ko 'objects' se badal kar 'canvas_objects' kar diya taaki clash na ho
    board = models.ForeignKey(CanvasBoard, related_name="canvas_objects", on_delete=models.CASCADE)
    element_id = models.CharField(max_length=100) 
    obj_type = models.CharField(max_length=50)    # 'text', 'rect', 'sticky'
    x = models.FloatField()
    y = models.FloatField()
    width = models.FloatField(null=True, blank=True)
    height = models.FloatField(null=True, blank=True)
    text_content = models.TextField(blank=True, default="")
    color_hex = models.CharField(max_length=20, default="#2c6dd4")

    def __str__(self):
        return f"{self.obj_type} - {self.element_id}"