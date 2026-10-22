from django.http import JsonResponse


class TemporaryPasswordMiddleware:
    ALLOWED_PATHS = {
        "/api/auth/csrf/",
        "/api/auth/login/",
        "/api/auth/logout/",
        "/api/auth/me/",
        "/api/auth/change-password/",
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        if path.startswith("/api/") and path not in self.ALLOWED_PATHS:
            user = getattr(request, "user", None)

            if (
                user is not None
                and user.is_authenticated
                and getattr(user, "must_change_password", False)
            ):
                return JsonResponse(
                    {
                        "detail": (
                            "You must change your temporary password "
                            "before accessing this resource."
                        ),
                        "code": "password_change_required",
                    },
                    status=403,
                )

        return self.get_response(request)
