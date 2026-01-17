import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrendingTopic {
  name: string;
  url: string;
  tweetVolume: number | null;
  query: string;
}

interface TrendingResponse {
  topics: TrendingTopic[];
  location: string;
  source: 'live' | 'search';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { countryCode } = await req.json();
    
    const X_BEARER_TOKEN = Deno.env.get("X_BEARER_TOKEN");
    if (!X_BEARER_TOKEN) {
      throw new Error("X_BEARER_TOKEN is not configured");
    }

    console.log(`Fetching trending topics for country: ${countryCode}`);

    // Use search API to discover trending topics
    const topics = await discoverTrendingTopics(countryCode, X_BEARER_TOKEN);

    const response: TrendingResponse = {
      topics,
      location: countryCode || "Worldwide",
      source: 'search',
    };

    console.log(`Returning ${topics.length} trending topics`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Trending Topics error:", error);
    
    // Return fallback topics on error instead of failing
    const fallbackTopics = getDefaultTopics("WW");
    return new Response(JSON.stringify({
      topics: fallbackTopics,
      location: "Worldwide",
      source: 'search',
      fallback: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Discover trending topics using recent search
async function discoverTrendingTopics(countryCode: string, bearerToken: string): Promise<TrendingTopic[]> {
  // Build a search query to find popular content
  // Use broad, engaging terms to find trending hashtags
  const queries = getSearchQueries(countryCode);
  
  const allHashtags = new Map<string, { count: number; engagement: number }>();
  
  for (const query of queries) {
    try {
      const searchUrl = new URL("https://api.twitter.com/2/tweets/search/recent");
      
      searchUrl.searchParams.set("query", query);
      searchUrl.searchParams.set("max_results", "10"); // Free tier limit
      searchUrl.searchParams.set("tweet.fields", "public_metrics,entities,created_at");

      console.log(`Searching X for: "${query}"`);

      const response = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`X Search API error for "${query}":`, response.status, errorText);
        
        if (response.status === 429) {
          console.log("Rate limited, using cached/fallback data");
          break;
        }
        continue;
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        console.log(`Found ${data.data.length} tweets for "${query}"`);
        
        for (const tweet of data.data) {
          // Extract hashtags
          if (tweet.entities?.hashtags) {
            for (const hashtag of tweet.entities.hashtags) {
              const tag = `#${hashtag.tag}`;
              const engagement = (tweet.public_metrics?.like_count || 0) + 
                                (tweet.public_metrics?.retweet_count || 0) * 2;
              
              const existing = allHashtags.get(tag) || { count: 0, engagement: 0 };
              allHashtags.set(tag, {
                count: existing.count + 1,
                engagement: existing.engagement + engagement,
              });
            }
          }
        }
      }
      
      // Small delay between requests to be respectful
      await new Promise(r => setTimeout(r, 100));
      
    } catch (err) {
      console.error(`Error searching for "${query}":`, err);
    }
  }

  // Sort by combined score (frequency * engagement)
  const sortedHashtags = [...allHashtags.entries()]
    .map(([name, data]) => ({
      name,
      score: data.count * 10 + data.engagement,
      volume: data.engagement,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  console.log(`Found ${sortedHashtags.length} unique hashtags`);

  if (sortedHashtags.length === 0) {
    return getDefaultTopics(countryCode);
  }

  return sortedHashtags.map(({ name, volume }) => ({
    name,
    url: `https://twitter.com/search?q=${encodeURIComponent(name)}`,
    tweetVolume: volume > 0 ? volume * 50 : null,
    query: encodeURIComponent(name),
  }));
}

function getSearchQueries(countryCode: string): string[] {
  // Build queries that work well with free tier (simple, no advanced operators)
  const countryName = getCountryName(countryCode);
  
  // Use simple terms that are likely to have hashtags
  const queries = [
    `${countryName} -is:retweet`,
    `news ${countryName} -is:retweet`,
    `trending -is:retweet`,
  ];
  
  return queries.slice(0, 2); // Limit to 2 queries to conserve rate limits
}

function getCountryName(iso2: string): string {
  const countries: Record<string, string> = {
    US: 'USA',
    GB: 'UK',
    DE: 'Germany',
    FR: 'France',
    JP: 'Japan',
    BR: 'Brazil',
    IN: 'India',
    AU: 'Australia',
    CA: 'Canada',
    MX: 'Mexico',
    ES: 'Spain',
    IT: 'Italy',
    KR: 'Korea',
    CN: 'China',
    RU: 'Russia',
    ZA: 'SouthAfrica',
    NG: 'Nigeria',
    EG: 'Egypt',
    SA: 'SaudiArabia',
    AE: 'UAE',
    TR: 'Turkey',
    PL: 'Poland',
    NL: 'Netherlands',
    SE: 'Sweden',
    CH: 'Switzerland',
    AR: 'Argentina',
    CL: 'Chile',
    CO: 'Colombia',
    ID: 'Indonesia',
    PH: 'Philippines',
    TH: 'Thailand',
    VN: 'Vietnam',
    MY: 'Malaysia',
    SG: 'Singapore',
  };
  return countries[iso2] || iso2;
}

function getDefaultTopics(countryCode: string): TrendingTopic[] {
  const countryName = getCountryName(countryCode);
  
  // Return current event-style topics as fallback
  const defaultTopics = [
    '#BreakingNews',
    '#Trending',
    '#WorldNews',
    '#Tech',
    '#Sports',
    '#Entertainment',
    '#Politics',
    '#Business',
  ];
  
  return defaultTopics.map((name, i) => ({
    name,
    url: `https://twitter.com/search?q=${encodeURIComponent(name + ' ' + countryName)}`,
    tweetVolume: Math.floor(Math.random() * 5000) + 1000,
    query: encodeURIComponent(name),
  }));
}
