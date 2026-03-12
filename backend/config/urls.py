from django.contrib import admin
from django.urls import include, path
from importlib.util import find_spec

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/", include("apps.courses.urls")),
    path("api/v1/", include("apps.learning.urls")),
    path("api/v1/billing/", include("apps.billing.urls")),
    path("api/v1/ai/", include("apps.ai_tutor.urls")),
    path("api/v1/", include("apps.live.urls")),
    path("api/v1/", include("apps.community.urls")),
    path("api/v1/", include("apps.messaging.urls")),
]

if find_spec("drf_spectacular"):
    from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    ]
