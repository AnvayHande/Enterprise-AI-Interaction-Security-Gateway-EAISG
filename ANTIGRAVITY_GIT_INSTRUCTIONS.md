# Git Commit & Push Instructions for Antigravity

## Purpose

This file tells Antigravity how to handle Git commits and GitHub pushes for this project.

The goal is to keep the GitHub repository updated with meaningful development progress while keeping the commit history clean and readable.

## Git Workflow

After completing a **meaningful feature, improvement, bug fix, or project milestone**:

1. Check what files have changed.
2. Review the changes before committing.
3. Stage the relevant changes with Git.
4. Create a Git commit.
5. Push the commit to the project's current GitHub remote.

Do **not** create a commit for every tiny change, typo, temporary experiment, or intermediate edit.

A commit should represent a meaningful unit of work.

## Commit Message Rules

Every commit message must be **short and clear — preferably 2–3 words**.

Examples:

- `Initial Commit`
- `Added Login`
- `Added Dashboard`
- `Fixed Authentication`
- `Updated UI`
- `Added Database`
- `Fixed Validation`
- `Added API`
- `Improved Security`
- `Updated README`

### First Commit

If this is the **first commit in the repository**, use:

`Initial Commit`

Do not use a different message for the first commit unless there is a specific reason.

### Subsequent Commits

For later commits, choose a concise 2–3 word message that describes the actual completed change.

Prefer:

`Added Dashboard`

over:

`Added the complete dashboard functionality with navigation and user statistics`

Keep commit messages simple.

## Before Pushing

Before every commit and push:

- Review the Git diff.
- Do not commit secrets, API keys, passwords, `.env` files, private credentials, or sensitive personal information.
- Respect the project's `.gitignore`.
- Make sure the project still works after the change whenever reasonably possible.
- Only commit changes that belong to this project.

## Push Rules

After creating a meaningful commit, push it to the existing GitHub remote.

Do not create fake, empty, or meaningless commits just to increase the GitHub contribution graph.

The contribution graph should reflect genuine project development.

## Important

Do not reset, delete, force-push, rewrite, or otherwise modify existing Git history unless explicitly instructed by the user.

Do not change the GitHub remote, repository visibility, branch, or authentication settings unless explicitly instructed.

## Summary

Use this workflow:

Project work
→ Review changes
→ Meaningful change completed
→ Git add
→ 2–3 word commit message
→ Git commit
→ Git push

Always prioritize clean, genuine, understandable Git history.
