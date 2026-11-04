from rest_framework import viewsets
from .models import Notice, Banner
from .serializers import NoticeSerializer, BannerSerializer
from django_filters.rest_framework import DjangoFilterBackend
from products.permissions import IsAdminOrReadOnly


class NoticeViewSet(viewsets.ModelViewSet):

    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [IsAdminOrReadOnly]

    filter_backends = [
        DjangoFilterBackend
    ]

    filterset_fields = [
        'notice_type',
        'is_active',
        'is_featured',
    ]

class BannerViewSet(viewsets.ModelViewSet):

    queryset = Banner.objects.all()
    serializer_class = BannerSerializer
    permission_classes = [IsAdminOrReadOnly]

    filter_backends = [
        DjangoFilterBackend
    ]

    filterset_fields = [
        'is_active',
    ]
