# SESAI Backend

AI-powered student learning assistant backend built with FastAPI, OpenAI, and MySQL.

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Set up MySQL database
mysql -u root -p < setup.sql

# 4. Run the server
uvicorn app.main:app --reload
```

Visit http://localhost:8000/docs for API documentation.

## 📚 Features

- **Google OAuth Authentication** - Secure login with Google accounts
- **OpenAI Integration** - AI-powered summaries, notes, quizzes, and evaluation
- **Google Drive Storage** - Files stored in user's own Drive
- **MySQL Database** - Robust data persistence
- **RESTful API** - Clean, documented endpoints
- **JWT Authentication** - Secure API access

## 📁 Project Structure

```
sesai-backend/
├── app/
│   ├── api/              # API route handlers
│   ├── models/           # SQLAlchemy database models
│   ├── schemas/          # Pydantic validation schemas
│   ├── services/         # Business logic (OpenAI, Drive, etc.)
│   ├── utils/            # Utilities (security, dependencies)
│   ├── config.py         # Configuration settings
│   ├── database.py       # Database connection
│   └── main.py           # FastAPI application
├── requirements.txt      # Python dependencies
├── setup.sql            # MySQL initialization
└── .env.example         # Environment variables template
```

## 🔧 API Endpoints

### Authentication
- `GET /auth/google` - Initiate OAuth flow
- `GET /auth/callback` - OAuth callback
- `GET /auth/me` - Get current user

### Materials
- `POST /api/materials/upload` - Upload file
- `GET /api/materials` - List materials
- `GET /api/materials/{id}` - Get material
- `DELETE /api/materials/{id}` - Delete material

### Smart Notes
- `POST /api/notes/generate/{material_id}` - Generate notes
- `GET /api/notes/{material_id}` - Get notes

### Quiz
- `POST /api/quiz/generate` - Generate quiz
- `POST /api/quiz/submit` - Submit answers
- `GET /api/quiz/history` - Get history

### Analytics
- `GET /api/analytics/stats` - User statistics
- `GET /api/analytics/progress` - Learning progress

## 🔑 Environment Variables

Required variables in `.env`:

```env
# Database
MYSQL_HOST=localhost
MYSQL_USER=sesai_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=sesai

# OpenAI
OPENAI_API_KEY=sk-your-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret

# JWT
SECRET_KEY=your-secret-key
```

## 📖 Documentation

- **Setup Guide**: See SETUP_GUIDE.md for detailed setup instructions
- **API Docs**: http://localhost:8000/docs (when running)
- **Architecture**: See architecture documentation in project root

## 🛠️ Development

```bash
# Install dev dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn app.main:app --reload --port 8000

# Run tests (when implemented)
pytest tests/
```

## 🚢 Deployment

See deployment guide for production setup with:
- Railway / Render (backend hosting)
- MySQL cloud database
- Environment variables configuration
- HTTPS setup

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

Contributions welcome! Please read contributing guidelines.

---

Built with ❤️ using FastAPI, OpenAI, and MySQL
