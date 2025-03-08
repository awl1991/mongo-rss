# RSS Feed Headlines

A Next.js application for fetching and displaying political headlines from various RSS feeds.

## Overview

This application fetches headlines from multiple political news sources, filters them based on relevant keywords, and displays them in a responsive UI. The application has been optimized for deployment on Vercel's serverless platform.

## Features

- Fetches headlines from multiple RSS feeds
- Filters headlines based on political relevance
- Updates headlines periodically using Vercel cron jobs (every 5 minutes)
- Daily cleanup of all headlines at 2 AM
- Responsive UI with search functionality
- MongoDB Atlas integration for persistent storage

## Prerequisites

- Node.js 18.x or higher
- MongoDB Atlas account
- Vercel account (for deployment)

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

4. **Run the development server**

```bash
npm run dev
```

The application should now be running at [http://localhost:3000](http://localhost:3000).

## Vercel Deployment

1. **Install Vercel CLI (optional)**

```bash
npm install -g vercel
```

2. **Deploy to Vercel**

You can deploy directly from the Vercel dashboard by connecting your Git repository, or use the CLI:

```bash
vercel
```

3. **Configure Environment Variables on Vercel**

In the Vercel dashboard, go to your project settings and add the following environment variables:

- `MONGODB_URI`: Your MongoDB Atlas connection string
- `MONGODB_DB`: The name of your MongoDB database (e.g., `headlines_db`)

4. **Cron Job Configuration**

The application uses Vercel Cron Jobs to periodically fetch new headlines. This is configured in the `vercel.json` file:

```json
{
  "crons": [
    {
      "path": "/api/fetchHeadlines",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/fetchHeadlines?cleanup=all",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This configures two cron jobs:
- Every 5 minutes: Fetch new headlines
- Daily at 2:00 AM: Delete ALL headlines from the database

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
- `pages/api/`: API endpoints for fetching headlines
- `styles/`: CSS modules for styling
- `vercel.json`: Vercel configuration for cron jobs

## License

MIT