"use server"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
  followers?: number
  following?: number
  public_repos?: number
  public_gists?: number
  total_stars?: number
}

interface GetNonFollowersResult {
  users?: GitHubUser[]
  error?: string
  isRateLimitError?: boolean // Indicates a critical rate limit error (e.g., for main following/followers lists)
  hasPartialDataError?: boolean // Indicates some supplementary data (like stars) couldn't be fetched
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
  let criticalRateLimitHit = false
  let partialDataRateLimitHit = false

  try {
    // Fetch following
    const { data: followingData, rateLimitExceeded: followingRateLimitExceeded } = await fetchGitHubData(
      `${GITHUB_API_BASE_URL}/users/${username}/following?per_page=100`,
      githubToken,
    )
    if (followingRateLimitExceeded) {
      criticalRateLimitHit = true
      return { error: "GitHub API rate limit exceeded for following. Please provide a token.", isRateLimitError: true }
    }
    const following: GitHubUser[] = followingData

    // Fetch followers
    const { data: followersData, rateLimitExceeded: followersRateLimitExceeded } = await fetchGitHubData(
      `${GITHUB_API_BASE_URL}/users/${username}/followers?per_page=100`,
      githubToken,
    )
    if (followersRateLimitExceeded) {
      criticalRateLimitHit = true
      return { error: "GitHub API rate limit exceeded for followers. Please provide a token.", isRateLimitError: true }
    }
    const followers: GitHubUser[] = followersData

    let resultUsers: GitHubUser[] = []

    if (checkType === "not-following-back") {
      const followerLogins = new Set(followers.map((f) => f.login))
      resultUsers = following.filter((user) => !followerLogins.has(user.login))
    } else if (checkType === "not-followed-back") {
      const followingLogins = new Set(following.map((f) => f.login))
      resultUsers = followers.filter((user) => !followingLogins.has(user.login))
    }

    // Fetch full profile data for each user in the resultUsers list, including total stars
    const usersWithDetails = await Promise.all(
      resultUsers.map(async (user) => {
        const userDetails: GitHubUser = { ...user }

        // Fetch user profile details (followers, following, public_repos, public_gists)
        try {
          const { data: userProfileData, rateLimitExceeded: userProfileRateLimitExceeded } = await fetchGitHubData(
            `${GITHUB_API_BASE_URL}/users/${user.login}`,
            githubToken,
          )
          if (userProfileRateLimitExceeded) {
            partialDataRateLimitHit = true
            // Do not set criticalRateLimitHit here, as main data is already fetched
          } else {
            userDetails.followers = userProfileData.followers
            userDetails.following = userProfileData.following
            userDetails.public_repos = userProfileData.public_repos
            userDetails.public_gists = userProfileData.public_gists
          }
        } catch (profileErr) {
          console.warn(`Could not fetch profile for ${user.login}:`, profileErr)
          partialDataRateLimitHit = true
        }

        // Fetch repositories and sum stars
        let totalStars = 0
        let currentPage = 1
        let hasNextPage = true
        let reposRateLimitHitForUser = false

        while (hasNextPage && !reposRateLimitHitForUser) {
          try {
            const { data: reposData, rateLimitExceeded: tempReposRateLimitExceeded } = await fetchGitHubData(
              `${GITHUB_API_BASE_URL}/users/${user.login}/repos?per_page=100&page=${currentPage}`,
              githubToken,
            )

            if (tempReposRateLimitExceeded) {
              reposRateLimitHitForUser = true
              partialDataRateLimitHit = true
              break
            }

            if (!Array.isArray(reposData) || reposData.length === 0) {
              hasNextPage = false
            } else {
              for (const repo of reposData) {
                if (repo.stargazers_count !== undefined) {
                  totalStars += repo.stargazers_count
                }
              }
              if (reposData.length < 100) {
                hasNextPage = false
              } else {
                currentPage++
              }
            }
          } catch (reposErr) {
            console.warn(`Could not fetch repos for ${user.login}:`, reposErr)
            reposRateLimitHitForUser = true
            partialDataRateLimitHit = true
            break
          }
        }
        userDetails.total_stars = reposRateLimitHitForUser ? undefined : totalStars

        return userDetails
      }),
    )

    const result: GetNonFollowersResult = { users: usersWithDetails }
    if (partialDataRateLimitHit) {
      result.hasPartialDataError = true
      result.error =
        "Some user details (like star counts) could not be fetched due to GitHub API rate limit. Please provide a token for full details."
    }
    return result
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
