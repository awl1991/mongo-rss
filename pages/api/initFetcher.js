import { fetchHeadlines } from '../../lib/fetcher';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        console.log("Initializing fetcher from /api/initFetcher...");
        try {
            // Perform an initial fetch
            const result = await fetchHeadlines();
            res.status(200).json({ 
                message: "Initial fetch completed successfully",
                newHeadlinesCount: result.newHeadlinesCount, 
                newSources: result.newSources
            });
        } catch (error) {
            console.error("Error in initial fetch:", error);
            res.status(500).json({ error: "Error in initial fetch" });
        }
    } else {
        res.status(405).json({ message: "Method not allowed" });
    }
}