const { deleteAllHeadlines } = require('../../lib/db');

// Handler for scheduled event and HTTP requests
exports.handler = async (event, context) => {
  // Check if this is a scheduled event
  const isScheduledEvent = event.headers && event.headers['x-scheduled-event'] === 'true';
  
  console.log(`Running complete database cleanup at: ${new Date().toISOString()}`);
  console.log(`Trigger type: ${isScheduledEvent ? 'Scheduled Event' : 'HTTP Request'}`);
  
  try {
    // Execute the database cleanup
    const result = await deleteAllHeadlines();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "All headlines deleted successfully",
        deletedCount: result.deletedCount,
        triggeredBy: isScheduledEvent ? 'schedule' : 'http'
      })
    };
  } catch (error) {
    console.error("Error cleaning up database:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Error processing request"
      })
    };
  }
};