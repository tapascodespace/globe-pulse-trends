import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface XPost {
  id: string;
  text: string;
  author: string;
  authorHandle: string;
  timestamp: string;
  engagement: number;
  likes: number;
  retweets: number;
  replies: number;
}

interface SearchResponse {
  posts: XPost[];
  summary?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, countryCode, topics } = await req.json();
    
    const X_BEARER_TOKEN = Deno.env.get("X_BEARER_TOKEN");
    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");

    if (!X_BEARER_TOKEN) {
      throw new Error("X_BEARER_TOKEN is not configured");
    }

    // Build search query for the country
    const searchQuery = buildSearchQuery(country, topics);
    
    // Fetch posts from X API
    const posts = await fetchXPosts(searchQuery, X_BEARER_TOKEN);
    
    // Generate AI summary if we have posts and xAI key
    let summary: string | undefined;
    if (posts.length > 0 && XAI_API_KEY) {
      summary = await generateGrokSummary(posts, country, XAI_API_KEY);
    }

    const response: SearchResponse = { posts, summary };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("X Feed error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildSearchQuery(country: string, topics?: string[]): string {
  // Build a query to find trending discussions about a country
  let query = `(${country})`;
  
  // Add topic filters if provided
  if (topics && topics.length > 0) {
    const topicQuery = topics.slice(0, 3).map(t => `"${t}"`).join(" OR ");
    query = `(${country}) (${topicQuery})`;
  }
  
  // Filter for English, exclude retweets, require some engagement
  query += " lang:en -is:retweet min_faves:10";
  
  return query;
}

async function fetchXPosts(query: string, bearerToken: string): Promise<XPost[]> {
  const searchUrl = new URL("https://api.twitter.com/2/tweets/search/recent");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("max_results", "20");
  searchUrl.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
  searchUrl.searchParams.set("expansions", "author_id");
  searchUrl.searchParams.set("user.fields", "name,username");

  const response = await fetch(searchUrl.toString(), {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("X API error:", response.status, errorText);
    
    if (response.status === 401) {
      throw new Error("Invalid X API credentials");
    }
    if (response.status === 429) {
      throw new Error("X API rate limit exceeded");
    }
    throw new Error(`X API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    return [];
  }

  // Create user map for quick lookup
  const userMap = new Map<string, { name: string; username: string }>();
  if (data.includes?.users) {
    for (const user of data.includes.users) {
      userMap.set(user.id, { name: user.name, username: user.username });
    }
  }

  // Transform to our format
  return data.data.map((tweet: any) => {
    const user = userMap.get(tweet.author_id) || { name: "Unknown", username: "unknown" };
    const metrics = tweet.public_metrics || {};
    
    return {
      id: tweet.id,
      text: tweet.text,
      author: user.name,
      authorHandle: `@${user.username}`,
      timestamp: formatTimeAgo(new Date(tweet.created_at)),
      engagement: (metrics.like_count || 0) + (metrics.retweet_count || 0) + (metrics.reply_count || 0),
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
    };
  });
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

async function generateGrokSummary(posts: XPost[], country: string, apiKey: string): Promise<string> {
  const postTexts = posts.slice(0, 10).map(p => `- ${p.text}`).join("\n");
  
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: "You are a news analyst. Provide a brief, insightful 2-3 sentence summary of trending discussions. Be factual and balanced.",
        },
        {
          role: "user",
          content: `Summarize the main themes and sentiment from these recent posts about ${country}:\n\n${postTexts}`,
        },
      ],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    console.error("Grok API error:", response.status);
    return "";
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}
