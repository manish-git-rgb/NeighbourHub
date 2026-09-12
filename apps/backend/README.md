# NeighborHub Backend

FastAPI backend for **NeighborHub**, a hyperlocal community platform that connects people with events, local places, services, recommendations, lost & found posts, issue reports, and neighborhood discussions.

---

## Overview

NeighborHub is designed around location-aware community interactions.

The backend provides:

- User authentication and authorization
- Neighborhoods and memberships
- Community posts
- Location-based nearby searches
- Events and RSVP management
- Places and local recommendations
- Service providers
- Lost & Found
- Community issue reports
- Comments and reactions
- Notifications
- Content moderation
- Admin user management

---

## Tech Stack

| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| Python | Backend programming language |
| PostgreSQL | Primary database |
| PostGIS | Geospatial/location queries |
| SQLAlchemy | ORM |
| Alembic | Database migrations |
| Pydantic | Request/response validation |
| JWT | Authentication tokens |
| Argon2 | Password hashing |
| GeoAlchemy2 | PostGIS integration |
| Shapely | Geometry handling |
| Uvicorn | ASGI server |
| Pytest | Automated testing |

---

## Features

### Authentication

- User registration
- Login
- JWT access tokens
- JWT refresh tokens
- Refresh-token rotation
- Logout / refresh-token revocation
- Password hashing with Argon2

### Users

- Get current user
- Update profile
- View joined neighborhoods

### Neighborhoods

- Create and retrieve neighborhoods
- Join neighborhoods
- Leave neighborhoods
- View user neighborhood memberships
- Location-aware neighborhood data

### Posts

- Create posts
- Retrieve posts
- Update own posts
- Delete own posts
- Category filtering
- Status filtering
- Visibility filtering
- Keyword search
- Nearby post search using PostGIS

### Events

- Create events
- Update and delete owned events
- Event status management
- Search and filtering
- Nearby event search
- RSVP
- Cancel RSVP
- View attendees

### Places

- Create and manage places
- Search places
- Category filtering
- Neighborhood filtering
- Nearby place search

### Service Providers

- Create and manage service providers
- Search providers
- Category filtering
- Neighborhood filtering
- Nearby provider search

### Recommendations

- Add recommendations for places
- Rating support
- Retrieve, update, and delete recommendations

### Lost & Found

- Create lost/found records
- Track item status
- Search and filtering
- Link records to community posts

### Issue Reports

- Create community issue reports
- Categories and statuses
- Keyword filtering
- Neighborhood filtering
- Nearby issue search
- Status update notifications

### Comments

- Create comments
- List comments by post
- Update own comments
- Delete own comments
- Automatic comment notifications

### Reactions

Supported reaction types:

- LIKE
- HELPFUL
- INTERESTING

Includes duplicate-reaction protection and automatic reaction notifications.

### Notifications

- Create notifications
- List personal notifications
- Filter read/unread notifications
- View individual notifications
- Mark notifications as read
- Delete notifications

Automatic notifications are generated for:

- Comments
- Reactions
- Event RSVPs
- Issue status changes
- Moderation status changes

### Moderation

- Report posts or comments
- Moderation case statuses
- Moderator/admin-only case review
- Moderation status notifications

Supported statuses:

- OPEN
- UNDER_REVIEW
- RESOLVED
- REJECTED

### Admin

Admin-only APIs for:

- List users
- Filter users by role
- View individual users
- Change user roles

Supported roles:

- USER
- MODERATOR
- ADMIN

---

## Project Structure

```text
backend/
│
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── admin.py
│   │       ├── auth.py
│   │       ├── comments.py
│   │       ├── events.py
│   │       ├── issue_reports.py
│   │       ├── neighborhoods.py
│   │       ├── notifications.py
│   │       ├── posts.py
│   │       ├── places.py
│   │       ├── reactions.py
│   │       ├── recommendations.py
│   │       ├── service_providers.py
│   │       ├── moderation.py
│   │       └── users.py
│   │
│   ├── core/
│   │   ├── enums.py
│   │   └── security.py
│   │
│   ├── db/
│   │   └── database.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── neighborhood.py
│   │   ├── post.py
│   │   ├── event.py
│   │   ├── place.py
│   │   ├── service_provider.py
│   │   ├── recommendation.py
│   │   ├── lost_found.py
│   │   ├── issue_report.py
│   │   ├── comment.py
│   │   ├── reaction.py
│   │   ├── moderation.py
│   │   ├── notification.py
│   │   └── ...
│   │
│   ├── schemas/
│   │   └── ...
│   │
│   ├── services/
│   │   └── ...
│   │
│   └── main.py
│
├── alembic/
│   └── versions/
│
├── tests/
│   ├── test_health.py
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_admin.py
│   ├── test_posts.py
│   ├── test_comments.py
│   ├── test_reactions.py
│   ├── test_events.py
│   ├── test_issues.py
│   ├── test_moderation.py
│   └── test_notifications.py
│
├── .env
├── .env.example
├── .gitignore
├── alembic.ini
├── pytest.ini
└── README.md