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
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: "Initial fetch completed successfully",
        newHeadlinesCount: result.newHeadlinesCount, 
        newSources: result.newSources,
        optimized: true
      })
    };
  } catch (error) {
    console.error("Error in initial fetch:", error.message);
    
    // Determine if it was a timeout
    const isTimeout = error.message && error.message.includes('Timeout after');
    
    return {
      statusCode: isTimeout ? 408 : 500,
      body: JSON.stringify({ 
        error: isTimeout ? "Function timed out" : "Error in initial fetch",
        message: error.message
      })
    };
  }
};