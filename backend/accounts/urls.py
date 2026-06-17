from django.urls import path
from .views import SignupView, LoginView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='api_signup'),
    path('login/', LoginView.as_view(), name='api_login'),
]