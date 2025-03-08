const Parser = require('rss-parser');
const fetch = require('node-fetch');
const EventEmitter = require('events');
const { 
  getHeadlineByLink, 
  insertHeadline, 
  updateHeadline, 
  deleteOldHeadlines, 
  getHeadlinesCount
} = require('./db');

const parser = new Parser({
    customFetch: (url) => fetch(url, { timeout: 5000 }) // Reduced to 5-second timeout for faster responses
});
const headlineEmitter = new EventEmitter();

// Add update frequency to each feed to optimize fetching (minutes between checks)
const RSS_FEEDS = [
    {"name": "CNN", "url": "http://rss.cnn.com/rss/cnn_allpolitics.rss", "is_political": true, "update_frequency": 5},
    {"name": "Fox News", "url": "http://feeds.foxnews.com/foxnews/politics", "is_political": true, "update_frequency": 5},
    {"name": "NY Times", "url": "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", "is_political": true, "update_frequency": 10},
    {"name": "Washington Post", "url": "https://feeds.washingtonpost.com/rss/politics", "is_political": true, "update_frequency": 10},
    {"name": "NPR", "url": "https://feeds.npr.org/1014/rss.xml", "is_political": true, "update_frequency": 15},
    {"name": "CBS News", "url": "https://www.cbsnews.com/latest/rss/politics", "is_political": true, "update_frequency": 10},
    {"name": "NBC News", "url": "https://feeds.nbcnews.com/nbcnews/public/politics", "is_political": true, "update_frequency": 10},
    {"name": "Bloomberg", "url": "https://feeds.bloomberg.com/politics/news.rss", "is_political": true, "update_frequency": 15},
    // {"name": "Reuters", "url": "https://www.reuters.com/arc/outboundfeeds/news-rss/?outputType=xml", "is_political": true, "update_frequency": 5},
    {"name": "AP News", "url": "https://news.google.com/rss/search?q=when:24h+allinurl:bloomberg.com&hl=en-US&gl=US&ceid=US:en", "is_political": true, "update_frequency": 15},
    {"name": "Politico", "url": "https://rss.politico.com/politics-news.xml", "is_political": true, "update_frequency": 5},
    {"name": "ABC News", "url": "https://abcnews.go.com/abcnews/politicsheadlines", "is_political": true, "update_frequency": 10},
    // {"name": "USA Today", "url": "https://rssfeeds.usatoday.com/UsatodaycomNation-TopStories", "is_political": false, "update_frequency": 15},
    // {"name": "Wall Street Journal", "url": "https://feeds.a.dj.com/rss/RSSPolitics.xml", "is_political": true, "update_frequency": 15},
    {"name": "MSNBC", "url": "https://www.msnbc.com/feeds/latest", "is_political": false, "update_frequency": 10},
    {"name": "The Hill", "url": "https://thehill.com/feed/rss", "is_political": true, "update_frequency": 5},
    {"name": "Axios", "url": "https://api.axios.com/feed/", "is_political": true, "update_frequency": 15},
    {"name": "Time", "url": "https://time.com/feed/", "is_political": false, "update_frequency": 30},
    {"name": "Newsweek", "url": "https://www.newsweek.com/rss", "is_political": false, "update_frequency": 30},
    {"name": "National Review", "url": "https://www.nationalreview.com/feed/", "is_political": true, "update_frequency": 30},
    {"name": "The Atlantic", "url": "https://www.theatlantic.com/feed/channel/politics/", "is_political": true, "update_frequency": 60},
    {"name": "PBS NewsHour", "url": "https://www.pbs.org/newshour/feeds/rss/politics", "is_political": true, "update_frequency": 30},
    {"name": "Vox", "url": "https://www.vox.com/rss/politics", "is_political": true, "update_frequency": 30},
    {"name": "Slate", "url": "https://slate.com/feeds/news-and-politics.rss", "is_political": true, "update_frequency": 30},
    {"name": "ProPublica", "url": "https://www.propublica.org/feeds/propublica/main", "is_political": true, "update_frequency": 60},
    {"name": "Chicago Tribune", "url": "https://www.chicagotribune.com/rss2.0.xml", "is_political": false, "update_frequency": 30},
    {"name": "Los Angeles Times", "url": "https://www.latimes.com/california/rss2.0.xml", "is_political": false, "update_frequency": 30},
    // {"name": "Houston Chronicle", "url": "https://www.houstonchronicle.com/rss/feed/News-577.xml", "is_political": false, "update_frequency": 30},
    {"name": "New York Post", "url": "https://nypost.com/feed/", "is_political": false, "update_frequency": 15}
];

