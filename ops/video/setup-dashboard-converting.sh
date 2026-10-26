#!/bin/bash
# setup-dashboard-converting.sh
#
# One-time setup so the admin panel's "Upload & convert film" can talk to
# AWS (Oct 2026). Run it from the project folder:
#
#   bash ops/video/setup-dashboard-converting.sh
#
# It does three things, and asks before each:
#   1. Lets the AWS key CRATE uses on Vercel start and check MediaConvert jobs
#      (adds a small permission called "crate-video-pipeline" to that key's user).
#   2. Lets the browser read upload receipts from S3 (adds "ETag" to the
#      bucket's CORS "ExposeHeaders"; nothing else in CORS changes).
#   3. Prints the MediaConvert role address to paste into Vercel as
#      MEDIACONVERT_ROLE_ARN.
#
# Uses the same aws command as convert-film.sh (it must be signed in as you,
# the account owner). Needs jq (brew install jq).

set -e
BUCKET="cratetelevision"
REGION="us-east-1"
ROLE_NAME="MediaConvert_Default_Role"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

command -v jq >/dev/null || { red "jq is needed: brew install jq"; exit 1; }

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)
if [ -z "$ROLE_ARN" ] || [ "$ROLE_ARN" = "None" ]; then
  red "Couldn't find the $ROLE_NAME role (the one convert-film.sh uses). Stopped; nothing changed."
  exit 1
fi
ACCOUNT=$(echo "$ROLE_ARN" | cut -d: -f5)

echo
bold "Step 1 of 3: permission for the key CRATE uses on Vercel"
echo "In Vercel → crate-tv-app → Settings → Environment Variables, copy the value of AWS_ACCESS_KEY_ID"
echo "(it starts with AKIA). Paste it here:"
read -r KEY_ID
# Drop spaces, quotes and invisible characters that come along when pasting.
KEY_ID=$(printf '%s' "$KEY_ID" | tr -cd 'A-Z0-9')
LAST_USED=$(aws iam get-access-key-last-used --access-key-id "$KEY_ID" --output json 2>/tmp/crate-aws-err.txt || true)
USER_NAME=$(printf '%s' "$LAST_USED" | jq -r '.UserName // empty' 2>/dev/null || true)
if [ -n "$LAST_USED" ] && [ -z "$USER_NAME" ]; then
  # AWS knows the key but it belongs to no user: it's the main (root) account key,
  # which can already do everything. Nothing to add.
  green "✓ That's your main account key, so it already has permission. Nothing to add."
  USER_NAME="(root)"
fi
if [ -z "$USER_NAME" ] || [ "$USER_NAME" = "None" ]; then
  # Second way: look through each AWS user's keys.
  echo "Looking through your AWS users for that key…"
  USER_NAME=""
  for U in $(aws iam list-users --query 'Users[].UserName' --output text 2>>/tmp/crate-aws-err.txt); do
    if aws iam list-access-keys --user-name "$U" --query 'AccessKeyMetadata[].AccessKeyId' --output text 2>/dev/null | tr '\t' '\n' | grep -qx "$KEY_ID"; then
      USER_NAME="$U"; break
    fi
  done
fi
if [ -z "$USER_NAME" ] || [ "$USER_NAME" = "None" ]; then
  red "Couldn't find that key in your AWS account. Stopped; nothing changed."
  echo "What AWS said:"; cat /tmp/crate-aws-err.txt; rm -f /tmp/crate-aws-err.txt
  exit 1
fi
rm -f /tmp/crate-aws-err.txt
if [ "$USER_NAME" != "(root)" ]; then
echo "That key belongs to the AWS user: $USER_NAME"

POLICY=$(jq -n --arg role "$ROLE_ARN" --arg bucket "$BUCKET" '{
  Version: "2012-10-17",
  Statement: [
    { Sid: "MediaConvertJobs", Effect: "Allow", Action: ["mediaconvert:DescribeEndpoints", "mediaconvert:CreateJob", "mediaconvert:GetJob"], Resource: "*" },
    { Sid: "LetMediaConvertUseItsRole", Effect: "Allow", Action: "iam:PassRole", Resource: $role },
    { Sid: "BigUploads", Effect: "Allow", Action: ["s3:PutObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"], Resource: ("arn:aws:s3:::" + $bucket + "/originals/*") }
  ]
}')
echo "Add the permission \"crate-video-pipeline\" to $USER_NAME? (y/n)"
read -r OK1
if [ "$OK1" = "y" ]; then
  aws iam put-user-policy --user-name "$USER_NAME" --policy-name crate-video-pipeline --policy-document "$POLICY"
  green "✓ Permission added"
else
  echo "Skipped."
fi
fi

echo
bold "Step 2 of 3: let the browser read upload receipts (S3 CORS)"
CORS=$(aws s3api get-bucket-cors --bucket "$BUCKET" --output json 2>/dev/null || echo '{"CORSRules":[]}')
NEW_CORS=$(echo "$CORS" | jq '.CORSRules |= map(.ExposeHeaders = (((.ExposeHeaders // []) + ["ETag"]) | unique))')
if [ "$(echo "$CORS" | jq '.CORSRules | length')" = "0" ]; then
  red "The bucket has no CORS rules at all, which is unexpected (uploads already work). Skipping this step; tell Claude."
elif [ "$(echo "$CORS" | jq -c '.CORSRules')" = "$(echo "$NEW_CORS" | jq -c '.CORSRules')" ]; then
  green "✓ Already set"
else
  echo "Add \"ETag\" to ExposeHeaders in the bucket's CORS? Nothing else changes. (y/n)"
  read -r OK2
  if [ "$OK2" = "y" ]; then
    echo "$NEW_CORS" > /tmp/crate-cors.json
    aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration file:///tmp/crate-cors.json
    rm -f /tmp/crate-cors.json
    green "✓ CORS updated"
  else
    echo "Skipped."
  fi
fi

echo
bold "Step 3 of 3: one setting in Vercel"
echo "In Vercel → crate-tv-app → Settings → Environment Variables, add:"
echo
echo "   Name:   MEDIACONVERT_ROLE_ARN"
echo "   Value:  $ROLE_ARN"
echo
echo "Then redeploy (Deployments → ⋯ → Redeploy) so it takes effect."
echo "In the admin panel, open any film and press \"Check setup\" in Upload & convert film."
