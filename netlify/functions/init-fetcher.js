const { fetchHeadlines } = require('../../lib/fetcher');

// Helper function to create a promise that rejects after a timeout
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }

  console.log("Initializing optimized fetcher from Netlify function...");
  
  try {
    // Create a promise race between our function and a timeout
    // The timeout is set to 9 seconds to ensure we finish before Netlify's 10-second limit
    const result = await Promise.race([
      fetchHeadlines(),
      timeoutPromise(9000)
    ]);
    
    // Create a sanitized response object to ensure it's serializable
    const sanitizedResponse = {
      message: "Initial fetch completed successfully",
      newHeadlinesCount: typeof result.newHeadlinesCount === 'number' ? result.newHeadlinesCount : 0,
      newSources: Array.isArray(result.newSources) ? result.newSources.map(s => String(s)) : [],
      optimized: true
    };
    
    // Test serialization before returning
    try {
      const serializedData = JSON.stringify(sanitizedResponse);
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: serializedData
      };
    } catch (serializationError) {
      console.error("JSON serialization error:", serializationError);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: "Failed to serialize response",
          details: serializationError.message
        })
      };
    }
  } catch (error) {
    console.error("Error in initial fetch:", error.message);
    
    // Determine the type of error
    const isTimeout = error.message && error.message.includes('Timeout after');
    const isDbConnectionError = error.message && (
      error.message.includes('MongoNetworkError') || 
      error.message.includes('failed to connect') ||
      error.message.includes('ECONNREFUSED')
    );
    
    return {
      statusCode: isTimeout ? 408 : (isDbConnectionError ? 503 : 500),
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: isTimeout ? 
          "Function timed out" : 
          (isDbConnectionError ? "Database connection error" : "Error in initial fetch"),
        message: error.message
      })
    };
  }
};