from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import CanvasBoard, CanvasObject

class SaveCanvasWorkspaceAPI(APIView):
    permission_classes = [AllowAny] # Guest users sandbox support

    def post(self, request):
        board_id = request.data.get('board_id')
        title = request.data.get('title', 'Untitled TeachBoard Sandbox')
        objects_data = request.data.get('objects', [])

        # Fetch existing board or create a new one
        if board_id:
            board, _ = CanvasBoard.objects.get_or_create(id=board_id)
        else:
            board = CanvasBoard.objects.create(title=title)

        # Sync existing items clear records
        board.canvas_objects.all().delete()

        # Re-populate fresh records matrix
        for obj in objects_data:
            CanvasObject.objects.create(
                board=board,
                element_id=str(obj.get('id')),
                obj_type=obj.get('type'),
                x=float(obj.get('x')),
                y=float(obj.get('y')),
                width=float(obj.get('width')) if obj.get('width') else None,
                height=float(obj.get('height')) if obj.get('height') else None,
                text_content=obj.get('text', ''),
                color_hex=obj.get('color', '#2c6dd4')
            )

        return Response({
            "status": "success", 
            "board_id": board.id,
            "message": "TeachBoard elements compiled successfully!"
        }, status=status.HTTP_200_OK)