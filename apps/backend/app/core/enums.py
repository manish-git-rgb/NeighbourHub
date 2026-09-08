from enum import Enum


class PostCategory(str, Enum):
    DISCUSSION = "DISCUSSION"
    RECOMMENDATION = "RECOMMENDATION"
    EVENT = "EVENT"
    SERVICE = "SERVICE"
    LOST_FOUND = "LOST_FOUND"
    ISSUE = "ISSUE"
    ALERT = "ALERT"


class PostVisibility(str, Enum):
    PUBLIC = "PUBLIC"
    NEIGHBORHOOD = "NEIGHBORHOOD"


class PostStatus(str, Enum):
    ACTIVE = "ACTIVE"
    HIDDEN = "HIDDEN"
    DELETED = "DELETED"


class EventStatus(str, Enum):
    ACTIVE = "ACTIVE"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"