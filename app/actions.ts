"use server"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
  followers?: number
  following?: number
  public_repos?: number
  // Removed public_gists
}

interface GetNonFollowersResult {
  users?: GitHubUser[]
  error?: string
  isRateLimitError?: boolean // Indicates a critical rate limit error (e.g., for main following/followers lists)
  hasPartialDataError?: boolean // Indicates some supplementary data (like stars) couldn't be fetched
}

const GITHUB_API_BASE_URL = "https://api.github.com"

async function fetchGitHubApi(
  path: string,
  token?: string,
  page = 1,
  per_page = 100,
): Promise<any[] | { error: string; isRateLimitError?: boolean }> {
  const headers: HeadersInit = {
    "X-GitHub-Api-Version": "2022-11-28",
    Accept: "application/vnd.github+json",
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const url = `${GITHUB_API_BASE_URL}${path}?page=${page}&per_page=${per_page}`

  try {
    const response = await fetch(url, { headers, next: { revalidate: 3600 } }) // Revalidate every hour

    if (response.status === 403 && response.headers.get("X-RateLimit-Remaining") === "0") {
      return {
        error: "GitHub API rate limit exceeded. Please provide a Personal Access Token.",
        isRateLimitError: true,
      }
    }

    if (!response.ok) {
      const errorData = await response.json()
      return { error: errorData.message || `GitHub API error: ${response.status}`, isRateLimitError: false }
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching from GitHub API:", error)
    return { error: "Failed to connect to GitHub API.", isRateLimitError: false }
  }
}

async function fetchAllPages(
  path: string,
  token?: string,
): Promise<any[] | { error: string; isRateLimitError?: boolean }> {
  let allData: any[] = []
  let page = 1
  let hasMore = true

  while (hasMore) {
    const data = await fetchGitHubApi(path, token, page)

    if ("error" in data) {
      return data // Propagate error
    }

    if (data.length === 0 || data.length < 100) {
      hasMore = false
    }
    allData = allData.concat(data)
    page++
  }
  return allData
}

async function getUserDetails(username: string, token?: string): Promise<GitHubUser | null> {
  const userData = await fetchGitHubApi(`/users/${username}`, token)
  if ("error" in userData) {
    return null // Return null if user details cannot be fetched
  }
  return {
    login: userData.login,
    avatar_url: userData.avatar_url,
    html_url: userData.html_url,
    followers: userData.followers,
    following: userData.following,
    public_repos: userData.public_repos,
    // Removed public_gists
  }
}

export async function getNonFollowers(
  username: string,
  token?: string,
  checkType: "not-following-back" | "not-followed-back" = "not-following-back",
): Promise<GetNonFollowersResult> {
  if (!username) {
    return { error: "Username cannot be empty." }
  }

  const userDetails = await getUserDetails(username, token)
  if (!userDetails) {
    return { error: `Could not find GitHub user: ${username}.`, isRateLimitError: false }
  }

  let followingData: any[] | { error: string; isRateLimitError?: boolean }
  let followersData: any[] | { error: string; isRateLimitError?: boolean }

  // Fetch both lists regardless of checkType, as both are needed for comparison
  followingData = await fetchAllPages(`/users/${username}/following`, token)
  followersData = await fetchAllPages(`/users/${username}/followers`, token)

  if ("error" in followingData) {
    return followingData // Propagate critical error
  }
  if ("error" in followersData) {
    return followersData // Propagate critical error
  }

  const followingSet = new Set((followingData as any[]).map((user) => user.login.toLowerCase()))
  const followersSet = new Set((followersData as any[]).map((user) => user.login.toLowerCase()))

  let nonFollowersLogins: string[] = []

  if (checkType === "not-following-back") {
    // Users I follow who don't follow me back
    nonFollowersLogins = (followingData as any[])
      .filter((user) => !followersSet.has(user.login.toLowerCase()))
      .map((user) => user.login)
  } else {
    // Users who follow me but I don't follow back
    nonFollowersLogins = (followersData as any[])
      .filter((user) => !followingSet.has(user.login.toLowerCase()))
      .map((user) => user.login)
  }

  const usersWithDetails: GitHubUser[] = []
  let hasPartialDataError = false

  for (const login of nonFollowersLogins) {
    const details = await getUserDetails(login, token)
    if (details) {
      usersWithDetails.push(details)
    } else {
      hasPartialDataError = true
    }
  }

  return {
    users: usersWithDetails,
    hasPartialDataError: hasPartialDataError,
    error: hasPartialDataError ? "Some user details could not be fetched due to GitHub API rate limit." : undefined,
  }
}
