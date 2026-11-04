from rest_framework import serializers
from .models import Notice, Banner


class NoticeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Notice
        fields = [
            'id',
            'title',
            'message',
            'notice_type',
            'is_active',
            'is_featured',
            'start_at',
            'end_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
        ]

class BannerSerializer(serializers.ModelSerializer):

    # Always return an absolute URL for uploaded images so the Flutter
    # app doesn't have to guess the host.
    image = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            'id',
            'title',
            'subtitle',
            'image',
            'image_url',
            'link',
            'sort_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_image(self, obj):
        if obj.image and hasattr(obj.image, 'url'):
            request = self.context.get('request')
            url = obj.image.url
            return request.build_absolute_uri(url) if request else url
        return None
