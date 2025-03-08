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
    
    // Create a sanitized response object
    const sanitizedResponse = {
      message: "All headlines deleted successfully",
      deletedCount: typeof result.deletedCount === 'number' ? result.deletedCount : 0,
      triggeredBy: isScheduledEvent ? 'schedule' : 'http'
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
    console.error("Error cleaning up database:", error);
    
    // Determine if it's a database connection error
    const isDbConnectionError = error.message && (
      error.message.includes('MongoNetworkError') || 
      error.message.includes('failed to connect') ||
      error.message.includes('ECONNREFUSED')
    );
    
    return {
      statusCode: isDbConnectionError ? 503 : 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: isDbConnectionError ? "Database connection error" : "Error processing request",
        message: error.message || "Unknown error",
        triggeredBy: isScheduledEvent ? 'schedule' : 'http'
      })
    };
  }
};