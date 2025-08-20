# Overview

This is a MEGA File Manager API system that provides a RESTful interface for interacting with MEGA cloud storage. The application is built as a full-stack solution with a React frontend and Express.js backend, integrated with MEGA's cloud storage services for file operations including upload, download, management, and search capabilities.

The system features a modern web interface for file management, API key generation for programmatic access, user authentication via Replit's OAuth system, and administrative controls for managing MEGA credentials and system configuration.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## Project Migration to Replit Environment (August 20, 2025)
- **COMPLETED**: Migrated from Replit Agent environment to standard Replit environment
- **COMPLETED**: Configured PostgreSQL database for persistent data storage
- **COMPLETED**: Fixed session management to use memory store for development environment  
- **COMPLETED**: Resolved registration redirect issue by improving authentication flow
- **COMPLETED**: Fixed TypeScript compatibility issues in storage implementation
- **COMPLETED**: Fixed plan-based storage display issues:
  - Corrected plan storage limits (Basic: 2GB, Pro: 5GB, Premium: 10GB)
  - Fixed file upload component to show plan-specific size limits
  - Fixed storage quota to display user's actual plan information
  - Resolved string vs numeric sorting issue in plan ordering
- **COMPLETED**: Database persistence and admin access:
  - Switched from in-memory to PostgreSQL for persistent data
  - Created default admin user (admin@megafilemanager.com / admin123)
  - Test user (pedro17pedroo@gmail.com) granted admin privileges for MEGA configuration
- **COMPLETED**: Database migration and auto-initialization system (August 19, 2025):
  - Configured automatic PostgreSQL database connection on startup
  - Implemented automatic schema migration using `npm run db:push`
  - Added database initialization function with automatic seed data creation
  - All data now persistently stored in PostgreSQL - no memory storage
  - System automatically creates plans and admin user on first startup
  - Database initialization runs automatically when application starts
- **COMPLETED**: Scalable admin interface redesign (August 19, 2025):
  - Replaced horizontal tab navigation with vertical sidebar navigation
  - Organized admin functions into logical categories (Overview, User Management, Financial System, Development & API, Infrastructure, Audit & Security)
  - Improved scalability for adding new admin features
  - Enhanced UI with better visual hierarchy and descriptions
- **COMPLETED**: Admin Profile Management & Logout (August 20, 2025):
  - Added user profile section to admin sidebar header with avatar and user information
  - Implemented dropdown menu with profile management and logout options
  - Added complete profile management page showing admin user details
  - Integrated proper authentication hooks and logout functionality
  - Enhanced admin interface with professional user experience
- Application successfully running on port 5000 with full functionality including user registration, authentication, plan-based features, persistent database storage, improved admin interface with profile management and logout capabilities

## 3-Step Registration with OTP Verification (August 19, 2025)
- **CRITICAL RULE**: All users (except admins) must have a plan assigned - no users without plans allowed
- Removed modal registration from landing page and created dedicated 3-step registration flow:
  - Step 1: Plan selection with improved UI and feature comparisons
  - Step 2: Personal details with separate email/phone contact methods
  - Step 3: OTP verification via email (real SMTP integration) or phone (simulated)
- Implemented Gmail SMTP integration for real OTP email delivery
- Navigation improved: "Entrar" button first, then "Criar conta" button
- Removed redundant "Já tem conta? Entrar" button from hero section
- Plans route moved to `/api/auth/plans` for public access during registration
- OTP system with 5-minute expiration and professional email templates
- Test users with plans: admin@megafilemanager.com/admin123 (Premium), user@test.com/user123 (Pro), +351912345678/phone123 (Basic)

# System Architecture

## Frontend Architecture
The frontend is built using React with TypeScript, utilizing modern UI patterns and component-based architecture:

**UI Framework**: React with Vite as the build tool and development server, providing fast hot module replacement and optimized builds.

**Component System**: Implements shadcn/ui component library with Radix UI primitives, ensuring accessibility and consistent design patterns. Components are structured with clear separation between presentational and container components.

**State Management**: Uses TanStack Query (React Query) for server state management, providing caching, synchronization, and error handling for API calls. Local state is managed through React hooks.

**Routing**: Implements wouter for lightweight client-side routing with authentication-aware route protection.

**Styling**: Tailwind CSS for utility-first styling with custom CSS variables for theme consistency, including MEGA brand colors and design system.

## Backend Architecture
The backend follows a modular MVC architecture with Express.js:

**Modular Structure**: Organized into separate modules for developers (API endpoints, documentation) and end users (portal interface). Each module has dedicated routes, controllers, and services.

**Controllers Layer**: Handle HTTP requests/responses and input validation. Located in `server/controllers/` with separate controllers for Auth, Files, API Keys, and Admin functionality.

**Services Layer**: Contains business logic and external integrations. Located in `server/services/` including AuthService, FileService, ApiKeyService, AdminService, and MegaService.

**Routes Layer**: Modular route definitions organized by functionality. Located in `server/routes/modules/` with separate modules for auth, developer APIs, and portal endpoints.

**Middleware Layer**: Authentication, authorization, and rate limiting middleware. Located in `server/middleware/` for reusable request processing.

**API Design**: RESTful endpoints following standard HTTP conventions with proper status codes and error handling. Implements rate limiting based on user plans and API key authentication.

**Authentication**: Dual authentication system supporting both session-based authentication (via Replit OAuth) and API key authentication for programmatic access.

**File Operations**: Integration with MEGA SDK through a service layer that handles file upload, download, deletion, and search operations. Files are processed through multer middleware with memory storage for streaming to MEGA.

**Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations. Schema includes users, files, API keys, plans, and MEGA credentials with proper relationships and constraints.

## Data Storage Solutions
**Primary Database**: PostgreSQL database for user data, file metadata, API keys, and system configuration.

**File Storage**: MEGA cloud storage as the primary file storage backend, accessed through the official MEGA SDK.

**Session Storage**: PostgreSQL-backed session storage for user authentication state management.

**Schema Design**: Normalized database schema with proper foreign key relationships, supporting multi-tenant architecture with user-based data isolation.

## Authentication and Authorization
**User Authentication**: Replit OAuth integration for web-based user authentication with automatic user provisioning and profile management.

**API Authentication**: JWT-like API key system with hashed keys stored in database, supporting key rotation and usage tracking.

**Authorization Levels**: Role-based access control with regular users and admin users, where admin users can configure MEGA credentials and view system statistics.

**Session Management**: Secure session handling with HTTP-only cookies, proper CSRF protection, and configurable session timeouts.

# External Dependencies

## Core Infrastructure
- **PostgreSQL**: Database for application data storage
- **Replit OAuth**: Authentication provider for user login and profile management
- **Vite**: Frontend build tool and development server

## MEGA Integration
- **MEGA SDK**: Official MEGA SDK (megajs package) for cloud storage operations
- **File Processing**: Multer middleware for handling multipart file uploads with memory storage

## UI and Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography

## Development and Runtime
- **TypeScript**: Type safety across frontend and backend
- **Drizzle ORM**: Type-safe database ORM with PostgreSQL adapter
- **TanStack Query**: Server state management and caching
- **Express.js**: Backend web framework with middleware ecosystem
- **bcrypt**: Password hashing for secure credential storage
- **rate limiting**: Express middleware for API rate limiting

## Database Schema
The system uses a PostgreSQL database with tables for users, files, API keys, plans, MEGA credentials, and sessions. The schema supports user authentication, file metadata storage, API key management, and admin configuration of MEGA credentials.