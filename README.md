# GitHub Follower Checker

[![Website githubfollowers.vercel.app](https://img.shields.io/website-up-down-green-red/https/githubfollowers.vercel.app.svg?style=for-the-badge)](https://githubfollowers.vercel.app/)

A modern, responsive web application built with **Next.js 15** that helps you analyze your GitHub connections. Easily discover who isn't following you back or find the followers you haven't reciprocated.

## ✨ Features

- **Bi-Directional Analysis**:
  - **Not Following Back**: Identify users you follow who don't follow you back.
  - **Not Followed Back**: Identify users who follow you but you don't follow back.
- **Smart Rate Limit Handling**: Automatically detects GitHub API rate limits and prompts for a Personal Access Token (PAT) only when necessary.
- **Detailed User Insights**: Displays user avatars, follower/following counts, and public repository counts for every result.
- **Modern UI/UX**: Built with **shadcn/ui** components for a clean, accessible, and responsive interface.
- **Dark Mode Support**: Fully compatible with system color schemes (light/dark mode).

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (based on Radix UI)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 📖 Usage

1. Enter a Username: Type in the GitHub username you want to analyze.
2. Select Check Type:
    - Choose "Users I follow who don't follow me back" to see who you are following but isn't reciprocating.
    - Choose "Users who follow me but I don't follow back" to find followers you might want to follow back.
3. Analyze: Click the "Check Followers" button to start the search.

## Deployment

Project is live at:

**[https://githubfollowers.vercel.app/](https://githubfollowers.vercel.app/)**

![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)
![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)
