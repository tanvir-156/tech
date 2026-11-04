from django.contrib import admin

from .models import Notice, Banner


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ('title', 'notice_type', 'is_active', 'is_featured', 'created_at')
    list_filter = ('notice_type', 'is_active', 'is_featured')


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('title', 'sort_order', 'is_active', 'created_at')
    list_filter = ('is_active',)
