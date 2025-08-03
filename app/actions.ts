"use server"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
}

interface GetNonFollowersResult {
  users?: GitHubUser[]
  error?: string
  isRateLimitError?: boolean
}

const GITHUB_API_BASE_URL = "https://api.github.com"

async function fetchGitHubData(url: string, githubToken?: string): Promise<{ data: any; rateLimitExceeded: boolean }> {
  const headers: HeadersInit = {
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: "application/vnd.github+json",
  }

  if (githubToken) {
    headers.Authorization = `token ${githubToken}`
  }

  const response = await fetch(url, { headers, next: { revalidate: 3600 } }) // Cache for 1 hour

  if (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0") {
    return { data: null, rateLimitExceeded: true }
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  return { data, rateLimitExceeded: false }
}

export async function getNonFollowers(username: string, githubToken?: string): Promise<GetNonFollowersResult> {
  try {
    // Fetch following
    const { data: followingData, rateLimitExceeded: followingRateLimitExceeded } = await fetchGitHubData(
      `${GITHUB_API_BASE_URL}/users/${username}/following?per_page=100`,
      githubToken,
    )
    if (followingRateLimitExceeded) {
      return { error: "GitHub API rate limit exceeded for following. Please provide a token.", isRateLimitError: true }
    }
    const following: GitHubUser[] = followingData

    // Fetch followers
    const { data: followersData, rateLimitExceeded: followersRateLimitExceeded } = await fetchGitHubData(
      `${GITHUB_API_BASE_URL}/users/${username}/followers?per_page=100`,
      githubToken,
    )
    if (followersRateLimitExceeded) {
      return { error: "GitHub API rate limit exceeded for followers. Please provide a token.", isRateLimitError: true }
    }
    const followers: GitHubUser[] = followersData

    const followerLogins = new Set(followers.map((f) => f.login))

    const nonFollowers = following.filter((user) => !followerLogins.has(user.login))

    return { users: nonFollowers }
  } catch (err) {
    console.error("Error in getNonFollowers:", err)
    if (err instanceof Error) {
      // Check for specific rate limit message if it's not caught by status code
      if (err.message.includes("API rate limit exceeded")) {
        return { error: "GitHub API rate limit exceeded. Please provide a token.", isRateLimitError: true }
      }
      return { error: err.message }
    }
    return { error: "An unknown error occurred." }
  }
}
