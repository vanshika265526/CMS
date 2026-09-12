# NgCMS ERP - Intelligent Campus Operating System

A comprehensive, AI-powered College Management System (CMS) built with modern technologies. Unified academics, attendance, exams, finance, library, and communication across student, parent, teacher, and admin portals.

## 🎯 Overview

NgCMS ERP is an integrated platform designed to streamline all operations within an educational institution. It provides role-based access and specialized portals for:

- **Students**: View timetable, assignments, attendance, results, and manage library transactions
- **Parents**: Monitor child's academic progress, attendance, results, and fees
- **Teachers**: Manage marks entry, attendance, create assessments, and communicate with students
- **Admins**: Institutional configuration, user management, and reporting
- **Librarians**: Digital library management and book transactions

## ✨ Key Features

### Academic Management
- **Timetable Management**: Weekly schedules with real-time synchronization
- **Exams & Results**: Mark entry with verification workflow and result publication
- **Marks Management**: Bulk mark entry, editing, and draft system
- **Assessments**: Teachers can create and manage assignments and exams

### Attendance & Monitoring
- Real-time attendance marking with shortage alerts
- Subject-wise and batch-level attendance reporting
- Parent notifications for low attendance

### Communication
- Institution-wide announcements
- Department and batch-specific broadcasting
- Message channels for role-based communication

### Finance & Fees
- Student fee tracking and payment management
- Balance reconciliation
- Financial reporting

### Digital Library
- Book catalog with ISBN management
- Student transactions (issues/returns)
- Penalty tracking and fine management

### Analytics & Reporting
- Student performance analytics
- Attendance trends
- Academic standing reports
- AI-powered early warning system

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 16.2.1 with Turbopack
- **Language**: TypeScript
- **UI Library**: React 18+
- **Styling**: TailwindCSS
- **Icons**: Lucide React
- **State Management**: React Hooks
- **Real-time**: Socket.io
- **PDF Generation**: jsPDF + autoTable

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT
- **Real-time**: Socket.io
- **File Upload**: Cloudinary/Local Storage

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Build Tool**: TypeScript Compiler
- **Development**: Nodemon

## 📁 Project Structure

```
cms_new/
├── apps/
│   └── web-shell/                    # Next.js Frontend
│       ├── src/
│       │   ├── app/                  # Page routes (App Router)
│       │   │   ├── admin/            # Admin portal
│       │   │   ├── teacher/          # Teacher portal
│       │   │   ├── student/          # Student pages
│       │   │   ├── exams/            # Exam & results management
│       │   │   ├── academics/        # Materials & subjects
│       │   │   ├── communication/    # Announcements & messaging
│       │   │   ├── library/          # Digital library
│       │   │   └── layout.tsx        # Root layout with sidebar
│       │   ├── components/           # Reusable React components
│       │   ├── lib/                  # Utilities & API client
│       │   ├── hooks/                # Custom React hooks
│       │   └── constants/            # App constants
│       └── package.json
│
├── backend/                          # Express.js Backend
│   ├── src/
│   │   ├── server.ts                 # Server entry point
│   │   ├── config/                   # Configuration files
│   │   │   ├── db.ts                 # MongoDB connection
│   │   │   ├── socket.ts             # Socket.io setup
│   │   │   └── seed.ts               # Database seeding
│   │   ├── models/                   # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Student.ts
│   │   │   ├── Exam.ts
│   │   │   ├── Marks.ts
│   │   │   ├── Attendance.ts
│   │   │   └── ...
│   │   ├── controllers/              # Route handlers
│   │   ├── routes/                   # API routes
│   │   ├── middleware/               # Express middleware
│   │   ├── services/                 # Business logic
│   │   └── utils/                    # Helper functions
│   ├── dist/                         # Compiled JavaScript
│   └── package.json
│
├── shared/                           # Shared types & constants
├── docker-compose.yml               # Docker configuration (optional)
└── README.md                         # This file
```

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **MongoDB**: v5.0+ (Local or Atlas)
- **Git**: For version control

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/hargunkaur28/CMS.git
cd cms_new
```

2. **Install frontend dependencies**
```bash
cd apps/web-shell
npm install
```

3. **Install backend dependencies**
```bash
cd ../../backend
npm install
```

4. **Configure environment variables**

Create `.env` file in the backend directory:
```env
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/cms_erp

# Server
PORT=5005
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=30d

# Cloudinary (for file uploads)
CLOUD_NAME=your_cloudinary_cloud_name
API_KEY=your_cloudinary_api_key
API_SECRET=your_cloudinary_api_secret

# Session
SESSION_TIMEOUT=30

# Groq AI (Backend only - never expose to frontend)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-70b-8192
```

For frontend, create `.env.local` in `apps/web-shell`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5005/api
```

## 🏃 Running the Project

### Development Mode

