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
}

// WOEID (Where On Earth ID) mapping for countries
const WOEID_MAP: Record<string, number> = {
  US: 23424977,
  GB: 23424975,
  CA: 23424775,
  AU: 23424748,
  DE: 23424829,
  FR: 23424819,
  JP: 23424856,
  BR: 23424768,
  IN: 23424848,
  MX: 23424900,
  ES: 23424950,
  IT: 23424853,
  NL: 23424909,
  SE: 23424954,
  PL: 23424923,
  TR: 23424969,
  SA: 23424938,
  AE: 23424738,
  ZA: 23424942,
  NG: 23424908,
  EG: 23424802,
  KR: 23424868,
  SG: 23424948,
  MY: 23424901,
  PH: 23424934,
  ID: 23424846,
  TH: 23424960,
  VN: 23424984,
  AR: 23424747,
  CL: 23424782,
  CO: 23424787,
  // Worldwide fallback
  WORLD: 1,
};

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

    // Get WOEID for the country, fallback to worldwide
    const woeid = WOEID_MAP[countryCode] || WOEID_MAP.WORLD;
    
    // Fetch trends from X API
    const topics = await fetchTrends(woeid, X_BEARER_TOKEN);

    const response: TrendingResponse = {
      topics,
      location: countryCode || "Worldwide",
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Trending Topics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchTrends(woeid: number, bearerToken: string): Promise<TrendingTopic[]> {
  const trendsUrl = `https://api.twitter.com/1.1/trends/place.json?id=${woeid}`;

  const response = await fetch(trendsUrl, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("X Trends API error:", response.status, errorText);
    
    if (response.status === 401) {
      throw new Error("Invalid X API credentials");
    }
    if (response.status === 429) {
      throw new Error("X API rate limit exceeded");
    }
    throw new Error(`X API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data[0]?.trends) {
    return [];
  }

  // Transform and return top 15 trends
  return data[0].trends.slice(0, 15).map((trend: any) => ({
    name: trend.name,
    url: trend.url,
    tweetVolume: trend.tweet_volume,
    query: trend.query,
  }));
}
