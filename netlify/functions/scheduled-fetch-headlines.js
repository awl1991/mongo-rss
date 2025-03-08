const { fetchHeadlines } = require('../../lib/fetcher');

// Helper function to create a promise that rejects after a timeout
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
}

// Handler for scheduled event and HTTP requests
exports.handler = async (event, context) => {
  // Check if this is a scheduled event
  const isScheduledEvent = event.headers && event.headers['x-scheduled-event'] === 'true';
  
  console.log(`Fetching headlines at ${new Date().toISOString()}`);
  console.log(`Trigger type: ${isScheduledEvent ? 'Scheduled Event' : 'HTTP Request'}`);
  
  try {
    // Create a promise race between our function and a timeout
    // The timeout is set to 9 seconds to ensure we finish before Netlify's 10-second limit
    const result = await Promise.race([
      fetchHeadlines(),
      timeoutPromise(9000)
    ]);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Headlines fetched successfully",
        newHeadlinesCount: result.newHeadlinesCount,
        newSources: result.newSources,
        triggeredBy: isScheduledEvent ? 'schedule' : 'http',
        optimized: true
      })
    };
  } catch (error) {
    console.error("Error fetching headlines:", error.message);
    
    // Determine if it was a timeout
    const isTimeout = error.message && error.message.includes('Timeout after');
    
    return {
      statusCode: isTimeout ? 408 : 500,
      body: JSON.stringify({
        error: isTimeout ? "Function timed out" : "Error processing request",
        message: error.message,
        triggeredBy: isScheduledEvent ? 'schedule' : 'http'
      })
    };
  }
};