const ARTICLE_FILTER = [
    "trump", "elon", "musk", "maga", "biden", "harris", "gop", "republican", "democrat", "election",
    "vote", "politics", "congress", "senate", "house", "president", "vp", "conservative", "liberal",
    "breaking", "news", "report", "media", "fake", "twitter", "x", "post", "tweet", "elonmusk",
    "tesla", "spaceX", "freedom", "speech", "censorship", "big tech", "government", "fbi", "doj",
    "justice", "law", "court", "supreme", "scotus", "bill", "tax", "border", "wall", "immigration",
    "illegal", "crime", "police", "defund", "2nd", "amendment", "guns", "rights", "abortion",
    "pro-life", "pro-choice", "healthcare", "obamacare", "jobs", "economy", "inflation", "gas",
    "oil", "energy", "climate", "change", "hoax", "china", "russia", "ukraine", "war", "military",
    "veterans", "nato", "iran", "israel", "deal", "trade", "tariffs", "america", "usa", "patriot",
    "flag", "anthem", "woke", "crt", "critical", "race", "theory", "school", "education", "teachers",
    "union", "parents", "kids", "vaccine", "mandate", "mask", "covid", "lockdown", "fraud", "rigged",
    "ballot", "mail-in", "voter", "id", "january", "6", "capitol", "riot", "impeach", "desantis",
    "florida", "abbott", "texas", "pence", "mcconnell", "pelosi", "schumer", "aoc", "squad", "omar",
    "tlaib", "pressley", "bush", "cheney", "reagan", "romney", "cruz", "rubio", "haley", "pompeo",
    "gaetz", "greene", "boebbert", "carlson", "hannity", "ingraham", "beck", "shapiro", "owens",
    "kirk", "bannon", "flynn", "alex", "jones", "rush", "limbaugh", "fox", "oann", "newsmax",
    "breitbart", "daily", "wire", "nypost", "post", "rnc", "dnc", "campaign", "rally", "debate",
    "poll", "swing", "state", "red", "blue", "purple", "midterm", "2020", "2024", "2016", "win",
    "lose", "steal", "stop", "deep", "state", "swamp", "drain", "insider", "outsider", "globalist",
    "nationalism", "populist", "socialism", "communism", "capitalism", "market", "regulation",
    "deregulation", "budget", "debt", "deficit", "spending", "entitlement", "welfare", "reform",
    "security", "social", "medicare", "medicaid", "insurance", "premium", "cost", "inflationary",
    "recession", "recovery", "worker", "labor", "unionize", "strike", "business", "corporate",
    "taxes", "cut", "increase", "rich", "poor", "middle", "class", "family", "values", "religion",
    "christian", "evangelical", "church", "faith", "god", "prayer", "bible", "islam", "terror",
    "isis", "al-qaeda", "afghanistan", "iraq", "syria", "peace", "deal", "foreign", "policy",
    "diplomacy", "sanctions", "nato", "un", "who", "cdc", "fauci", "science", "trust", "expert",
    "conspiracy", "qanon", "truth", "lie", "coverup", "whistleblower", "leak", "source", "anonymous",
    "report", "investigate", "probe", "scandal", "corrupt", "ethics", "lobby", "donor", "pac",
    "super", "fund", "raise", "spend", "ad", "attack", "smear", "negative", "positive", "message",
    "platform", "agenda", "promise", "pledge", "deliver", "fail", "win", "loss", "turnout", "base",
    "grassroots", "activist", "protest", "march", "riot", "violence", "lawless", "order", "chaos",
    "control", "gun", "control", "ban", "assault", "rifle", "background", "check", "mental",
    "health", "crisis", "emergency", "national", "guard", "deploy", "troops", "border", "patrol",
    "ice", "deport", "sanctuary", "city", "statehood", "dc", "puerto", "rico", "gerrymander",
    "district", "map", "census", "count", "population", "shift", "urban", "rural", "suburb",
    "voter", "suppress", "access", "ballot", "drop", "box", "early", "vote", "deadline", "certify",
    "recount", "audit", "challenge", "lawsuit", "judge", "ruling", "appeal", "decision", "lawmaker",
    "legislature", "session", "pass", "veto", "override", "executive", "order", "agency", "epa",
    "sec", "irs", "treasury", "fed", "interest", "rate", "economy", "boom", "bust", "stock",
    "market", "crash", "trade", "deal", "nafta", "usmca", "tpp", "brexit", "eu", "global",
    "mike pence", "rex tillerson", "mike pompeo", "steven mnuchin", "james mattis",
    "patrick m. shanahan", "mark t. esper", "jeff sessions", "matthew g. whitaker",
    "william p. barr", "ryan k. zinke", "david l. bernhardt", "sonny perdue", "wilbur ross",
    "alexander j. acosta", "jay p. higgins", "eugene scalia", "thomas e. price", "don j. wright",
    "alex m. azar ii", "ben carson", "elaine l. chao", "rick perry", "betsy devos",
    "david j. shulkin", "robert l. wilkie", "john f. kelly", "elaine d. duke",
    "kevin k. mcaleenan", "chad f. wolf", "j.d. vance", "marco rubio", "scott m. bessent",
    "robert o'neill", "mike r. davis", "ryan z. busse", "thomas j. massie",
    "robert f. kennedy jr.", "vivek g. ramaswamy", "marty makary", "richard a. perry",
    "chris rufo", "steve bannon", "kellyanne conway", "jared kushner", "ivanka trump",
    "sean spicer", "sarah huckabee sanders", "mick mulvaney", "reince priebus",
    "ronny l. jackson", "hope hicks", "peter navarro", "michael t. flynn", "karoline leavitt",
    "chris miller", "richard grenell", "robert lighthizer", "arthur laffer", "andrew wheeler",
    "donald trump", "threat", "moon", "rocket", "space", "ai", "artificial intelligence"
];

