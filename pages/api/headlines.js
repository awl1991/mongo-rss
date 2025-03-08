import { getHeadlines } from '../../lib/db';
import { formatDatetimeToCentral, isNewHeadline } from '../../lib/utils';

export default async function handler(req, res) {
    if (req.method === 'GET') {
        console.log("Serving /api/headlines request at", new Date().toISOString());
        
        try {
            // Get headlines from MongoDB
            const rows = await getHeadlines(200);
            
            if (!rows.length) {
                console.log("No headlines found in /api/headlines endpoint");
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
            
            // No localStorage handling needed here (client-side only)
            res.status(200).json(formattedHeadlines);
        } catch (error) {
            console.error("Error fetching headlines:", error);
            res.status(500).json({ error: "Database error" });
        }
    } else {
        res.status(405).json({ message: "Method not allowed" });
    }
}