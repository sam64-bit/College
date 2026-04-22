# CampusConnect

Institutional Professional Networking & Mentorship Platform

## Features

- **Role-based Authentication**: Student, Alumni, and Admin roles
- **Smart Connection Suggestions**: AI-powered matching algorithm based on:
  - Same branch (+30 points)
  - Common skills (+25 points)
  - Similar career interests (+25 points)
  - Mutual connections (+20 points)
- **Opportunity Board**: Alumni can post internships, jobs, referrals, and projects
- **Application System**: Students can apply to opportunities and track status
- **Real-time Chat**: Socket.io powered messaging between connections
- **Community Feed**: Posts, likes, and announcements
- **Admin Panel**: User approval, management, and batch conversion

## Tech Stack

- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: JWT, bcrypt

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=campusconnect
JWT_SECRET=your_jwt_secret
PORT=3000
```

3. Seed default admin user:
```bash
node seed.js
```

4. Start the server:
```bash
npm start
```

5. Visit http://localhost:3000

## Default Admin Account

- Email: admin@campus.edu
- Password: admin123
(Created via `node seed.js`)

## Project Structure

```
campusconnect/
├── config/
│   └── database.js           # MongoDB connection and helpers
├── middleware/
│   └── auth.js               # JWT authentication middleware
├── controllers/
│   ├── authController.js     # Authentication logic
│   ├── connectionController.js # Connection management
│   ├── opportunityController.js # Job/internship board
│   ├── messageController.js  # Chat functionality
│   ├── feedController.js     # Posts and announcements
│   └── adminController.js    # Admin operations
├── routes/
│   ├── authRoutes.js
│   ├── connectionRoutes.js
│   ├── opportunityRoutes.js
│   ├── messageRoutes.js
│   ├── feedRoutes.js
│   └── adminRoutes.js
├── public/
│   ├── css/
│   │   └── style.css         # Global styles
│   ├── js/
│   │   └── common.js         # Shared JavaScript utilities
│   ├── login.html
│   ├── register.html
│   ├── dashboard-student.html
│   ├── dashboard-alumni.html
│   ├── admin.html
│   ├── connections.html
│   ├── opportunities.html
│   ├── chat.html
│   ├── feed.html
│   └── profile.html
└── server.js                 # Express + Socket.io server

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login
- GET /api/auth/profile - Get user profile
- PUT /api/auth/profile - Update profile

### Connections
- GET /api/connections/suggestions - Get smart suggestions
- POST /api/connections/request - Send connection request
- GET /api/connections/requests - Get pending requests
- POST /api/connections/respond - Accept/reject request
- GET /api/connections/list - Get all connections
- GET /api/connections/search - Search users

### Opportunities
- POST /api/opportunities/create - Create opportunity (alumni)
- GET /api/opportunities/list - Get all opportunities
- GET /api/opportunities/:id - Get opportunity details
- POST /api/opportunities/:id/apply - Apply to opportunity
- GET /api/opportunities/:id/applications - View applications
- PUT /api/opportunities/application/:id - Update application status

### Messages
- POST /api/messages/send - Send message
- GET /api/messages/conversations - Get all conversations
- GET /api/messages/conversation/:userId - Get specific conversation
- PUT /api/messages/read/:senderId - Mark messages as read

### Feed
- POST /api/feed/posts - Create post
- GET /api/feed/posts - Get all posts
- POST /api/feed/posts/:id/like - Toggle like
- GET /api/feed/announcements - Get announcements
- POST /api/feed/announcements - Create announcement (admin)

### Admin
- GET /api/admin/pending-users - Get pending approvals
- POST /api/admin/approve/:userId - Approve user
- POST /api/admin/reject/:userId - Reject user
- POST /api/admin/block/:userId - Block user
- GET /api/admin/users - Get all users
- POST /api/admin/convert-students - Convert batch to alumni
- GET /api/admin/stats - Get platform statistics

## Database Collections

- **users**: Core user collection with role-based fields
- **connection_requests**: Connection management
- **messages**: Chat messages
- **opportunities**: Job/internship postings
- **applications**: Student applications
- **posts**: Community feed posts
- **announcements**: Admin announcements

## Key Features Implementation

### Smart Suggestion Algorithm
The connection suggestion system scores users based on:
- Branch match: +30 points
- Skill overlap: +25 points
- Career interest alignment: +25 points
- Mutual connections: +20 points

Returns top 10 suggestions sorted by score.

### Real-time Chat
Socket.io integration provides:
- Live message delivery
- Online/offline status
- Typing indicators
- Instant notifications

### Admin Controls
- Approve/reject new registrations
- Block/unblock users
- Batch conversion of students to alumni
- User management and deletion
- CSV export of user data
- Platform-wide announcements

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Connection-based messaging (can only message connections)
- Role-based access control
- Protected admin routes

## License

MIT
