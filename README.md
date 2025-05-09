# SimpleMeet

A simple video conferencing application with WebRTC and Socket.IO.

## Features

- Real-time audio and video communication
- Screen sharing (with optional audio)
- Camera and microphone controls
- Room creation with optional password protection
- Up to 10 users per room
- No registration required - just enter a username
- Automatic cleanup of unused rooms
- Responsive design for desktop and mobile

## Tech Stack

### Frontend
- React.js (with Vite)
- Zustand for state management
- Tailwind CSS for styling
- WebRTC for real-time communication
- Socket.IO client for signaling

### Backend
- Node.js with Express
- Socket.IO for signaling and room management
- In-memory storage for rooms and users

## Getting Started

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/simplemeet.git
cd simplemeet
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

### Environment Setup

1. Create a `.env` file in the backend directory:
```
PORT=8080
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

2. Create a `.env` file in the frontend directory:
```
VITE_BACKEND_URL=http://localhost:8080
```

### Running the Application

1. Start the backend server
```bash
cd backend
npm run dev
```

2. In a separate terminal, start the frontend development server
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Deployment

### Backend Deployment (Render.com)
1. Push your code to GitHub
2. Create a new Web Service on Render.com
3. Connect your GitHub repository
4. Configure the build command: `npm install`
5. Configure the start command: `node index.js`
6. Add environment variables: `PORT`, `FRONTEND_URL`, `NODE_ENV`

### Frontend Deployment (Netlify)
1. Push your code to GitHub
2. Create a new site on Netlify
3. Connect your GitHub repository
4. Configure the build command: `npm run build`
5. Configure the publish directory: `dist`
6. Add environment variables: `VITE_BACKEND_URL`

## License

MIT 