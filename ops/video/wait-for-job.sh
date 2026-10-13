#!/bin/bash
# wait-for-job.sh
#
# Watches a MediaConvert job and pops up a native macOS notification
# (with a sound) the moment it finishes — success or error. Just leave
# the terminal tab running in the background and go do something else;
# no need to keep manually checking.
#
# USAGE:
#   ./wait-for-job.sh <job-id> ["Movie Title"]
#
# Example:
#   ./wait-for-job.sh 1785929500409-ocsuvl "The Mirror Dance"
#
# The movie title is optional but makes the notification much more
# useful when you're watching more than one job — without it, you'd
# just see the raw job ID.

ENDPOINT="https://mediaconvert.us-east-1.amazonaws.com"
REGION="us-east-1"

if [ -z "$1" ]; then
  echo "Usage: ./wait-for-job.sh <job-id> [\"Movie Title\"]"
  exit 1
fi

JOB_ID="$1"
LABEL="${2:-$JOB_ID}"

echo "Watching job $JOB_ID ($LABEL)... checking every 20 seconds. Leave this running — you'll get a notification when it's done."

while true; do
  STATUS=$(aws mediaconvert get-job --endpoint-url "$ENDPOINT" --region "$REGION" --id "$JOB_ID" --query 'Job.Status' --output text 2>/dev/null)

  if [ -z "$STATUS" ]; then
    echo "$(date '+%H:%M:%S') - Could not reach AWS right now, will retry..."
    sleep 20
    continue
  fi

  echo "$(date '+%H:%M:%S') - Status: $STATUS"

  if [ "$STATUS" == "COMPLETE" ]; then
    osascript -e "display notification \"$LABEL finished converting!\" with title \"MediaConvert Done ✅\" sound name \"Glass\"" 2>/dev/null
    say "$LABEL is done converting" 2>/dev/null &
    echo ""
    echo "✅ Done! Notification sent."
    break
  fi

  if [ "$STATUS" == "ERROR" ]; then
    ERR=$(aws mediaconvert get-job --endpoint-url "$ENDPOINT" --region "$REGION" --id "$JOB_ID" --query 'Job.ErrorMessage' --output text 2>/dev/null)
    osascript -e "display notification \"$LABEL failed: $ERR\" with title \"MediaConvert Error ❌\" sound name \"Basso\"" 2>/dev/null
    echo ""
    echo "❌ Job failed: $ERR"
    break
  fi

  sleep 20
done