function isRelevantHeadline(headline) {
    const headlineLower = headline.toLowerCase();
    return ARTICLE_FILTER.some(term => headlineLower.includes(term));
}

// Helper function to split an array into chunks of specified size
function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

// Optimized fetchHeadlines function for Netlify's 10-second timeout
async function fetchHeadlines() {
    console.log("Starting optimized fetchHeadlines for Netlify...");
    const currentTime = new Date().toISOString();
    let newHeadlinesCount = 0;
    const newSources = new Set();
    const newHeadlines = [];

    // Create a rolling time window for the last 24 hours
    const recentTimeWindow = new Date();
    recentTimeWindow.setHours(recentTimeWindow.getHours() - 24);

    try {
        // Select only high-priority feeds to process (optimize for Netlify's 10-second limit)
        const priorityFeeds = RSS_FEEDS.filter(feed => 
            feed.update_frequency <= 10 && feed.is_political
        ).slice(0, 6); // Process only 6 high-priority feeds per invocation
        
        console.log(`Processing ${priorityFeeds.length} high-priority feeds this run`);
        
        // Process feeds in parallel with reduced timeout
        const feedPromises = priorityFeeds.map(async (feed) => {
            try {
                console.log(`Fetching ${feed.name}`);
                
                // No retries - just one attempt with a shorter timeout
                const feedData = await parser.parseURL(feed.url);
                
                if (!feedData.items || !feedData.items.length) {
                    return [];
                }

                // Filter articles more efficiently before any DB operations
                const relevantArticles = [];
                
                for (const entry of feedData.items) {
                    const headline = entry.title || null;
                    const link = entry.link || "#";
                    const pubTimeRaw = entry.pubDate || entry.updated || entry.isoDate || null;

                    // Skip quickly if missing core data
                    if (!headline || !pubTimeRaw) continue;

                    const pubDate = new Date(pubTimeRaw);
                    if (isNaN(pubDate.getTime()) || pubDate < recentTimeWindow) continue;
                    
                    // Skip quickly if not relevant
                    if (!isRelevantHeadline(headline)) continue;
                    
                    // Only add relevant, recent articles
                    relevantArticles.push({
                        headline,
                        link,
                        source: feed.name,
                        pub_time: pubDate.toISOString(),
                        fetch_time: currentTime
                    });
                }
                
                return relevantArticles;
            } catch (e) {
                console.error(`Error fetching ${feed.name}: ${e.message}`);
                return []; // Continue with other feeds on error
            }
        });

        // Wait for all feed promises to complete
        const feedResults = await Promise.all(feedPromises);
        const allArticles = feedResults.flat();

        if (allArticles.length === 0) {
            console.log("No relevant articles found to process");
            return { newHeadlinesCount: 0, newSources: [], newHeadlines: [] };
        }

        console.log(`Found ${allArticles.length} relevant articles to process`);

        // Process article insertion in parallel batches of 10
        const articleChunks = chunkArray(allArticles, 10);
        
        for (const chunk of articleChunks) {
            // Process each chunk in parallel
            const chunkPromises = chunk.map(async (article) => {
                try {
                    // Check if headline already exists
                    const existingHeadline = await getHeadlineByLink(article.link);
                    
                    if (existingHeadline) {
                        // Update if exists
                        await updateHeadline(article);
                        return null; // Not a new headline
                    } else {
                        // Insert if new
                        await insertHeadline(article);
                        newHeadlinesCount++;
                        newSources.add(article.source);
                        return article; // Return new headline for the array
                    }
                } catch (error) {
                    console.error(`Error processing article: ${error.message}`);
                    return null;
                }
            });
            
            // Wait for the current chunk to complete before moving to next chunk
            const chunkResults = await Promise.all(chunkPromises);
            newHeadlines.push(...chunkResults.filter(Boolean));
        }
        
        console.log(`New Headlines Added: ${newHeadlinesCount}`);
        if (newHeadlinesCount > 0) {
            console.log(`Sources: ${Array.from(newSources).join(", ")}`);
        }
        
        return { 
            newHeadlinesCount, 
            newSources: Array.from(newSources),
            newHeadlines 
        };
    } catch (error) {
        console.error("Error in fetchHeadlines:", error);
        throw error;
    }
}

// Export all functions and objects using CommonJS syntax
module.exports = {
    fetchHeadlines,
    headlineEmitter,
    isRelevantHeadline
};