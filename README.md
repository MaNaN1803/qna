# Municipal QnA Backend

## Overview
This is the backend of a **MERN-based Question-and-Answer Platform** designed for municipal issue resolution. It provides functionalities such as **geolocation-enabled issue tracking, role-based access control, content moderation, voting, and user management.**

## Features
- **User Authentication & Authorization** (Admin, Moderator, User)
- **Geolocation-enabled Questions**
- **Voting System for Questions & Answers**
- **Content Moderation & Report System**
- **Search Functionality**
- **Dashboard for Admins & Moderators**
- **Profile Management**
- **Security Features (JWT, Bcrypt, Role-based Access Control)**

## Tech Stack
- **Node.js**
- **Express.js**
- **MongoDB (Mongoose ODM)**
- **JWT Authentication**
- **Multer (File Uploads)**
- **Cloudinary (Image Storage)**
- **Bcrypt.js (Password Hashing)**

## Installation & Setup

### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

### Clone the Repository
```sh
git clone https://github.com/MaNaN1803/qna.git
cd qna/backend
```

### Install Dependencies
```sh
npm install
```

### Setup Environment Variables
Create a `.env` file in the `backend` directory and add the following:
```sh
MONGO_URI=<your_mongodb_uri>
JWT_SECRET=<your_jwt_secret>
PORT=5000
```

### Run the Server
For development:
```sh
npm run dev
```
For production:
```sh
npm start
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login user and get JWT token |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |

### Questions
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/questions` | Create a question |
| GET | `/api/questions` | Get all questions with filters |
| GET | `/api/questions/:id` | Get question by ID |
| PUT | `/api/questions/:id/status` | Update question status |
| PUT | `/api/questions/:id/vote` | Upvote/downvote a question |

### Answers
| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/answers` | Add an answer |
| GET | `/api/answers/:questionId` | Get answers for a question |
| PUT | `/api/answers/:id/vote` | Upvote/downvote an answer |

### Moderation
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/moderator/review-queue` | Get questions for review |
| GET | `/api/moderator/reported-content` | Get reported content |
| PUT | `/api/moderator/questions/:id/moderate` | Moderate a question |
| PUT | `/api/moderator/reports/:id/moderate` | Handle reports |

### Admin
| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/admin/stats` | Get dashboard stats |
| GET | `/api/admin/users` | Get all users |
| PUT | `/api/admin/users/:id/role` | Update user role |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/reports` | Get reports |
| PUT | `/api/admin/reports/:id` | Handle reports |
| GET | `/api/admin/analytics` | Get analytics data |

## Security Features
- **JWT-based authentication**
- **Role-based access control (RBAC)**
- **Password hashing using Bcrypt**
- **Data validation using Mongoose schema**
- **Error handling middleware**

## Contribution Guidelines
1. Fork the repository
2. Create a new branch (`git checkout -b feature-name`)
3. Commit your changes (`git commit -m 'Added new feature'`)
4. Push to the branch (`git push origin feature-name`)
5. Open a Pull Request

## Contact
For any queries, reach out to [Manan Telrandhe](https://manan18.vercel.app/).