**Terminal 1: Start Backend**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5005
```

**Terminal 2: Start Frontend**
```bash
cd apps/web-shell
npm run dev
# Application runs on http://localhost:3001
```

### Production Build

**Backend**
```bash
cd backend
npm run build
npm start
```

**Frontend**
```bash
cd apps/web-shell
npm run build
npm run start
```

## 📚 API Overview

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/change-password` - Change password

### Student Endpoints
- `GET /api/student/profile` - Get student profile
- `GET /api/student/attendance` - View attendance
- `GET /api/student/results` - View exam results
- `GET /api/student/assignments` - View assignments
- `GET /api/student/timetable` - View weekly timetable

### Teacher Endpoints
- `GET /api/teacher/subjects` - List assigned subjects
- `GET /api/teacher/students` - View class students
- `GET /api/teacher/marks/exams` - Get exams for mark entry
- `POST /api/teacher/marks/enter` - Enter single mark
- `POST /api/teacher/marks/bulk` - Bulk mark entry
- `POST /api/teacher/attendance/mark` - Mark attendance

### Admin Endpoints
- `GET /api/admin/students` - Manage students
- `GET /api/admin/faculty` - Manage teachers
- `POST /api/admin/subject/assign` - Assign subjects to teachers
- `GET /api/admin/reports` - Generate reports

## 🗄️ Database Models

### Core Models
- **User**: Authentication and profile
- **Student**: Student information and academic details
- **Faculty**: Teacher information and subject assignments
- **Subject**: Course information and codes
- **Exam**: Assessment scheduling and details
- **Marks**: Student marks and grades
- **Attendance**: Attendance records
- **Result**: Exam results and performance metrics
- **Announcement**: Communication and broadcasts
- **Book**: Digital library catalog
- **Fine**: Library fine management

## 🔐 Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Roles: SUPER_ADMIN, COLLEGE_ADMIN, TEACHER, STUDENT, PARENT, LIBRARIAN
- Session timeout management

## 🔄 Real-time Features

Socket.io integration for:
- Live attendance updates
- Result publication notifications
- Announcement broadcasting
- Chat/messaging

## 📦 Key Dependencies

### Frontend
```json
{
  "next": "16.2.1",
  "react": "^18.0.0",
  "axios": "^1.4.0",
  "socket.io-client": "^4.5.0",
  "jspdf": "^2.5.0"
}
```

### Backend
```json
{
  "express": "^4.18.0",
  "mongoose": "^7.0.0",
  "jsonwebtoken": "^9.0.0",
  "socket.io": "^4.5.0",
  "multer": "^1.4.5-lts.1"
}
```

## 🧪 Testing

Run tests (if configured):
```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd apps/web-shell
npm run test
```

## 🐛 Troubleshooting

### Backend Connection Issues
- Ensure MongoDB is running and connection string is correct
- Check `NODE_ENV` matches your environment
- Verify PORT 5005 is not in use

### Frontend Not Loading
- Clear browser cache (Ctrl+Shift+F5)
- Check backend is running on localhost:5005
- Verify `.env.local` has correct API URL

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📝 Git Workflow

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to repository
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Project Lead**: Hargun Kaur
- **Repository**: [github.com/hargunkaur28/CMS](https://github.com/hargunkaur28/CMS)

## 📞 Support

For issues, questions, or feature requests:
1. Check existing [GitHub Issues](https://github.com/hargunkaur28/CMS/issues)
2. Create a new issue with detailed description
3. Contact the development team

## 🗺️ Roadmap

- [ ] Mobile app for students and parents
- [ ] Advanced analytics dashboard
- [ ] Integration with payment gateways
- [ ] Biometric attendance system
- [ ] Online examination platform
- [ ] AI-powered course recommendations
- [ ] Multi-language support

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Database Schema](./docs/SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

## 🤖 Groq AI Integration

We use Groq API for server-side structured placement extraction.

### Features
- **Strict Zod Validation**: AI extraction output is strongly typed and validated against the Zod schema (`GroqPlacementSchema`).
- **Delimiter-Based Extraction Protection**: Prevents prompt injection by placing the scraped content inside `<scraped_content>` tags and instructing the model to treat it as untrusted.
- **Auto-Normalization & Safe Truncation**: Inputs are normalized and truncated safely at paragraph/sentence/line boundaries if they exceed 15,000 characters.
- **Transient Retry Policy**: Uses an exponential backoff retry system (max 3 attempts) for transient failures (HTTP 429/5xx).
- **Log Privacy**: API keys, credentials, and full request bodies are scrubbed/masked before writing to MongoDB system logs.

### Testing
To run the automated validation suite, execute:
```bash
cd backend
npm run test:groq
```
This runs 6 offline mock scenarios testing edge-cases (missing fields, invalid payloads, transient 429 retries, and prompt injection mitigation).
If `GROQ_API_KEY` is present in `backend/.env`, it will automatically execute a live integration test as well.

---

**Last Updated**: April 7, 2026

**Version**: 1.0.0

**Status**: Active Development ✅
