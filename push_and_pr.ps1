## PowerShell script to push your changes and open a PR on GitHub
# Save this as push_and_pr.ps1 in the repository root (c:/Users/HP/hunty)

# Ensure you have the correct remote name (origin) and the target branch name.
# By default this script pushes the current Git branch and opens the PR page in your default browser.

# 1. Verify you are on the branch you want to push (e.g., docker-dev-setup)
#    git rev-parse --abbrev-ref HEAD
#    You should see "docker-dev-setup".
# 2. Push the branch to the remote repository
#    git push origin $(git rev-parse --abbrev-ref HEAD)
# 3. Open the pull‑request creation page in your browser.
#    The URL format is:
#    https://github.com/DevALVIN-24/hunty/compare/main...<branch>
#    Replace <branch> with the name of your branch.
#    For example:
#    https://github.com/DevALVIN-24/hunty/compare/main...docker-dev-setup
#    The script will construct this URL and launch it.

# ----------------------
# Script body
# ----------------------
$branch = git rev-parse --abbrev-ref HEAD
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to determine current branch. Make sure Git is installed and you are inside a repository."
    exit 1
}
Write-Host "Current branch: $branch"

# Push the branch
Write-Host "Pushing branch $branch to origin..."
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Git push failed. Fix any issues and re‑run the script."
    exit 1
}
Write-Host "Push successful."

# Construct PR URL
$repoOwner = "DevALVIN-24"
$repoName  = "hunty"
$baseBranch = "main"
$prUrl = "https://github.com/$repoOwner/$repoName/compare/$baseBranch...$branch"
Write-Host "Opening Pull Request page: $prUrl"
# Open in default browser (works on Windows PowerShell)
Start-Process $prUrl

# End of script
