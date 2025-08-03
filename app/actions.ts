"use server"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
  followers?: number // Added for user profile details
  following?: number // Added for user profile details
  public_repos?: number // Added for user profile details
  public_gists?: number // Added for user profile details
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

export async function getNonFollowers(
  username: string,
  githubToken?: string,
  checkType: "not-following-back" | "not-followed-back" = "not-following-back",
): Promise<GetNonFollowersResult> {
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

    let resultUsers: GitHubUser[] = []

    if (checkType === "not-following-back") {
      // Find users the target username follows who don't follow them back
      const followerLogins = new Set(followers.map((f) => f.login))
      resultUsers = following.filter((user) => !followerLogins.has(user.login))
    } else if (checkType === "not-followed-back") {
      // Find users who follow the target username, but the target username doesn't follow them back
      const followingLogins = new Set(following.map((f) => f.login))
      resultUsers = followers.filter((user) => !followingLogins.has(user.login))
    }

    // Fetch full profile data for each user in the resultUsers list
    const usersWithDetails = await Promise.all(
      resultUsers.map(async (user) => {
        const { data: userProfileData, rateLimitExceeded: userProfileRateLimitExceeded } = await fetchGitHubData(
          `${GITHUB_API_BASE_URL}/users/${user.login}`,
          githubToken,
        )
        if (userProfileRateLimitExceeded) {
          // If rate limit hit during profile fetch, return partial data and indicate error
          return {
            ...user,
            error: "Rate limit hit while fetching user details. Some details might be missing.",
            isRateLimitError: true,
          }
        }
        return {
          ...user,
          followers: userProfileData.followers,
          following: userProfileData.following,
          public_repos: userProfileData.public_repos,
          public_gists: userProfileData.public_gists,
        }
      }),
    )

    // Check if any of the individual profile fetches hit a rate limit
    const anyRateLimitError = usersWithDetails.some((user) => (user as any).isRateLimitError)
    if (anyRateLimitError) {
      return {
        users: usersWithDetails,
        error: "Some user details could not be fetched due to GitHub API rate limit. Please provide a token.",
        isRateLimitError: true,
      }
    }

    return { users: usersWithDetails }
  } catch (err) {
    console.error("Error in getNonFollowers:", err)
    if (err instanceof Error) {
      if (err.message.includes("API rate limit exceeded")) {
        return { error: "GitHub API rate limit exceeded. Please provide a token.", isRateLimitError: true }
      }
      return { error: err.message }
    }
    return { error: "An unknown error occurred." }
  }
}
