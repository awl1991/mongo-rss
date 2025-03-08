const { fetchHeadlines } = require('../../lib/fetcher');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }

  console.log("Initializing fetcher from Netlify function...");
  
  try {
    // Perform an initial fetch
    const result = await fetchHeadlines();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: "Initial fetch completed successfully",
        newHeadlinesCount: result.newHeadlinesCount, 
        newSources: result.newSources
      })
    };
  } catch (error) {
    console.error("Error in initial fetch:", error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error in initial fetch" })
    };
  }
};