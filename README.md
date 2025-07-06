# @doneisbetter/sso

![Version](https://img.shields.io/badge/version-5.0.0-blue.svg)
[![npm version](https://badge.fury.io/js/@doneisbetter%2Fsso.svg)](https://www.npmjs.com/package/@doneisbetter/sso)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A secure, privacy-focused SSO solution with ephemeral token handling and OAuth2 support.

## Features

- 🔐 Secure token-based authentication
- 🚀 OAuth2 support with NextAuth.js integration
- 📱 Mobile-first responsive design
- ⚡ Easy deployment with Vercel
- 🔄 MongoDB integration
- 🛡️ Rate limiting and request logging
- 📖 Comprehensive documentation
- 🔒 Privacy-first with minimal data collection
- ⏱️ Short-lived JWT tokens
- 🎨 TailwindCSS styling

## Quick Start

```bash
# Install the package
npm install @doneisbetter/sso

# Set required environment variables
export MONGODB_URI="your_mongodb_uri"
export JWT_SECRET="your_jwt_secret"
export NEXT_PUBLIC_DEFAULT_API_KEY="your_api_key"

# Start development server
npm run dev
```

## Documentation

- [Integration Guide](/docs/integration) - How to integrate SSO into your application
- [API Reference](/docs/sso/api-reference.md) - API endpoints and usage
- [OAuth2 Guide](/docs/sso/oauth2-guide.md) - OAuth2 integration with NextAuth.js
- [Architecture Overview](/ARCHITECTURE.md) - System design and components

## Project Documentation

- [Architecture](ARCHITECTURE.md) - System design and components
- [Release Notes](RELEASE_NOTES.md) - Version history and changes
- [Roadmap](ROADMAP.md) - Future development plans
- [Task List](TASKLIST.md) - Current development tasks
- [Learnings](LEARNINGS.md) - Development insights and solutions

## Environment Variables

```env
# Required
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_DEFAULT_API_KEY=your_api_key

# Optional - OAuth2 Configuration
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=your_oauth_redirect_uri
```

## Tech Stack

- Next.js 15.3.5
- TypeScript 5.8.3
- MongoDB
- TailwindCSS
- JWT Authentication
- OAuth2

## Production Deployment

The service is deployed at [https://sso.doneisbetter.com](https://sso.doneisbetter.com)

## License

MIT © Done is Better

