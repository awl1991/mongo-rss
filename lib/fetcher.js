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
    customFetch: (url) => fetch(url, { timeout: 10000 }) // 10-second timeout
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

async function fetchHeadlines() {
    console.log("Starting fetchHeadlines...");
    const currentTime = new Date().toISOString();
    let newHeadlinesCount = 0;
    const newSources = new Set();
    const allArticles = [];

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setUTCHours(23, 59, 59, 999);

    // Create a retention date for older articles (keep last 7 days)
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - 7);
    const retentionDateISO = retentionDate.toISOString();

    try {
        // Clean up old headlines
        const deleteResult = await deleteOldHeadlines(retentionDateISO);
        console.log(`Removed headlines older than ${retentionDateISO}`);
        
        console.log("-".repeat(50));
        console.log(`Search Initiated at: ${new Date().toUTCString()}`);
        console.log("Searching for new articles from sources...");

        // Process all feeds in parallel for better performance in serverless
        const feedPromises = RSS_FEEDS.map(async (feed) => {
            try {
                console.log(` Attempting to fetch ${feed.name} at ${feed.url}`);
                
                // Add retry logic for feed fetching
                let feedData;
                let retries = 0;
                const maxRetries = 3;
                
                while (retries < maxRetries) {
                    try {
                        feedData = await parser.parseURL(feed.url);
                        break; // Success, exit retry loop
                    } catch (fetchError) {
                        retries++;
                        console.error(`  Retry ${retries}/${maxRetries} for ${feed.name}: ${fetchError.message}`);
                        
                        if (retries >= maxRetries) {
                            throw fetchError; // Max retries reached, propagate error
                        }
                        
                        // Wait before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
                    }
                }
                
                console.log(`  Feed ${feed.name} returned ${feedData.items.length} entries`);
                if (!feedData.items.length) {
                    console.log(`  No entries found for ${feed.name}`);
                    return [];
                }

                const feedArticles = [];
                for (const entry of feedData.items) {
                    const headline = entry.title || null;
                    const link = entry.link || "#";
                    const pubTimeRaw = entry.pubDate || entry.updated || entry.isoDate || null;

                    if (!headline || !pubTimeRaw) {
                        console.log(`  Skipped from ${feed.name} - Missing headline or pub_time (Headline: ${headline}, Pub time: ${pubTimeRaw})`);
                        continue;
                    }

                    const pubDate = new Date(pubTimeRaw);
                    if (isNaN(pubDate.getTime())) {
                        console.log(`  Skipped '${headline}' from ${feed.name} - Invalid pub_time: ${pubTimeRaw}`);
                        continue;
                    }
                    const pubTimeISO = pubDate.toISOString();

                    if (pubDate < today || pubDate > todayEnd) {
                        console.log(`  Skipped '${headline}' from ${feed.name} - Not from today (Pub time: ${pubTimeRaw})`);
                        continue;
                    }

                    if (!isRelevantHeadline(headline)) {
                        console.log(`  Skipped '${headline}' from ${feed.name} - Not relevant to Trump or politics`);
                        continue;
                    }

                    console.log(`  Fetched '${headline}' from ${feed.name} (Pub time: ${pubTimeISO})`);
                    feedArticles.push({
                        headline,
                        link,
                        source: feed.name,
                        pub_time: pubTimeISO,
                        fetch_time: currentTime
                    });
                }
                return feedArticles;
            } catch (e) {
                console.error(`  Error fetching ${feed.name}: ${e.message}`);
                return []; // Return empty array on error to allow other feeds to continue
            }
        });

        // Wait for all feed promises to complete
        const feedResults = await Promise.all(feedPromises);
        
        // Flatten the array of arrays into a single array of articles
        feedResults.forEach(articles => allArticles.push(...articles));

        if (allArticles.length === 0) {
            console.log("No relevant articles from today found to insert.");
            return { newHeadlinesCount: 0, newSources: [] };
        } else {
            console.log(`Found ${allArticles.length} relevant articles from today to insert.`);
        }

        console.log("Fetching complete, starting insertion...");

        // Process articles sequentially for better reliability
        const newHeadlines = [];
        console.log(`Processing ${allArticles.length} articles sequentially for better reliability...`);
        
        for (const article of allArticles) {
            try {
                // Validate article data to prevent database errors
                if (!article.headline || !article.link || !article.source || !article.pub_time) {
                    console.error(`  Skipping invalid article data: ${JSON.stringify(article)}`);
                    continue;
                }
                
                // Check if headline already exists with explicit error handling
                let existingHeadline;
                try {
                    existingHeadline = await getHeadlineByLink(article.link);
                } catch (dbError) {
                    console.error(`  Database lookup error for ${article.link}: ${dbError.message}`);
                    console.error(`  Full error:`, dbError);
                    continue; // Skip this article if lookup fails
                }
                
                if (existingHeadline) {
                    // Update existing headline with explicit error handling
                    try {
                        const updateResult = await updateHeadline(article);
                        console.log(`  Updated '${article.headline}' from ${article.source}`);
                    } catch (updateError) {
                        console.error(`  Failed to update headline '${article.headline}': ${updateError.message}`);
                        console.error(`  Full error:`, updateError);
                    }
                } else {
                    // Insert new headline with explicit error handling
                    try {
                        const insertResult = await insertHeadline(article);
                        console.log(`  Added '${article.headline}' from ${article.source} (Link: ${article.link})`);
                        newHeadlinesCount++;
                        newSources.add(article.source);
                        newHeadlines.push(article);
                    } catch (insertError) {
                        console.error(`  Failed to insert headline '${article.headline}': ${insertError.message}`);
                        console.error(`  Full error:`, insertError);
                    }
                }
            } catch (error) {
                console.error(`  Failed to process '${article.headline}' from ${article.source}: ${error.message}`);
                console.error(`  Full error stack:`, error.stack);
            }
        }
        
        // Get the total count of headlines in the database
        const totalCount = await getHeadlinesCount();
        console.log(`Database now contains ${totalCount} headlines`);

        console.log("\nResults:");
        console.log(`  New Headlines Added: ${newHeadlinesCount}`);
        if (newHeadlinesCount > 0) {
            console.log(`  Sources of New Articles: ${Array.from(newSources).sort().join(", ")}`);
        } else {
            console.log("  No new articles from today found.");
        }
        console.log("-".repeat(50));
        console.log("fetchHeadlines completed.");
        
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