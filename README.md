# 🏘️ NeighborHub

> A full-stack hyperlocal community platform that connects people with their nearby neighborhoods, events, places, services, recommendations, alerts, and community activities.

NeighborHub is designed to make local communities more connected by providing a single platform where users can discover nearby information, share posts, participate in events, find local services, report issues, and interact with other residents.

---

## ✨ Features

### 🔐 Authentication & User Management
- User registration and login
- JWT-based authentication
- Access and refresh tokens
- Secure password hashing with Argon2
- User profile management
- Profile image and bio
- Neighborhood membership
- Role-based access control

### 📝 Community Posts
- Create and view community posts
- Post categories:
  - Discussion
  - Recommendation
  - Event
  - Service
  - Lost & Found
  - Issue
  - Alert
- Public and neighborhood visibility
- Search and filtering
- Nearby post discovery using location
- Post details page
- Comments and reactions

### 💬 Comments & Reactions
- Add comments to posts
- Edit/delete own comments
- React to posts
- Supported reactions:
  - LIKE
  - HELPFUL
  - INTERESTING
- Automatic notifications for relevant interactions

### 📅 Events
- Create community events
- Search and filter events
- Date and status filtering
- Nearby event discovery
- RSVP to events
- Cancel RSVP
- View event attendees

### 📍 Places
- Discover local places
- Search by keyword and category
- Filter by neighborhood
- Nearby place discovery
- Location-based search

### 🛠️ Local Services
- Discover local service providers
- Search by category and keyword
- Neighborhood filtering
- Nearby service discovery
- Add local service providers

### ⭐ Recommendations
- Recommend places
- Add ratings from 1–5
- Add recommendation content
- Edit/delete own recommendations
- Paginated recommendations

### 🔎 Lost & Found
- Report lost items
- Report found items
- Search and filter listings
- Status management
- Edit/delete listings
- Pagination

### 🚨 Community Issues
- Report neighborhood issues
- Issue categories and statuses
- Search and filtering
- Nearby issue discovery
- Edit/delete permissions
- Location-based reporting

### 🔔 Notifications
- User notifications
- Read/unread filtering
- Mark notifications as read
- Delete notifications
- Automatic notifications for selected community actions

### 🛡️ Moderation
- Report posts/comments
- Moderation queue
- Case status management
- Moderator/Admin access control
- Moderation details view

### 👑 Admin
- View users
- Search/filter users by role
- View individual users
- Change user roles
- Supported roles:
  - USER
  - MODERATOR
  - ADMIN

### 🗺️ Interactive Map
- OpenStreetMap integration
- Current location detection
- Search radius
- Nearby:
  - Posts
  - Events
  - Places
  - Services
- Interactive markers
- Popup information
- Radius options:
  - 1 km
  - 5 km
  - 10 km
  - 25 km
  - 50 km

---

## 🏗️ Architecture

```text
┌─────────────────────────────┐
│        Next.js Frontend     │
│        React + TypeScript   │
└──────────────┬──────────────┘
               │
               │ REST API
               ▼
┌─────────────────────────────┐
│        FastAPI Backend      │
│     Authentication / APIs   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│     PostgreSQL + PostGIS    │
│      Spatial Data Storage   │
└─────────────────────────────┘