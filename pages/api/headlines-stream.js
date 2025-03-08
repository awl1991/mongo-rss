// This endpoint has been deprecated in favor of polling
// It remains for backward compatibility

export default function handler(req, res) {
    // Return a normal JSON response instead of SSE
    res.status(200).json({
        message: "Server-Sent Events are not supported in serverless environments. Please use polling via the /api/headlines endpoint instead.",
        status: "deprecated",
        alternative: "/api/headlines",
        pollingRecommended: true,
        pollingInterval: 15000 // 15 seconds
    });
}