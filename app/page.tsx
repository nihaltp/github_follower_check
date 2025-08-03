"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Github, Users, GitPullRequest, Star } from "lucide-react" // Added Users, GitPullRequest, Star icons

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { getNonFollowers } from "./actions"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
  followers?: number
  following?: number
  public_repos?: number
  public_gists?: number
}

export default function Home() {
  const [username, setUsername] = useState("")
  const [results, setResults] = useState<GitHubUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedUsername, setSearchedUsername] = useState<string | null>(null)
  const [showInlineTokenInput, setShowInlineTokenInput] = useState(false)
  const [tempGithubToken, setTempGithubToken] = useState("")
  const [checkType, setCheckType] = useState<"not-following-back" | "not-followed-back">("not-following-back")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResults([])
    setLoading(true)
    setSearchedUsername(username)

    try {
      const data = await getNonFollowers(username, tempGithubToken, checkType)
      if (data.error) {
        setError(data.error)
        if (data.isRateLimitError) {
          setShowInlineTokenInput(true)
        } else {
          setShowInlineTokenInput(false)
          setTempGithubToken("")
        }
      } else {
        setResults(data.users || [])
        setShowInlineTokenInput(false)
        setTempGithubToken("")
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError("An unexpected error occurred. Please try again.")
      setShowInlineTokenInput(false)
    } finally {
      setLoading(false)
    }
  }

  const getResultTitle = () => {
    if (checkType === "not-following-back") {
      return `Users ${searchedUsername} follows who don't follow back:`
    } else {
      return `Users who follow ${searchedUsername} but ${searchedUsername} doesn't follow back:`
    }
  }

  const getNoResultsMessage = () => {
    if (searchedUsername === username) {
      if (checkType === "not-following-back") {
        return `No users found that ${username} follows but don't follow back.`
      } else {
        return `No users found who follow ${username} but ${username} doesn't follow back.`
      }
    } else {
      return "Enter a username to start searching."
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Github className="w-6 h-6" /> GitHub Follower Checker
          </CardTitle>
          <p className="text-muted-foreground">
            Find out who you follow on GitHub that doesn't follow you back, or vice versa.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Enter GitHub username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full"
            />

            <RadioGroup
              value={checkType}
              onValueChange={(value: "not-following-back" | "not-followed-back") => setCheckType(value)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not-following-back" id="option-1" />
                <Label htmlFor="option-1">Users I follow who don't follow me back</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="not-followed-back" id="option-2" />
                <Label htmlFor="option-2">Users who follow me but I don't follow back</Label>
              </div>
            </RadioGroup>

            {showInlineTokenInput && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  You've hit the unauthenticated GitHub API rate limit. Please provide a GitHub Personal Access Token
                  (PAT) to continue. Generate one at{" "}
                  <Link
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    GitHub Settings &gt; Developer settings &gt; Personal access tokens
                  </Link>
                  . Ensure it has at least the `public_repo` scope.
                </p>
                <Input
                  type="password"
                  placeholder="Enter your GitHub PAT"
                  value={tempGithubToken}
                  onChange={(e) => setTempGithubToken(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : showInlineTokenInput ? (
                "Use Token and Retry"
              ) : (
                "Check Followers"
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 text-center text-red-500 p-3 bg-red-100 dark:bg-red-900 rounded-md">{error}</div>
          )}

          {!loading && searchedUsername && results.length === 0 && !error && !showInlineTokenInput && (
            <div className="mt-6 text-center text-muted-foreground">
              <p>{getNoResultsMessage()}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold text-center">{getResultTitle()}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((user) => (
                  <Card key={user.login} className="flex flex-col items-center p-3 gap-3 text-center">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={`${user.login}'s avatar`} />
                      <AvatarFallback>{user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link
                        href={user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline text-lg"
                      >
                        {user.login}
                      </Link>
                      <div className="mt-2 text-sm text-muted-foreground flex flex-wrap justify-center gap-x-4 gap-y-2">
                        {user.followers !== undefined && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{user.followers} Followers</span>
                          </div>
                        )}
                        {user.following !== undefined && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{user.following} Following</span>
                          </div>
                        )}
                        {user.public_repos !== undefined && (
                          <div className="flex items-center gap-1">
                            <GitPullRequest className="w-4 h-4" />
                            <span>{user.public_repos} Repos</span>
                          </div>
                        )}
                        {user.public_gists !== undefined && (
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            <span>{user.public_gists} Gists</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
