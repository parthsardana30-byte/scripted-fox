# Scripted Fox

Scripted Fox is a modern, product-led application designed for YouTube creators who want a clearer path to their next upload. It provides a complete media workbench environment to move smoothly from channel signals to ideation, and finally to a record-ready script.

## Features

- **Media Workbench**: A task-specific canvas designed for content creation, featuring a focused document workspace and a persistent conversational AI assistant.
- **Creator Tooling**: Integrated workflows for managing ideas, projects, and analytics.
- **Theme Support**: Seamless light and dark modes sharing a unified semantic design system. 
- **Authentication**: Better Auth with email/password and Google Sign-In, keeping channel connections separate.
- **Billing**: Multi-tier pricing (Free Trial, Pro, Elite) integrated with PayU (in development).

## Tech Stack

This project is built using modern web technologies to ensure a high-performance and accessible experience:

- **Framework**: [Next.js](https://nextjs.org/) (v16) with App Router.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4) leveraging a custom design system ("Creator Playback").
- **UI Components**: Radix UI primitives, React Hook Form, and Zod for validation. Icons provided by [Lucide](https://lucide.dev/).
- **Animation**: `motion` for fluid state transitions and micro-interactions.
- **Backend & Database**: Better Auth backed by a Supabase-hosted PostgreSQL database. Supabase Auth is not used.
- **Testing**: [Vitest](https://vitest.dev/) for unit testing and [Playwright](https://playwright.dev/) for end-to-end testing.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (latest LTS recommended)
- [pnpm](https://pnpm.io/) (v10.15+)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aryanatharv/ScriptWriter.git
   cd ScriptWriter
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure your environment variables:
   
   To run this application, you must provide backend credentials. Copy the example template:
   ```bash
   cp .env.development.example .env.development.local
   ```
   
   **For collaborators:** each developer keeps a private `.env.development.local`.
   Use a Supabase PostgreSQL connection string as `DATABASE_URL` and a local
   `BETTER_AUTH_SECRET` of at least 32 characters. Do not add Supabase URL,
   publishable-key, service-role, or Supabase Auth variables: the application
   connects directly to PostgreSQL and Better Auth owns application identities.

   Developers may use separate development databases and secrets. If they use
   one shared development database, coordinate migrations and securely share the
   matching environment credentials outside Git.

   Email/password signup also requires `RESEND_API_KEY` and a verified
   `AUTH_EMAIL_FROM` sender. Without them, Google signup remains available but
   email signup is disabled instead of creating an unverified session.

4. Create the Better Auth and application tables:

   ```bash
   pnpm db:migrate
   ```

5. Start the development server:
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

## Architecture & Design

The application follows a strictly defined design system outlined in `design.md`. 
Key architectural concepts include:
- **Design Philosophy**: Minimalist, low-noise interface keeping the creator's work at the center. Primary actions use neutral ink colors while "warm red" is reserved exclusively for playback/recording signals.
- **Typography**: Manrope Variable for primary display and body copy; Cascadia Mono for utility and data points.
- **Data access**: Server-only PostgreSQL access through `pg`; authentication and sessions are managed by Better Auth.

## Testing

Run unit tests in watch mode:
```bash
pnpm test:watch
```

Run end-to-end tests:
```bash
pnpm test:e2e
```

## Deployment

Refer to `ENVIRONMENTS.md` for the environment workflow, database migrations, OAuth clients, and production promotion checklist.
