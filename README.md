# Resume Builder - Setup Instructions

## Quick Start

### 1. Install Node.js
- Download from https://nodejs.org (get LTS version)
- Install and restart your terminal

### 2. Setup Backend
```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Start the server
npm start
```

The backend will run on http://localhost:3001

### 3. Open Frontend
- Open `index.html` in your browser
- Or use a live server extension in VS Code

## API Endpoints

The frontend is already configured to connect to these endpoints:

- **Auth**: `POST /api/auth/login` - Get authentication token
- **Resume**: `GET/POST /api/resume` - Load/save resume data
- **Upload**: `POST /api/upload/photo` - Upload profile photos
- **AI**: `POST /api/ai/generate` - Generate AI resumes
- **PDF**: `POST /api/pdf/export` - Export to PDF

## Features

- ✅ Real-time preview
- ✅ Multiple templates (Modern, Classic, Creative)
- ✅ Photo upload with auto-resize
- ✅ AI-powered resume generation
- ✅ PDF export
- ✅ Auto-save to database
- ✅ Drag & drop interface

## Troubleshooting

If the frontend shows "Backend offline", ensure:
1. Node.js is installed
2. Backend server is running on port 3001
3. No firewall blocking the connection
