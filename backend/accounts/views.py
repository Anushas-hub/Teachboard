from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token 
from .models import CustomUser

class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        first_name = data.get('first_name', '')

        if not username or not email or not password:
            return Response(
                {"error": "Please provide all required fields (Name, Email, Password)."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if CustomUser.objects.filter(username=username).exists() or CustomUser.objects.filter(email=email).exists():
            return Response(
                {"error": "An account with this email address already exists."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = CustomUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name
            )
            
            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                "message": "User registered successfully!",
                "token": token.key
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Internal Registration Failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"error": "Please enter both email and password."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if user is not None:
            if not user.is_active:
                return Response(
                    {"error": "This account has been deactivated."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            token, _ = Token.objects.get_or_create(user=user)
            update_last_login(None, user)
            
            return Response({
                "token": token.key,
                "name": user.first_name
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {"error": "Invalid credentials. Please verify your email and password."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )