// This endpoint has been deprecated in favor of polling
// It remains for backward compatibility

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: "Server-Sent Events are not supported in serverless environments. Please use polling via the /api/headlines endpoint instead.",
      status: "deprecated",
      alternative: "/api/headlines",
      pollingRecommended: true,
      pollingInterval: 15000 // 15 seconds
    })
  };
};