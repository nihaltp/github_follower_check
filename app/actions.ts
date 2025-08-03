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

/**
 * Parses the Link header from a GitHub API response to find the 'next' page URL.
 * @param linkHeader The value of the 'Link' header.
 * @returns The URL for the next page, or null if not found.
 */
function parseLinkHeader(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null
  }
  const links = linkHeader.split(",").map((link) => link.trim())
  for (const link of links) {
    const parts = link.split(";")
    const url = parts[0].replace(/<|>|\s/g, "")
    const rel = parts[1].trim()
    if (rel === 'rel="next"') {
      return url
    }
  }
  return null
}

/**
 * Fetches all pages of data from a GitHub API endpoint that supports pagination.
 * @param initialUrl The initial URL to fetch.
 * @returns A promise that resolves to an array of all fetched GitHubUser objects.
 */
async function fetchAllPages(initialUrl: string): Promise<GitHubUser[]> {
  let allUsers: GitHubUser[] = []
  let currentUrl: string | null = initialUrl

  while (currentUrl) {
    const response = await fetch(currentUrl, {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
      // Revalidate cache for 1 hour, but subsequent pages will be fetched live if needed
      next: { revalidate: 3600 },
    })

    if (!response.ok) {
      // Propagate error if any page fails to fetch
      const errorData = await response.json()
      throw new Error(`Failed to fetch data from ${currentUrl}: ${errorData.message || response.statusText}`)
    }

    const users: GitHubUser[] = await response.json()
    allUsers = allUsers.concat(users)

    const linkHeader = response.headers.get("Link")
    currentUrl = parseLinkHeader(linkHeader)
  }

  return allUsers
}

export async function getNonFollowers(username: string): Promise<GetNonFollowersResult> {
  if (!username) {
    return { error: "Username cannot be empty." }
  }

  try {
    // Fetch all following users
    const following = await fetchAllPages(`${GITHUB_API_BASE_URL}/users/${username}/following?per_page=100`)

    // Fetch all followers
    const followers = await fetchAllPages(`${GITHUB_API_BASE_URL}/users/${username}/followers?per_page=100`)

    // Create a Set of follower logins for efficient lookup
    const followerLogins = new Set(followers.map((f) => f.login))

    // Filter the following list: keep users who are NOT in the followerLogins set
    const nonFollowers = following.filter((f) => !followerLogins.has(f.login))

    return { users: nonFollowers }
  } catch (error: any) {
    console.error("Error in getNonFollowers:", error.message)
    // Check for specific GitHub API errors like user not found
    if (error.message.includes("Not Found")) {
      return { error: `GitHub user "${username}" not found.` }
    }
    return { error: `An unexpected error occurred: ${error.message}` }
  }
}
