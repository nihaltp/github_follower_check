"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Github } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getNonFollowers } from "./actions"

interface GitHubUser {
  login: string
  avatar_url: string
  html_url: string
}

export default function Home() {
  const [username, setUsername] = useState("")
  const [results, setResults] = useState<GitHubUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchedUsername, setSearchedUsername] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResults([])
    setLoading(true)
    setSearchedUsername(username)

    try {
      const data = await getNonFollowers(username)
      if (data.error) {
        setError(data.error)
      } else {
        setResults(data.users || [])
      }
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <Github className="w-6 h-6" /> GitHub Follower Checker
          </CardTitle>
          <p className="text-muted-foreground">Find out who you follow on GitHub that doesn't follow you back.</p>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Check Followers"
              )}
            </Button>
          </form>

          {error && (
            <div className="mt-4 text-center text-red-500 p-3 bg-red-100 dark:bg-red-900 rounded-md">{error}</div>
          )}

          {!loading && searchedUsername && results.length === 0 && !error && (
            <div className="mt-6 text-center text-muted-foreground">
              {searchedUsername === username ? (
                <p>No users found that {username} follows but don't follow back.</p>
              ) : (
                <p>Enter a username to start searching.</p>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-6 space-y-4">
              <h2 className="text-lg font-semibold text-center">
                Users {searchedUsername} follows who don't follow back:
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((user) => (
                  <Card key={user.login} className="flex items-center p-3 gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={`${user.login}'s avatar`} />
                      <AvatarFallback>{user.login.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Link
                        href={user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {user.login}
                      </Link>
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
