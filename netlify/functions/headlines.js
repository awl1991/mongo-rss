const { getHeadlines, connectToDatabase } = require('../../lib/db');
const { formatDatetimeToCentral, isNewHeadline } = require('../../lib/utils');

// Handler for fetching formatted headlines
exports.handler = async (event, context) => {
  console.log("Serving headlines request at", new Date().toISOString());
  
  // Log environment status
  console.log("Environment check: MONGODB_URI set:", !!process.env.MONGODB_URI);
  console.log("Environment check: MONGODB_DB set:", !!process.env.MONGODB_DB);
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }
  
  try {
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

    const formattedHeadlines = rows.map(h => ({
      headline: h.headline,
      link: h.link,
      source: h.source,
      pub_time: formatDatetimeToCentral(h.pub_time),
      fetch_time: formatDatetimeToCentral(h.fetch_time),
      is_new: isNewHeadline(h.pub_time),
      pub_time_raw: h.pub_time // Include raw ISO for sorting
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formattedHeadlines)
    };
  } catch (error) {
    console.error("Error fetching headlines:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Database error" })
    };
  }
};