from django.db import models

from products.models import TimeStampedModel

# Create your models here.


class Notice(TimeStampedModel):

    class NoticeType(models.TextChoices):
        GENERAL = 'general', 'General'
        PROMOTION = 'promotion', 'Promotion'
        ORDER = 'order', 'Order'
        SYSTEM = 'system', 'System'
        ANNOUNCEMENT = 'announcement', 'Announcement'

    title = models.CharField(
        max_length=200
    )

    message = models.TextField()

    notice_type = models.CharField(
        max_length=30,
        choices=NoticeType.choices,
        default=NoticeType.GENERAL
    )

    is_active = models.BooleanField(
        default=True
    )

    is_featured = models.BooleanField(
        default=False
    )

    start_at = models.DateTimeField(
        blank=True,
        null=True
    )

    end_at = models.DateTimeField(
        blank=True,
        null=True
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Banner(TimeStampedModel):
    """Promotional banners shown in the app's auto-sliding home carousel."""

    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=200, blank=True, default='')
    image = models.ImageField(upload_to='banners/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    link = models.CharField(max_length=200, blank=True, default='')
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['sort_order', '-created_at']

    def __str__(self):
        return self.title
