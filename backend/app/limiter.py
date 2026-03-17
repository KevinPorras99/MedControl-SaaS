from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared rate limiter instance — imported by main.py and individual routers.
# Key: client IP address. For authenticated endpoints, the IP is a reasonable
# proxy since Clerk handles per-user auth separately.
limiter = Limiter(key_func=get_remote_address)
