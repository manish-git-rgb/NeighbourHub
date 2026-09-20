# NeighborHub Frontend

The frontend application for **NeighborHub**, a hyperlocal community platform that helps users discover and interact with their local communities.

Built with **Next.js, React, TypeScript, and Tailwind CSS**, the frontend communicates with the NeighborHub FastAPI backend through REST APIs.

---

## 🚀 Features

### 🔐 Authentication
- User registration
- User login
- JWT access token handling
- Refresh token handling
- Automatic token refresh on expired access tokens
- Logout
- Protected application pages

### 🏠 Dashboard
- User information
- Account details
- Role information
- Quick access to major NeighborHub features

### 📝 Posts
- Create posts
- View community posts
- Search posts
- Filter by category
- Nearby posts
- Post details
- Comments
- Reactions

### 💬 Comments & Reactions
- Add comments
- Edit own comments
- Delete own comments
- React to posts
- View post reactions

### 📅 Events
- Create events
- Search events
- Filter events
- Date filtering
- Nearby events
- RSVP to events
- Cancel RSVP
- View attendees

### 📍 Places
- Browse local places
- Search by keyword
- Filter by category
- Filter by neighborhood
- Nearby places
- Add places

### 🛠️ Services
- Browse local service providers
- Search services
- Filter by category
- Filter by neighborhood
- Nearby services
- Add service providers

### ⭐ Recommendations
- Search recommendations by place
- Add recommendations
- Add ratings from 1–5
- Edit recommendations
- Delete recommendations
- Pagination

### 🔎 Lost & Found
- View lost and found posts
- Create listings
- Search listings
- Filter by LOST / FOUND
- Filter by status
- Edit listings
- Delete listings
- Pagination

### 🚨 Issues
- Report community issues
- Search issues
- Filter by category
- Filter by status
- Filter by neighborhood
- Nearby issues
- Edit and delete issues
- Pagination

### 🔔 Notifications
- View notifications
- Filter by read/unread status
- Mark notifications as read
- Delete notifications
- Unread notification count

### 🛡️ Moderation
- Report posts/comments
- View moderation cases
- Filter moderation cases by status
- View case details
- Update moderation case status
- Role-based access for moderators and administrators

### 👑 Administration
Admin users can:

- View users
- Filter users by role
- View user details
- Change user roles

Supported roles:

```text
USER
MODERATOR
ADMIN