# Maintenance Scripts

This directory contains one-off administration scripts used during repository setup.
They are not part of the application and are excluded from builds.

## Scripts

- `assign_labels.sh` — Create common labels and assign them to matching open issues by title.
- `create_issues.sh` — Batch-create GitHub issues from a predefined list.
- `create_issues_100.sh` — Variant that creates 100 issues in bulk.
- `create_issues_safe.sh` — Safer variant with rate-limiting and validation.
- `create_mobile_issues.py` — Python script to create mobile-specific GitHub issues.

These scripts are preserved for reference but are not actively maintained.

## Requirements

- [GitHub CLI](https://cli.github.com/) (`gh`) authenticated against this repository
- `jq` for the shell scripts that parse `gh` JSON output
- Python 3 for `create_mobile_issues.py`
