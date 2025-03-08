import { fetchHeadlines } from '../../lib/fetcher';
import { deleteAllHeadlines } from '../../lib/db';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            // Check if this is a cleanup request
            if (req.query.cleanup === 'all') {
                console.log("Running complete database cleanup at:", new Date().toISOString());
                const result = await deleteAllHeadlines();
                return res.status(200).json({ 
                    message: "All headlines deleted successfully",
                    deletedCount: result.deletedCount
                });
            }

            // Regular headline fetching
            const result = await fetchHeadlines();
            
            // Ensure result is serializable
            try {
                // Create a clean, serializable response object
                const response = {
                    message: "Headlines fetched successfully",
                    newHeadlinesCount: typeof result.newHeadlinesCount === 'number' ? result.newHeadlinesCount : 0,
                    newSources: Array.isArray(result.newSources) ? result.newSources.map(s => String(s)) : []
                };
                
                // Test serialization before sending
                JSON.stringify(response);
                
                res.status(200).json(response);
            } catch (serializationError) {
                console.error("JSON serialization error:", serializationError);
                res.status(500).json({
                    error: "Failed to serialize response",
                    details: serializationError.message
                });
            }
        } catch (error) {
            console.error("Error in headlines operation:", error);
            res.status(500).json({ error: error.message || "Error processing request" });
        }
    } else {
        res.status(405).json({ message: "Method not allowed" });
    }
}