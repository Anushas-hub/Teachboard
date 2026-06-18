from django.urls import path
from .views import SaveCanvasWorkspaceAPI

urlpatterns = [
    path('api/save-board/', SaveCanvasWorkspaceAPI.as_view(), name='save_board'),
]