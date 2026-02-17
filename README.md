# Lavisionario

A web application built with **Next.js** frontend with TypeScript support.

## Project Structure

```
Lavisionario/
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

### Frontend Setup (Next.js)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:3000`.

## Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm start` - Start the production server
- `npm run lint` - Run ESLint and check code quality

## Technology Stack

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

### Frontend (.env.local)
- Configure environment variables as needed for your application

## Features

### Frontend (Next.js)
- **Modern UI Framework** - React 19 with concurrent features
- **TypeScript Support** - Full type safety for development
- **Responsive Design** - Tailwind CSS for responsive layouts
- **Authentication Pages** - Login, register, and password reset flows
- **Layout Components** - Reusable Navbar and Sidebar components
- **UI Components** - Modular components (Modal, Cards, Feedback)
- **Custom Hooks** - Reusable React logic
- **Optimized Performance** - React Compiler for automatic optimization

## Deployment

### Frontend
- Deploy to Vercel (recommended for Next.js), Netlify, or similar platforms
- Set environment variables on the hosting platform

## Project Standards

- **Code Style** - ESLint enforces consistent code quality
- **Type Safety** - TypeScript for better development experience
- **File Organization** - Component-based structure with features and utilities
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
