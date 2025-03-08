const { fetchHeadlines } = require('../../lib/fetcher');

// Handler for scheduled event and HTTP requests
exports.handler = async (event, context) => {
  // Check if this is a scheduled event
  const isScheduledEvent = event.headers && event.headers['x-scheduled-event'] === 'true';
  
  console.log(`Fetching headlines at ${new Date().toISOString()}`);
  console.log(`Trigger type: ${isScheduledEvent ? 'Scheduled Event' : 'HTTP Request'}`);
  
  try {
    // Execute the same fetchHeadlines function we were using in Vercel
    const result = await fetchHeadlines();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Headlines fetched successfully",
        newHeadlinesCount: result.newHeadlinesCount,
        newSources: result.newSources,
        triggeredBy: isScheduledEvent ? 'schedule' : 'http'
      })
    };
  } catch (error) {
    console.error("Error fetching headlines:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Error processing request"
      })
    };
  }
};