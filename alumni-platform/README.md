# AlumniConnect — Intelligent Platform to Interconnect Alumni & Students

A full-stack web application that bridges the gap between alumni and students through AI-powered mentorship matching, career guidance, interview practice, job referrals, and community learning.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| Backend | Node.js · Express.js · TypeScript |
| Auth | Firebase Authentication (Google + Email/Password) |
| Database | Firebase Firestore + Firebase Realtime Database |
| AI | Groq API (free tier) |
| Deployment | Vercel (frontend) + Render/Railway (backend) |

---

## Features

- 🔐 **Authentication** — Email/password and Google sign-in with role-based access (Student / Alumni / Admin)
- 🤝 **AI Mentor Matching** — Groq-powered recommendations to pair students with the best alumni mentors
- 💬 **Career Chatbot** — Multi-turn AI chatbot for 24/7 career guidance
- 🎯 **Interview Practice** — AI-generated questions with evaluation, scoring, and model answers
- 💼 **Job Board** — Alumni post jobs, internships, and referrals; students apply
- 🗣️ **Discussion Forum** — Community Q&A with answers, upvotes, and tags
- 💬 **Real-time Chat** — Firebase Realtime Database-powered 1-on-1 messaging
- 📊 **Dashboard** — Analytics with Chart.js (user growth, distribution)
- 🗺️ **Skill Roadmaps** — AI-generated personalized learning paths
- 📄 **Resume Review** — AI ATS scoring with strengths and improvement suggestions
- 🔍 **Skill Gap Analysis** — AI identifies gaps and prioritises your learning path
- 🛡️ **Admin Panel** — User management, content moderation, platform statistics

---

## Project Structure

```
alumni-platform/
├── backend/                  # Node.js + Express API
│   ├── src/
│   │   ├── config/firebase.ts
│   │   ├── middleware/auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── mentors.ts
│   │   │   ├── discussions.ts
│   │   │   ├── jobs.ts
│   │   │   ├── chat.ts
│   │   │   └── ai.ts
│   │   └── index.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── frontend/                 # React + Vite app
    ├── src/
    │   ├── components/common/
    │   ├── context/AuthContext.tsx
    │   ├── pages/
    │   ├── services/api.ts
    │   ├── types/index.ts
    │   ├── config/firebase.ts
    │   └── App.tsx
    ├── .env.example
    ├── package.json
    └── vite.config.ts
```

---

## Prerequisites

- Node.js 18+
- npm or yarn
- A [Firebase project](https://console.firebase.google.com/) (free tier works)
- A [Groq API key](https://console.groq.com) (free tier works)

---

## Firebase Setup

### 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** and follow the steps
3. Disable Google Analytics if prompted (optional)

### 2. Enable Authentication
1. In the Firebase console → **Authentication → Sign-in method**
2. Enable **Email/Password**
3. Enable **Google**

### 3. Create Firestore Database
1. **Firestore Database → Create database**
2. Start in **production mode**
3. Choose any region closest to your users

#### Recommended Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /discussions/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.authorId;
    }
    match /jobs/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.postedBy;
    }
    match /mentorships/{id} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 4. Enable Realtime Database
1. **Realtime Database → Create database**
2. Start in **test mode** (update rules before production)
3. Choose any region

#### Realtime Database Rules:
```json
{
  "rules": {
    "chats": {
      "$chatRoomId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

### 5. Generate Service Account (for backend)
1. **Project Settings → Service accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. Use its values in your backend `.env`

### 6. Get Web App Config (for frontend)
1. **Project Settings → Your apps → Add app → Web**
2. Register the app
3. Copy the firebaseConfig object values to your frontend `.env`

---

## Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values:
```
PORT=5000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
GROQ_API_KEY=your_groq_api_key_here
FRONTEND_URL=http://localhost:5173
```

**Start the backend:**
```bash
npm run dev       # development with hot reload
npm run build     # compile TypeScript
npm start         # run compiled output
```

The backend runs on `http://localhost:5000`

---

## Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` with your Firebase web config values:
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_API_URL=http://localhost:5000/api
```

**Start the frontend:**
```bash
npm run dev       # development server on http://localhost:5173
npm run build     # production build
npm run preview   # preview production build
```

---

## Setting Admin Role

To grant a user admin access, call the Firebase Admin SDK to set custom claims:

```javascript
// Run this script once from your backend
const { auth } = require('./src/config/firebase');
await auth.setCustomUserClaims('USER_UID_HERE', { role: 'admin' });
```

Or add a temporary admin-setup route in `backend/src/routes/auth.ts` and call it once.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/login` | Login (verify token) |
| `GET` | `/api/users` | List all users |
| `GET` | `/api/users/:uid` | Get user profile |
| `PUT` | `/api/users/:uid` | Update user profile |
| `DELETE` | `/api/users/:uid` | Delete user (admin) |
| `GET` | `/api/users/stats` | Platform statistics |
| `GET` | `/api/mentors` | Get alumni mentors |
| `POST` | `/api/mentors/request` | Request mentorship |
| `GET` | `/api/discussion` | Get all discussions |
| `POST` | `/api/discussion` | Create discussion |
| `POST` | `/api/discussion/:id/answer` | Add answer |
| `POST` | `/api/discussion/:id/upvote` | Toggle upvote |
| `DELETE` | `/api/discussion/:id` | Delete discussion |
| `GET` | `/api/jobs` | Get all jobs |
| `POST` | `/api/jobs` | Post a job |
| `DELETE` | `/api/jobs/:id` | Delete job post |
| `GET` | `/api/chat/conversations` | Get conversations |
| `POST` | `/api/chat/send` | Send a message |
| `POST` | `/api/ai/career-guidance` | AI career chatbot |
| `POST` | `/api/ai/interview` | AI interview practice |
| `POST` | `/api/ai/mentor-recommend` | AI mentor matching |
| `POST` | `/api/ai/skill-roadmap` | Generate skill roadmap |
| `POST` | `/api/ai/resume-review` | AI resume review |
| `POST` | `/api/ai/skill-gap` | AI skill gap analysis |

---

## Deployment

### Frontend → Vercel

1. Push code to GitHub
2. Connect the repo on [vercel.com](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Add all `VITE_*` environment variables in Vercel dashboard
5. Deploy

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com)
2. Connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Set **Build Command** to `npm install && npm run build`
5. Set **Start Command** to `npm start`
6. Add all environment variables in Render dashboard
7. Deploy

After deploying the backend, update `VITE_API_URL` in your Vercel frontend environment to point to your Render URL.

---

## License

MIT
