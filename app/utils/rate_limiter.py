"""In-memory rate limiter for API endpoints.

Tracks request timestamps per user and enforces configurable
sliding-window limits. Automatically purges stale entries to
prevent unbounded memory growth.
"""

import time
import threading
from collections import defaultdict
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimit:
    """A single rate-limit rule.

    Attributes:
        max_requests: Maximum number of requests allowed in the window.
        window_seconds: Sliding window duration in seconds.
        message: Human-readable error returned on limit breach.
    """

    max_requests: int
    window_seconds: int
    message: str


class RateLimiter:
    """Thread-safe in-memory sliding-window rate limiter.

    Stores a list of timestamps per key (e.g. user_id) and checks
    each incoming request against one or more ``RateLimit`` rules.

    Old timestamps are pruned on every ``check`` call, and a periodic
    full purge removes keys that have no recent activity.

    Usage::

        limiter = RateLimiter(limits=[
            RateLimit(3, 300, "Макс. 3 объявления за 5 минут"),
            RateLimit(10, 3600, "Макс. 10 объявлений в час"),
        ])

        denied, msg = limiter.check("user:123")
        if denied:
            return error_response(msg)
    """

    # How often (in seconds) a full purge of stale keys runs.
    _PURGE_INTERVAL: int = 600  # 10 minutes

    def __init__(self, limits: list[RateLimit]) -> None:
        """Initialise the limiter.

        Args:
            limits: One or more ``RateLimit`` rules to enforce.
        """
        if not limits:
            raise ValueError("At least one RateLimit must be provided")
        self._limits = limits
        # The maximum window we ever need to look back.
        self._max_window = max(lim.window_seconds for lim in limits)
        # key -> sorted list of timestamps (most recent last).
        self._store: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
        self._last_purge: float = time.monotonic()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check(self, key: str) -> tuple[bool, str | None]:
        """Record a request and check it against all limits.

        Args:
            key: Unique identifier (e.g. ``"user:12345"``).

        Returns:
            A tuple ``(denied, message)``.
            * ``denied`` is ``True`` when a limit is exceeded —
              the request should be rejected.
            * ``message`` contains the human-readable reason when
              denied, otherwise ``None``.
        """
        now = time.monotonic()

        with self._lock:
            self._maybe_purge(now)

            timestamps = self._store[key]
            # Drop entries older than the longest window.
            cutoff = now - self._max_window
            timestamps[:] = [ts for ts in timestamps if ts > cutoff]

            # Check each limit *before* recording the new timestamp.
            for limit in self._limits:
                window_start = now - limit.window_seconds
                recent = sum(1 for ts in timestamps if ts > window_start)
                if recent >= limit.max_requests:
                    return True, limit.message

            # All limits OK — record the request.
            timestamps.append(now)
            return False, None

    def reset(self, key: str) -> None:
        """Remove all recorded timestamps for *key*.

        Useful in tests or when a ban is lifted manually.
        """
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        """Remove **all** stored data (full reset)."""
        with self._lock:
            self._store.clear()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _maybe_purge(self, now: float) -> None:
        """Purge keys whose timestamps are all expired.

        Called inside the lock; runs at most once per ``_PURGE_INTERVAL``.
        """
        if now - self._last_purge < self._PURGE_INTERVAL:
            return
        self._last_purge = now
        cutoff = now - self._max_window
        stale_keys = [
            k for k, ts_list in self._store.items()
            if not ts_list or ts_list[-1] <= cutoff
        ]
        for k in stale_keys:
            del self._store[k]


# ------------------------------------------------------------------
# Pre-configured instance for the /api/submit endpoint
# ------------------------------------------------------------------

submit_limiter = RateLimiter(
    limits=[
        RateLimit(
            max_requests=3,
            window_seconds=300,
            message="Слишком много объявлений. Максимум 3 за 5 минут.",
        ),
        RateLimit(
            max_requests=10,
            window_seconds=3600,
            message="Слишком много объявлений. Максимум 10 в час.",
        ),
    ],
)
