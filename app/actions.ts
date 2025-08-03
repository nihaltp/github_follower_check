"use server"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
}

interface GetNonFollowersResult {
  users?: GitHubUser[]
  error?: string
}

const GITHUB_API_BASE_URL = "https://api.github.com"

export async function getNonFollowers(username: string): Promise<GetNonFollowersResult> {
  if (!username) {
    return { error: "Username cannot be empty." }
  }

  try {
    // Fetch following list
    const followingResponse = await fetch(`${GITHUB_API_BASE_URL}/users/${username}/following?per_page=100`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!followingResponse.ok) {
      if (followingResponse.status === 404) {
        return { error: `GitHub user "${username}" not found.` }
      }
      const errorData = await followingResponse.json()
      return { error: `Failed to fetch following list: ${errorData.message || followingResponse.statusText}` }
    }
    const following: GitHubUser[] = await followingResponse.json()

    // Fetch followers list
    const followersResponse = await fetch(`${GITHUB_API_BASE_URL}/users/${username}/followers?per_page=100`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!followersResponse.ok) {
      const errorData = await followersResponse.json()
      return { error: `Failed to fetch followers list: ${errorData.message || followersResponse.statusText}` }
    }
    const followers: GitHubUser[] = await followersResponse.json()

    // Create a Set of follower logins for efficient lookup
    const followerLogins = new Set(followers.map((f) => f.login))

    // Filter the following list: keep users who are NOT in the followerLogins set
    const nonFollowers = following.filter((f) => !followerLogins.has(f.login))

    return { users: nonFollowers }
  } catch (error) {
    console.error("Error in getNonFollowers:", error)
    return { error: "An unexpected error occurred while processing your request." }
  }
}
