const { getHeadlines } = require('../../lib/db');
const { formatDatetimeToCentral, isNewHeadline } = require('../../lib/utils');

// Handler for fetching formatted headlines
exports.handler = async (event, context) => {
  console.log("Serving headlines request at", new Date().toISOString());
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" })
    };
  }
  
  try {
    // Get headlines from MongoDB
    const rows = await getHeadlines(200);
    
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