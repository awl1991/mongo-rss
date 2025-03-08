const { getHeadlines, connectToDatabase } = require('../../lib/db');
const { formatDatetimeToCentral, isNewHeadline } = require('../../lib/utils');

// Cache mechanism to limit database queries to once every 5 minutes
let cachedHeadlines = null;
let lastFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Handler for fetching formatted headlines
exports.handler = async (event, context) => {
  console.log("Serving headlines request at", new Date().toISOString());
  
  // Check if we should fetch from database or use cache
  const now = Date.now();
  const shouldFetchFromDb = !cachedHeadlines || !lastFetchTime || (now - lastFetchTime) > CACHE_DURATION;
  
  // Log environment and cache status
  console.log("Environment check: MONGODB_URI set:", !!process.env.MONGODB_URI);
  console.log("Environment check: MONGODB_DB set:", !!process.env.MONGODB_DB);
  console.log("Cache status:", shouldFetchFromDb ? "Expired - fetching from database" : "Valid - using cached data");
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }
  
  try {
    // Check if we need to fetch from database or can use cached data
    if (shouldFetchFromDb) {
      // Test database connection first
      try {
        await connectToDatabase();
        console.log("Successfully connected to MongoDB");
      } catch (connectionError) {
        console.error("MongoDB connection error:", connectionError);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: "Database connection error", 
            details: connectionError.message,
            code: "DB_CONNECTION_ERROR"
          })
        };
      }
      
      // Get headlines from MongoDB with timeout handling
      let rows;
      try {
        // Create a promise that rejects after 8 seconds
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database query timeout")), 8000)
        );
        
        // Race between the actual query and the timeout
        rows = await Promise.race([getHeadlines(200), timeout]);
      } catch (queryError) {
        console.error("MongoDB query error:", queryError);
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: "Database query error", 
            details: queryError.message,
            code: "DB_QUERY_ERROR"
          })
        };
      }
      
      if (!rows.length) {
        console.log("No headlines found in headlines endpoint");
      } else {
        console.log(`Retrieved ${rows.length} headlines from database`);
      }

      // Update the cache
      cachedHeadlines = rows.map(h => ({
        headline: h.headline,
        link: h.link,
        source: h.source,
        pub_time: formatDatetimeToCentral(h.pub_time),
        fetch_time: formatDatetimeToCentral(h.fetch_time),
        is_new: isNewHeadline(h.pub_time),
        pub_time_raw: h.pub_time // Include raw ISO for sorting
      }));
      
      // Update the last fetch time
      lastFetchTime = now;
      
      const nextRefreshTime = new Date(now + CACHE_DURATION);
      console.log(`Cache updated at ${new Date(now).toISOString()}`);
      console.log(`Next database query scheduled at ${nextRefreshTime.toISOString()}`);
    } else {
      // Calculate and log time until next refresh
      const timeToNextRefresh = CACHE_DURATION - (now - lastFetchTime);
      const minutesRemaining = Math.floor(timeToNextRefresh / 60000);
      const secondsRemaining = Math.floor((timeToNextRefresh % 60000) / 1000);
      console.log(`Using cached headlines (${cachedHeadlines.length} items)`);
      console.log(`Next database refresh in ${minutesRemaining}m ${secondsRemaining}s`);
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache' // Ensure browsers don't cache the response
      },
      body: JSON.stringify(cachedHeadlines)
    };
  } catch (error) {
    console.error("Error fetching headlines:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: "Server error",
        details: error.message,
        code: "SERVER_ERROR"
      })
    };
  }
};