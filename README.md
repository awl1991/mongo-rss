# RSS Feed Headlines

A Next.js application for fetching and displaying political headlines from various RSS feeds.

## Overview

This application fetches headlines from multiple political news sources, filters them based on relevant keywords, and displays them in a responsive UI. The application has been optimized for deployment on Netlify's serverless platform.

## Features

- Fetches headlines from multiple RSS feeds
- Filters headlines based on political relevance
- Updates headlines every 5 minutes using Netlify scheduled functions
- Daily cleanup of all headlines at 2 AM
- Responsive UI with search functionality
- MongoDB Atlas integration for persistent storage

## Prerequisites

- Node.js 18.x or higher
- MongoDB Atlas account
- Netlify account (for deployment)

## Local Development

1. **Clone the repository**

```bash
git clone <repository-url>
cd rss-feed
```

2. **Setup environment variables**

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your MongoDB connection details:

```
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB=headlines_db
```

3. **Install dependencies**

```bash
npm install
```

4. **Run the development server with Netlify CLI**

```bash
npm run netlify-dev
```

This will start the Netlify dev environment, which includes both the Next.js application and the Netlify functions.

The application should now be running at [http://localhost:8888](http://localhost:8888).

## Netlify Deployment

1. **Install Netlify CLI (if not already installed)**

```bash
npm install -g netlify-cli
```

2. **Deploy to Netlify**

You can deploy directly from the Netlify dashboard by connecting your Git repository, or use the CLI:

```bash
netlify deploy --prod
```

3. **Configure Environment Variables on Netlify**

In the Netlify dashboard, go to Site settings > Environment variables and add the following:

- `MONGODB_URI`: Your MongoDB Atlas connection string
- `MONGODB_DB`: The name of your MongoDB database (e.g., `headlines_db`)

4. **Netlify Configuration**

The application is configured for Netlify deployment in the `netlify.toml` file:

```toml
[build]
  command = "npm run build"
  publish = ".next"
  functions = "netlify/functions"

[build.environment]
  # Environment variables can be set here or in the Netlify UI
  # MONGODB_URI and MONGODB_DB should be set in Netlify UI environment variables
  # Skip the automatic check for .next directory if next export is used
  NETLIFY_NEXT_PLUGIN_SKIP = "false"

# Scheduled function for fetching headlines every 5 minutes
[functions.scheduled-fetch-headlines]
  schedule = "*/5 * * * *"
  path = "/netlify/functions/scheduled-fetch-headlines"

# Scheduled function for database cleanup
[functions.scheduled-cleanup]
  schedule = "0 2 * * *"  # Run at 2 AM every day
  path = "/netlify/functions/scheduled-cleanup"

# Redirects for API endpoints
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

This configuration:
- Sets the build output directory to `.next` (standard Next.js output)
- Configures two scheduled functions:
  - Every 5 minutes: Fetch new headlines
  - Daily at 2:00 AM: Delete ALL headlines from the database
- Sets up redirects to route API requests to Netlify functions
- Includes the Next.js plugin for Netlify

## MongoDB Atlas Setup (Detailed)

1. **Create a MongoDB Atlas account**

Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free account.

2. **Create a new cluster**

Follow the instructions to create a new cluster with the free tier option.

3. **Create a database user**

In the Security > Database Access section, create a new database user with read/write permissions.

4. **Whitelist your IP address**

In the Security > Network Access section, whitelist your IP address or allow access from anywhere (0.0.0.0/0) for development.

5. **Get your connection string**

- In the Databases section, click "Connect" on your cluster
- Select "**Drivers**" from the connection options
- Select "Node.js" as the driver and the latest version
- Copy the connection string that looks like: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
- Replace `<username>` and `<password>` with your database user credentials

6. **Create a database**

The application will automatically create the necessary collections and indexes when it first connects to MongoDB Atlas.

## Data Management

This application is configured to:

1. Fetch new headlines every 5 minutes
2. **Delete ALL headlines from the database daily at 2:00 AM**
3. Display up to 200 headlines at a time in the UI

## Project Structure

- `lib/`: Core libraries for database, RSS fetching, and utilities
- `pages/`: Next.js pages and API routes
- `netlify/functions/`: Netlify serverless functions for API endpoints and scheduled tasks
- `styles/`: CSS modules for styling
- `netlify.toml`: Netlify configuration for build settings and scheduled functions

## License

MIT