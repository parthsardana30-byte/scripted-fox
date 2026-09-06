# Scripted Fox

Scripted Fox is a modern, product-led application designed for YouTube creators who want a clearer path to their next upload. It provides a complete media workbench environment to move smoothly from channel signals to ideation, and finally to a record-ready script.

## Features

- **Media Workbench**: A task-specific canvas designed for content creation, featuring a focused document workspace and a persistent conversational AI assistant.
- **Creator Tooling**: Integrated workflows for managing ideas, projects, and analytics.
- **Theme Support**: Seamless light and dark modes sharing a unified semantic design system. 
- **Authentication**: Secure Google Sign-In via Supabase, keeping channel connections separate.
- **Billing**: Multi-tier pricing (Free Trial, Pro, Elite) integrated with PayU (in development).

## Tech Stack

This project is built using modern web technologies to ensure a high-performance and accessible experience:

- **Framework**: [Next.js](https://nextjs.org/) (v16) with App Router.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4) leveraging a custom design system ("Creator Playback").
- **UI Components**: Radix UI primitives, React Hook Form, and Zod for validation. Icons provided by [Lucide](https://lucide.dev/).
- **Animation**: `motion` for fluid state transitions and micro-interactions.
- **Backend & Database**: [Supabase](https://supabase.com/) for PostgreSQL database, authentication, and SSR integrations.
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
   
   **For Collaborators:**
   Since `.env.development.local` is git-ignored for security, you have two options to get the app running:
   - **Option A (Recommended):** Ask the repository owner to securely share their `.env.development.local` file with you. This will connect your local frontend to the existing development database.
   - **Option B:** Set up your own backend infrastructure. You will need to create:
     - A new [Supabase](https://supabase.com/) project (for Auth and Database). Run the SQL scripts in the `supabase/migrations/` folder to set up your tables.
     - A Google Cloud OAuth Client (for YouTube integration).
     - (Optional) A PayU test account for billing.
     - (Optional) An AI provider API key (e.g., Groq) for script generation features.
   
   Once you have the values, fill them into your `.env.development.local` file.

4. Start the development server:
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:3000`.

## Architecture & Design

The application follows a strictly defined design system outlined in `design.md`. 
Key architectural concepts include:
- **Design Philosophy**: Minimalist, low-noise interface keeping the creator's work at the center. Primary actions use neutral ink colors while "warm red" is reserved exclusively for playback/recording signals.
- **Typography**: Manrope Variable for primary display and body copy; Cascadia Mono for utility and data points.
- **State Management**: Heavily leverages Next.js App Router conventions with Supabase SSR for data fetching and mutations.

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

Refer to `ENVIRONMENTS.md` for the complete production promotion checklist, which includes provisioning production Supabase environments, setting up company-owned OAuth clients, and configuring production billing endpoints.
