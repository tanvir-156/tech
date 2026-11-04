from rest_framework.routers import DefaultRouter
from .views import NoticeViewSet, BannerViewSet

router = DefaultRouter()

router.register(
    'banners',
    BannerViewSet,
    basename='banner'
)

router.register(
    'notices',
    NoticeViewSet,
    basename='notice'
)

urlpatterns = router.urls