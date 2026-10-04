#!/usr/bin/env bash
#
# Push the current commit to master through the repository's validation gate.
#
# The `master validation` ruleset requires the `Validation` status check on the
# exact commit being pushed, so a new local commit is first pushed to a
# temporary `ci/gated-<sha>` branch to let CI run, then pushed to master once
# the check passes. See docs/deployment.md.
#
# Requirements: git and the GitHub CLI (`gh`) authenticated for this
# repository. Repeated runs are safe: the temporary branch name is derived
# from the commit, so the same commit reuses its workflow run.
set -euo pipefail

REMOTE="${REMOTE:-origin}"
TARGET_BRANCH="${TARGET_BRANCH:-master}"
CHECK_NAME="${CHECK_NAME:-Validation}"
RUN_APPEAR_TIMEOUT_SECONDS="${RUN_APPEAR_TIMEOUT_SECONDS:-150}"

FULL_SHA="$(git rev-parse HEAD)"
SHORT_SHA="$(git rev-parse --short HEAD)"
TEMP_BRANCH="${TEMP_BRANCH:-ci/gated-$SHORT_SHA}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: the GitHub CLI (gh) is required." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh is not authenticated. Run: gh auth login" >&2
  exit 1
fi

TARGET_SHA="$(git ls-remote "$REMOTE" "refs/heads/$TARGET_BRANCH" | awk '{print $1}')"
if [[ "$TARGET_SHA" == "$FULL_SHA" ]]; then
  echo "$TARGET_BRANCH already points at $SHORT_SHA; nothing to push."
  exit 0
fi

echo "Pushing $SHORT_SHA to $REMOTE/$TEMP_BRANCH so CI can validate it..."
git push "$REMOTE" "HEAD:refs/heads/$TEMP_BRANCH"

echo "Waiting for the \"$CHECK_NAME\" workflow run to start..."
RUN_ID=""
deadline=$((SECONDS + RUN_APPEAR_TIMEOUT_SECONDS))
while [[ -z "$RUN_ID" && "$SECONDS" -lt "$deadline" ]]; do
  RUN_ID="$(gh run list \
    --branch "$TEMP_BRANCH" \
    --limit 20 \
    --json databaseId,headSha \
    --jq "[.[] | select(.headSha == \"$FULL_SHA\")][0].databaseId // empty")"
  [[ -n "$RUN_ID" ]] || sleep 5
done
if [[ -z "$RUN_ID" ]]; then
  echo "error: no workflow run appeared for $SHORT_SHA on $TEMP_BRANCH." >&2
  echo "Check the Actions tab; the temporary branch was left in place." >&2
  exit 1
fi

if ! gh run watch "$RUN_ID" --exit-status; then
  echo "error: \"$CHECK_NAME\" did not pass for $SHORT_SHA." >&2
  echo "Inspect it with: gh run view $RUN_ID" >&2
  echo "Re-run it with:  gh run rerun $RUN_ID" >&2
  echo "The temporary branch $TEMP_BRANCH was left in place for that." >&2
  exit 1
fi

echo "Pushing $SHORT_SHA to $REMOTE/$TARGET_BRANCH..."
git push "$REMOTE" "HEAD:refs/heads/$TARGET_BRANCH"

echo "Deleting temporary branch $REMOTE/$TEMP_BRANCH..."
git push "$REMOTE" --delete "$TEMP_BRANCH"

echo "Done: $SHORT_SHA is on $TARGET_BRANCH."
