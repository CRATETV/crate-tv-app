#!/bin/bash
# convert-folder.sh
#
# Goes through every file in an S3 folder and submits a MediaConvert HLS
# job for each video file found (skips posters/images automatically).
# Uses convert-film.sh under the hood — must be in the same folder.
#
# USAGE:
#   ./convert-folder.sh "PWFF-Philly 2026/Friday/" "friday"
#
#   Argument 1: the folder path inside your bucket, exactly as it
#               appears in S3 (case-sensitive!), with a trailing slash
#   Argument 2: a short tag for this folder (e.g. "friday") — added to
#               the front of each output name so Friday/Saturday/Sunday
#               films never collide even if two films share a name

set -e

BUCKET="cratetelevision"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./convert-folder.sh \"PWFF-Philly 2026/Friday/\" \"friday\""
  exit 1
fi

if [ ! -f "./convert-film.sh" ]; then
  echo "Could not find convert-film.sh in this folder — make sure it's here too, and run this from the same directory."
  exit 1
fi

FOLDER_PREFIX="$1"
DAY_TAG="$2"
REGION="us-east-1"
ROLE_NAME="MediaConvert_Default_Role"

# Look these up ONCE here instead of letting convert-film.sh look them up
# fresh for every single film — that's what triggered AWS's
# TooManyRequestsException earlier when converting a whole folder back to back.
echo "Looking up your MediaConvert account endpoint..."
export MC_ENDPOINT=$(aws mediaconvert describe-endpoints --region "$REGION" --query 'Endpoints[0].Url' --output text)
echo "Looking up your MediaConvert IAM role..."
export MC_ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo ""

echo "Listing files in s3://${BUCKET}/${FOLDER_PREFIX} ..."
FILES=$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$FOLDER_PREFIX" --query 'Contents[].Key' --output text | tr '\t' '\n')

if [ -z "$FILES" ]; then
  echo "No files found under that prefix. Double check the folder name — S3 is case-sensitive, and it needs the trailing slash."
  exit 1
fi

echo "$FILES" | while IFS= read -r KEY; do
  # Skip the folder marker itself, if S3 created one
  if [ "$KEY" == "$FOLDER_PREFIX" ]; then
    continue
  fi

  EXT="${KEY##*.}"
  EXT_LOWER=$(echo "$EXT" | tr '[:upper:]' '[:lower:]')

  case "$EXT_LOWER" in
    mp4|mov|m4v|mxf|avi|mkv)
      ;;
    *)
      echo "Skipping non-video file: $KEY"
      continue
      ;;
  esac

  BASENAME=$(basename "$KEY")
  NAME_NO_EXT="${BASENAME%.*}"
  # Slugify: lowercase, non-alphanumeric becomes a hyphen, trim edges
  SLUG=$(echo "$NAME_NO_EXT" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
  OUTPUT_NAME="${DAY_TAG}-${SLUG}"

  # Skip anything already converted — lets you safely re-run this after
  # an error (like the rate limit earlier) without resubmitting films
  # that already succeeded.
  EXISTING=$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "hsl/${OUTPUT_NAME}/" --query 'Contents[0].Key' --output text 2>/dev/null)
  if [ -n "$EXISTING" ] && [ "$EXISTING" != "None" ]; then
    echo "Skipping (already converted): $KEY"
    continue
  fi

  echo ""
  echo "=================================================="
  echo "Converting: $KEY"
  echo "Output name: $OUTPUT_NAME"
  echo "=================================================="
  ./convert-film.sh "$KEY" "$OUTPUT_NAME"
  sleep 2
done

echo ""
echo "All jobs submitted for ${FOLDER_PREFIX}"
echo "Check overall progress anytime in the MediaConvert console -> Jobs, or re-run the get-job command printed above for any specific one."
