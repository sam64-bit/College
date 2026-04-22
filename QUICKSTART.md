# CampusConnect - Quick Start Guide

## Setup Steps

### 1. Create Admin User

Ensure your `.env` has MongoDB config:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=campusconnect
JWT_SECRET=campusconnect_super_secret_jwt_key_2024
PORT=3000
```

Then run:

```bash
node seed.js
```

This creates an admin account (if missing):
- Email: `admin@campus.edu`
- Password: `admin123`

### 2. Start the Server

```bash
npm start
```

The server will start on http://localhost:3000

### 3. Login as Admin

1. Open http://localhost:3000
2. Login with admin credentials
3. You'll be redirected to the admin dashboard

### 4. Create Test Users

#### Option A: Register via UI
1. Go to http://localhost:3000/register
2. Create a student account
3. Create an alumni account
4. Login as admin and approve both accounts

#### Option B: Insert via MongoDB shell
```javascript
use campusconnect

db.users.insertMany([
  {
    email: 'student@test.com',
    password_hash: '$2b$10$hjwmyo4lchxN3Ru7oRGvw.I4n1kXEadw4V49DpESAL0FVOaclzsGy', // student123
    name: 'Test Student',
    role: 'student',
    status: 'approved',
    branch: 'Computer Science',
    batch_year: 2024,
    career_interests: 'Software Development, AI/ML',
    looking_for_guidance: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    email: 'alumni@test.com',
    password_hash: '$2b$10$hjwmyo4lchxN3Ru7oRGvw.I4n1kXEadw4V49DpESAL0FVOaclzsGy', // alumni123
    name: 'Test Alumni',
    role: 'alumni',
    status: 'approved',
    branch: 'Computer Science',
    batch_year: 2020,
    company: 'Google',
    job_role: 'Software Engineer',
    open_for_referral: true,
    open_for_guidance: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
])
```

## Testing the Platform

### As Admin
- Approve/reject user registrations
- View platform statistics
- Manage all users
- Post announcements
- Convert student batches to alumni

### As Student
- View connection suggestions
- Send connection requests
- Browse opportunities
- Apply to opportunities
- Chat with connections
- Post on community feed

### As Alumni
- Post job opportunities and referrals
- Accept connection requests from students
- Review applications
- Provide mentorship through chat
- Share career insights on feed

## Key Features to Test

1. **Smart Connections**: The system suggests connections based on:
   - Same branch (+30 points)
   - Common skills (+25 points)
   - Similar interests (+25 points)
   - Mutual connections (+20 points)

2. **Opportunity Board**:
   - Alumni post opportunities
   - Students apply with resumes
   - Track application status

3. **Real-time Chat**:
   - Only between connected users
   - Live message delivery
   - Online status indicators

4. **Community Feed**:
   - Create posts
   - Like posts
   - Admin announcements

## Default Ports

- Server: http://localhost:3000
- Socket.io: Connected to same port

## Troubleshooting

### Port Already in Use
```bash
# Kill existing process
pkill -f "node server.js"
# Or change port in .env
PORT=3001
```

### Database Connection Error
- Check MONGODB_URI in .env
- Verify MongoDB server is running
- Check database name in MONGODB_DB_NAME

### Admin Can't Login
- Run `node seed.js` again
- Check user status is 'approved' in database

## Next Steps

1. Customize the branding and colors in `/public/css/style.css`
2. Add your own opportunity types
3. Customize the suggestion algorithm weights
4. Add email notifications (integrate with email service)
5. Add resume upload functionality (integrate with Cloudinary)

## Support

For issues or questions, check:
- README.md for full documentation
- Server logs for error messages
- Browser console for frontend errors
