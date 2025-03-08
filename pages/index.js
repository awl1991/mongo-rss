import styles from '../styles/Home.module.css';
import { useEffect, useState, useCallback } from 'react';
import { formatDatetimeToCentral, isNewHeadline } from '../lib/utils';

export default function Home() {
    const [headlines, setHeadlines] = useState([]);
    const [lastFetchTime, setLastFetchTime] = useState('0');
    const [currentFetchTime, setCurrentFetchTime] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredHeadlines, setFilteredHeadlines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to fetch headlines
    const fetchHeadlines = useCallback(async () => {
        try {
            const response = await fetch('/api/headlines');
            if (!response.ok) {
                // Try to extract detailed error information from the response
                let errorDetails = `HTTP error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorDetails = `${errorData.error}${errorData.details ? ': ' + errorData.details : ''}${errorData.code ? ' (Code: ' + errorData.code + ')' : ''}`;
                    }
                } catch (e) {
                    // If we can't parse the JSON, just use the status
                    console.error("Could not parse error response:", e);
                }
                
                setError(errorDetails);
                throw new Error(errorDetails);
            }
            
            let newHeadlines;
            try {
                newHeadlines = await response.json();
                
                // Ensure we have an array to work with
                if (!Array.isArray(newHeadlines)) {
                    console.error("Expected array but received:", typeof newHeadlines);
                    // If we receive an object with error details, show it
                    if (newHeadlines && newHeadlines.error) {
                        setError(`API error: ${newHeadlines.error}`);
                    } else {
                        setError("Invalid data format received from API");
                    }
                    return; // Exit function on error
                }
            } catch (parseError) {
                console.error("JSON parse error:", parseError);
                setError(`Failed to parse API response: ${parseError.message}`);
                return; // Exit function on parse error
            }
            
            const validHeadlines = newHeadlines.filter(h => h && h.headline && h.pub_time_raw);
            
            // Log if we filtered out any invalid headlines
            if (validHeadlines.length < newHeadlines.length) {
                console.warn(`Filtered out ${newHeadlines.length - validHeadlines.length} invalid headlines`);
            }
            
            setHeadlines(prevHeadlines => {
                // If this is the first fetch, just set the headlines
                if (prevHeadlines.length === 0) {
                    const sortedInitial = validHeadlines.sort(
                        (a, b) => new Date(b.pub_time_raw) - new Date(a.pub_time_raw)
                    );
                    
                    if (sortedInitial.length > 0) {
                        const latestFetchTime = sortedInitial[0].fetch_time;
                        setLastFetchTime(latestFetchTime);
                        setCurrentFetchTime(latestFetchTime);
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('lastFetchTime', latestFetchTime);
                        }
                    }
                    
                    return sortedInitial;
                }
                
                // Otherwise, merge with existing headlines
                // Find any new headlines not already in state
                const existingLinks = new Set(prevHeadlines.map(h => h.link));
                const brandNewHeadlines = validHeadlines.filter(h => !existingLinks.has(h.link));
                
                if (brandNewHeadlines.length > 0) {
                    console.log(`Found ${brandNewHeadlines.length} new headlines`);
                    
                    // Merge, sort, and limit to 500
                    const mergedHeadlines = [...brandNewHeadlines, ...prevHeadlines];
                    const sortedHeadlines = mergedHeadlines
                        .sort((a, b) => new Date(b.pub_time_raw) - new Date(a.pub_time_raw))
                        .slice(0, 500);
                    
                    // Update the current fetch time if we have new headlines
                    if (brandNewHeadlines.length > 0) {
                        const newestHeadline = brandNewHeadlines.reduce(
                            (newest, headline) => 
                                new Date(headline.fetch_time) > new Date(newest.fetch_time) 
                                    ? headline 
                                    : newest,
                            brandNewHeadlines[0]
                        );
                        
                        setCurrentFetchTime(newestHeadline.fetch_time);
                        setLastFetchTime(newestHeadline.fetch_time);
                        
                        if (typeof window !== 'undefined') {
                            localStorage.setItem('lastFetchTime', newestHeadline.fetch_time);
                        }
                    }
                    
                    return sortedHeadlines;
                }
                
                return prevHeadlines;
            });
            
            setLoading(false);
            setError(null); // Clear any previous errors on success
        } catch (error) {
            console.error("Error fetching headlines:", error);
            setLoading(false);
            // Error is already set in the HTTP error handling above
        }
    }, []);

    // Function to fetch new headlines directly from RSS feeds
    const fetchFreshHeadlines = useCallback(async () => {
        console.log("Fetching fresh headlines from RSS sources...");
        try {
            const response = await fetch('/api/fetchHeadlines');
            const data = await response.json();
            console.log("Fresh headlines fetch result:", data);
            
            // After fetching fresh headlines, get the updated list
            fetchHeadlines();
        } catch (error) {
            console.error("Error fetching fresh headlines:", error);
            // Fall back to just fetching from database
            fetchHeadlines();
        }
    }, [fetchHeadlines]);

    useEffect(() => {
        // Restore last fetch time from localStorage
        const storedFetchTime = typeof window !== 'undefined' ? localStorage.getItem('lastFetchTime') || '0' : '0';
        setLastFetchTime(storedFetchTime);

        // Check if this is a page refresh by using performance navigation type
        const isPageRefresh = typeof window !== 'undefined' && 
            window.performance && 
            window.performance.navigation && 
            window.performance.navigation.type === 1;
            
        // Create a key for session storage to track initial page load vs. refresh
        const pageLoadKey = 'initialPageLoad';
        const isFirstLoad = typeof window !== 'undefined' && !sessionStorage.getItem(pageLoadKey);
        
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(pageLoadKey, 'loaded');
        }

        // Initialize fetcher
        fetch('/api/initFetcher')
            .then(res => res.json())
            .then(data => {
                console.log(data.message);
                
                // For page refresh, fetch fresh headlines from RSS
                if (isPageRefresh) {
                    console.log("Page refresh detected - fetching fresh headlines");
                    fetchFreshHeadlines();
                } else if (isFirstLoad) {
                    console.log("Initial page load - using cached headlines");
                    fetchHeadlines();
                } else {
                    console.log("Normal navigation - using cached headlines");
                    fetchHeadlines();
                }
            })
            .catch(err => {
                console.error("Error initializing fetcher:", err);
                setError(`Failed to initialize: ${err.message}`);
                // Try to fetch headlines anyway
                fetchHeadlines();
            });

        // Set up polling for new headlines (every 15 seconds)
        const pollingInterval = setInterval(() => {
            console.log("Polling for new headlines...");
            fetchHeadlines();
        }, 15000); // 15 seconds
        
        // Set up polling for fresh RSS headlines (every 5 minutes)
        const rssFetchInterval = setInterval(() => {
            console.log("Triggering fresh RSS headline fetch...");
            fetch('/api/initFetcher')
                .then(res => res.json())
                .then(data => {
                    console.log("Fresh RSS fetch result:", data);
                    if (data.newHeadlinesCount > 0) {
                        console.log(`Added ${data.newHeadlinesCount} new headlines from sources: ${data.newSources.join(', ')}`);
                    }
                })
                .catch(err => console.error("Error fetching fresh RSS headlines:", err));
        }, 300000); // 5 minutes (300,000 ms)

        // Clean up on component unmount
        return () => {
            clearInterval(pollingInterval);
            clearInterval(rssFetchInterval);
        };
    }, [fetchHeadlines, fetchFreshHeadlines]);

    // Update filtered headlines whenever headlines or searchTerm changes
    useEffect(() => {
        const filtered = headlines.filter(headline => 
            headline.headline.toLowerCase().includes(searchTerm.toLowerCase()) ||
            headline.source.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredHeadlines(filtered);
        console.log("Filtering headlines with term:", searchTerm, "Results:", filtered.length);
    }, [headlines, searchTerm]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        console.log("Search term changed to:", value);
        setSearchTerm(value);
    };

    if (loading && !headlines.length) return <div className={styles.noHeadlines}>Loading headlines...</div>;

    return (
        <div>
            <div className={styles.headerContainer}>
                <h1>Latest Political Headlines ({filteredHeadlines.length})</h1>
                <div className={styles.searchContainer}>
                    <input 
                        type="text"
                        placeholder="Search headlines..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
            
            {/* Display error message if there is one */}
            {error && (
                <div className={styles.errorMessage || 'error-message'}>
                    <h3>Error Loading Headlines</h3>
                    <p>{error}</p>
                    <p>Please check your connection and try again. If the issue persists, contact support.</p>
                </div>
            )}
            
            <div className={styles.tileContainer}>
                {filteredHeadlines.length > 0 ? (
                    filteredHeadlines.map((headline, index) => {
                        const pubTime = headline.pub_time || "Unknown date";
                        const [datePart, timePart] = pubTime.includes(' at ') ? pubTime.split(' at ') : [pubTime, ''];
                        const isNewlyAdded = currentFetchTime && headline.fetch_time === currentFetchTime;
                        return (
                            <div
                                key={`${headline.link}-${index}`}
                                className={`${styles.tile} ${index === 0 && headline.fetch_time > lastFetchTime ? styles.slideIn : ''}`}
                            >
                                <div className={styles.tileContent}>
                                    <div className={styles.outletBox}>
                                        {headline.source}
                                        {headline.is_new && (
                                            <span className={`${styles.newIndicator} ${isNewlyAdded ? styles.blink : ''}`}></span>
                                        )}
                                    </div>
                                    <h3 className={styles.headline}>
                                        <a href={headline.link} target="_blank" rel="noopener noreferrer">
                                            {headline.headline}
                                        </a>
                                    </h3>
                                    <p className={styles.sourceTime}>
                                        Published: {datePart} at <strong>{timePart || 'N/A'}</strong>
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className={styles.noHeadlines}>
                        {loading ? "Loading headlines..." : "No headlines available."}
                    </p>
                )}
            </div>
        </div>
    );
}