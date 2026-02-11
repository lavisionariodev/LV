# Lavisionario

A full-stack web application built with **Express.js** backend and **Next.js** frontend with TypeScript support.

## Project Structure

```
Lavisionario/
├── backend/                  # Express.js server (Node.js)
│   ├── src/
│   │   ├── app.js           # Express app configuration
│   │   ├── server.js        # Server entry point
│   │   ├── middlewares/     # Custom middleware
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Authentication module
│   │   │   └── users/       # User management module
│   │   └── utils/           # Utility functions
│   ├── package.json
│   ├── package-lock.json
│   └── .env                 # Environment variables
│
├── frontend/                # Next.js application (React)
│   ├── src/
│   │   ├── app/             # App router (Next.js 13+)
│   │   │   ├── (public)/    # Public pages layout group
│   │   │   │   ├── layout.jsx
│   │   │   │   ├── page.jsx
│   │   │   │   ├── about/
│   │   │   │   │   ├── page.jsx
│   │   │   │   │   └── about.module.css
│   │   │   │   └── home/
│   │   │   │       └── index.js
│   │   │   ├── (auth)/      # Auth layout group
│   │   │   │   ├── administrator/
│   │   │   │   │   ├── login/
│   │   │   │   │   │   ├── page.jsx
│   │   │   │   │   │   └── login.module.css
│   │   │   │   ├── buyer/
│   │   │   │   │   ├── layout.jsx
│   │   │   │   │   ├── login/
│   │   │   │   │   │   ├── page.jsx
│   │   │   │   │   │   └── login.module.css
│   │   │   │   │   ├── signup/
│   │   │   │   │   │   ├── page.jsx
│   │   │   │   │   │   └── signup.module.css
│   │   │   │   │   ├── forgot-password/
│   │   │   │   │   │   ├── page.jsx
│   │   │   │   │   │   └── forgot-password.module.css
│   │   │   │   │   └── reset-password/
│   │   │   │   │       ├── page.jsx
│   │   │   │   │       └── reset-password.module.css
│   │   │   │   └── seller/
│   │   │   │       ├── layout.jsx
│   │   │   │       ├── login/
│   │   │   │       │   ├── page.jsx
│   │   │   │       │   └── login.module.css
│   │   │   │       └── signup/
│   │   │   │           ├── page.jsx
│   │   │   │           └── signup.module.css
│   │   │   ├── admin/       # Admin dashboard
│   │   │   │   ├── layout.jsx
│   │   │   │   ├── page.jsx
│   │   │   │   ├── admin.module.css
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.jsx
│   │   │   │   │   └── users.module.css
│   │   │   │   ├── sellers/
│   │   │   │   │   ├── page.jsx
│   │   │   │   │   └── sellers.module.css
│   │   │   │   ├── packages/
│   │   │   │   │   ├── page.jsx
│   │   │   │   │   └── packages.module.css
│   │   │   │   ├── content/
│   │   │   │   │   ├── page.jsx
│   │   │   │   │   └── content.module.css
│   │   │   │   └── settings/
│   │   │   │       ├── page.jsx
│   │   │   │       └── settings.module.css
│   │   │   ├── api/         # API routes
│   │   │   │   ├── auth/
│   │   │   │   └── seller/
│   │   │   ├── layout.jsx   # Root layout
│   │   │   └── globals.css  # Global styles (Tailwind)
│   │   ├── components/      # Reusable components
│   │   │   ├── feedback/    # Feedback components
│   │   │   │   ├── index.js
│   │   │   │   ├── Alert/
│   │   │   │   │   └── Alert.jsx
│   │   │   │   └── Toast/
│   │   │   │       └── Toast.jsx
│   │   │   ├── layout/      # Layout components
│   │   │   │   ├── index.js
│   │   │   │   ├── AdminSidebar/
│   │   │   │   │   ├── AdminSidebar.jsx
│   │   │   │   │   └── AdminSidebar.module.css
│   │   │   │   ├── AdminTopbar/
│   │   │   │   │   ├── AdminTopbar.jsx
│   │   │   │   │   └── AdminTopbar.module.css
│   │   │   │   ├── PublicNavbar/
│   │   │   │   │   ├── PublicNavbar.jsx
│   │   │   │   │   └── PublicNavbar.module.css
│   │   │   │   └── PublicFooter/
│   │   │   │       ├── PublicFooter.jsx
│   │   │   │       └── PublicFooter.module.css
│   │   │   └── ui/          # UI components
│   │   │       ├── index.js
│   │   │       └── Modal/
│   │   │           └── Modal.jsx
│   │   ├── features/        # Redux features
│   │   │   └── auth/
│   │   │       ├── authSlice.js
│   │   │       └── authService.js
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Library functions
│   │   │   ├── auth/
│   │   │   │   ├── guards.js
│   │   │   │   ├── session.js
│   │   │   │   └── tokens.js
│   │   │   └── validators/
│   │   │       └── authSchemas.js
│   │   └── services/        # API services
│   ├── public/              # Static assets
│   ├── package.json
│   ├── package-lock.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.mjs   # Tailwind CSS config
│   ├── eslint.config.mjs    # ESLint configuration
│   ├── next-env.d.ts
│   └── .next/               # Build output (auto-generated)
│
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

## Getting Started

### Backend Setup (Express.js)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create/configure a `.env` file in the backend directory with required environment variables:
   ```
   PORT=5000
   NODE_ENV=development
   ```

4. Start the server:
   ```bash
   npm start
   # or for development with auto-reload (requires nodemon)
   npm run dev
   ```

The backend server will run on `http://localhost:5000` (or your configured port).

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the frontend directory (optional, for API integration):
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`.

## Development

### Available Scripts

**Backend:**
- `npm start` - Start the production server
- `npm run dev` - Start the development server with auto-reload (if nodemon is installed)

**Frontend:**
- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint and check code quality

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Environment Management** - dotenv for configuration

### Frontend
- **Next.js** 16.1.2 - React framework with App Router
- **React** 19.2.3 - UI library
- **React DOM** 19.2.3 - React DOM rendering
- **TypeScript** 5 - Type safety
- **Tailwind CSS** 4 - Utility-first CSS framework
- **ESLint** 9 - Code quality and linting
- **React Compiler** - Babel plugin for optimized React code

### Package Manager
- **npm** - Node.js package manager

## Environment Variables

### Backend (.env)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment mode (development/production)

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API base URL (optional, for API integration)

## Features

### Frontend (Next.js)
- **Modern UI Framework** - React 19 with concurrent features
- **TypeScript Support** - Full type safety for development
- **Responsive Design** - Tailwind CSS for responsive layouts
- **Authentication Pages** - Login, register, and password reset flows
- **Layout Components** - Reusable Navbar and Sidebar components
- **UI Components** - Modular components (Modal, Cards, Feedback)
- **Custom Hooks** - Reusable React logic
- **API Integration** - Services layer for backend communication
- **Optimized Performance** - React Compiler for automatic optimization

### Backend (Express.js)
- **Modular Architecture** - Feature-based module organization (auth, users)
- **Middleware Support** - Custom middleware for request processing
- **RESTful API** - Express.js for building REST endpoints
- **Environment Configuration** - Environment-based configuration
- **Utility Functions** - Shared utility functions

## API Integration

The frontend communicates with the backend through the `NEXT_PUBLIC_API_URL` environment variable. Create API service files in the `src/services/` directory to handle requests to backend endpoints.

### Setup Steps
1. Ensure both backend and frontend servers are running
2. Verify `NEXT_PUBLIC_API_URL` in frontend `.env.local` points to backend URL
3. Create service files in `frontend/src/services/` for API calls
4. Use services in components or hooks for data fetching

## Running Both Servers

### Terminal 1 - Backend
```bash
cd backend
npm install
npm start
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` for the frontend and `http://localhost:5000` for the backend API.

## Deployment

### Backend
- Deploy to Heroku, Railway, Render, or any Node.js hosting platform
- Set environment variables on the hosting platform
- Update frontend `NEXT_PUBLIC_API_URL` to point to production backend URL

### Frontend
- Deploy to Vercel (recommended for Next.js), Netlify, or similar platforms
- Set environment variables on the hosting platform
- Update `NEXT_PUBLIC_API_URL` for production environment

## Project Standards

- **Code Style** - ESLint enforces consistent code quality
- **Type Safety** - TypeScript in frontend for better development experience
- **File Organization** - Feature-based module structure in backend, component-based in frontend
- **Naming Conventions** - Use meaningful names for files, components, and functions

## Contributing

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Make your changes and ensure code passes linting
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request with a clear description of changes

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or questions, please create an issue in the repository or contact the development team.
