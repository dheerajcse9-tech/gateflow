# 🚀 GateFlow

GateFlow is a comprehensive GATE preparation platform designed to provide aspirants with a seamless, organized, and efficient learning experience. The platform brings together high-quality study resources, subject-wise preparation, progress tracking, AI-powered assistance, and a modern dashboard into a single application. Its goal is to eliminate the need for multiple learning platforms by offering everything required for effective GATE preparation in one place.

Built with **Next.js**, **React**, **MongoDB Atlas**, **Cloudinary**, and **Google OAuth**, GateFlow delivers a fast, secure, and scalable web application with a responsive user interface that works smoothly across desktops, tablets, and mobile devices. The platform enables users to securely sign in using Google, manage their profiles, upload media, monitor learning progress, and access structured educational content with ease.

## ✨ Features

- 🔐 Secure Google Authentication
- 👤 User Profile Management
- 📚 Subject-wise Learning Resources
- 📈 Progress Tracking Dashboard
- 🤖 AI-powered Learning Assistance
- 📱 Fully Responsive Design
- ⚡ Fast Performance with Next.js
- 🎨 Modern UI built using Tailwind CSS & Radix UI
- 🔄 Real-time Data Fetching with React Query

## 🛠️ Tech Stack

### Frontend
- Next.js 14
- React 18
- Tailwind CSS
- Radix UI
- Framer Motion
- React Query
- React Hook Form

### Backend
- Next.js API Routes
- Google OAuth
- Cloudinary API

### Database
- MongoDB Atlas

### Deployment
- Vercel

## 📂 Project Structure

```
GateFlow
│
├── app/
│   ├── admin/
│   ├── api/
│   ├── dashboard/
│   ├── profile/
│   ├── login/
│   └── ...
│
├── components/
├── hooks/
├── lib/
├── public/
├── scripts/
├── styles/
├── next.config.js
├── package.json
└── README.md
```

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/your-username/GateFlow.git
```

Navigate to the project directory:

```bash
cd GateFlow
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the root directory and configure the following environment variables:

```env
MONGO_URL=your_mongodb_connection_string
DB_NAME=your_database_name

NEXT_PUBLIC_BASE_URL=http://localhost:3000

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

CORS_ORIGINS=*
```

Start the development server:

```bash
npm run dev
```

Open your browser and visit:

```
http://localhost:3000
```

## 🚀 Deployment

The application is deployed on **Vercel** with **MongoDB Atlas** as the cloud database.

Deployment Steps:

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Configure the required environment variables.
4. Deploy the application.
5. Configure Google OAuth credentials.
6. Connect MongoDB Atlas.
7. Access the live application.

## 🌟 Future Enhancements

- Full-length Mock Tests
- Previous Year Question Practice
- AI-based Question Generation
- Daily Coding & GATE Challenges
- Leaderboards
- Community Discussion Forum
- Personalized Learning Recommendations
- Performance Analytics
- Bookmark & Notes System
- Admin Analytics Dashboard

## 🤝 Contributing

Contributions are welcome! Feel free to fork the repository, create a new feature branch, and submit a pull request for improvements or bug fixes.

## 📄 License

This project is licensed under the **MIT License**.

## 👨‍💻 Developer

**Dheeraj Mandula**

If you found this project helpful, consider giving it a ⭐ on GitHub.
