from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path
from importlib.util import find_spec

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/", include("apps.learning.urls")),
    path("api/v1/", include("apps.courses.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/ai/", include("apps.ai_tutor.urls")),
    path("api/v1/", include("apps.live.urls")),
    path("api/v1/", include("apps.community.urls")),
    path("api/v1/", include("apps.messaging.urls")),
    path("api/v1/", include("apps.admin_dashboard.urls")),
]

if find_spec("drf_spectacular"):
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
