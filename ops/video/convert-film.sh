#!/bin/bash
# convert-film.sh
#
# Submits an AWS Elemental MediaConvert job to convert one film to HLS
# (1080p / 720p / 360p) via the AWS CLI — no console clicking needed.
#
# USAGE:
#   ./convert-film.sh "Friday/TINO Michael James Mina.mov" "tino-michael-james-mina"
#
#   Argument 1: the source file's path INSIDE your bucket (whatever you'd
#               see after "s3://cratetelevision/" — folders and spaces
#               in the filename are both fine, just don't include the
#               "s3://cratetelevision/" part itself)
#   Argument 2: a short, URL-safe name for this film (lowercase, hyphens,
#               no spaces) — used as the output subfolder name
#
# Requires: aws CLI (already installed/authenticated) and jq (for safely
# building the job JSON even when filenames have spaces/apostrophes in
# them). If jq isn't installed, run: brew install jq

set -e

BUCKET="cratetelevision"
REGION="us-east-1"
ROLE_NAME="MediaConvert_Default_Role"

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./convert-film.sh \"path/inside/bucket/Film Name.mov\" \"short-safe-name\""
  echo "Example: ./convert-film.sh \"Friday/TINO Michael James Mina.mov\" \"tino-michael-james-mina\""
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "jq is required but not installed. Run: brew install jq"
  exit 1
fi

SOURCE_KEY="$1"
OUTPUT_NAME="$2"

INPUT_URI="s3://${BUCKET}/${SOURCE_KEY}"
DEST_URI="s3://${BUCKET}/hsl/${OUTPUT_NAME}/"

echo "Input:       $INPUT_URI"
echo "Destination: $DEST_URI"

if [ -n "$MC_ENDPOINT" ] && [ -n "$MC_ROLE_ARN" ]; then
  # Reuse values passed in by convert-folder.sh instead of looking them
  # up again for every single film — repeated lookups in a tight loop
  # is exactly what triggered AWS's rate limit earlier.
  ENDPOINT="$MC_ENDPOINT"
  ROLE_ARN="$MC_ROLE_ARN"
else
  echo "Looking up your MediaConvert account endpoint..."
  ENDPOINT=$(aws mediaconvert describe-endpoints --region "$REGION" --query 'Endpoints[0].Url' --output text)
  echo "Looking up your MediaConvert IAM role..."
  ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
fi

echo "Endpoint:    $ENDPOINT"
echo "Role:        $ROLE_ARN"
echo ""

JOB_JSON=$(jq -n \
  --arg input "$INPUT_URI" \
  --arg dest "$DEST_URI" \
  '{
    Inputs: [
      {
        FileInput: $input,
        AudioSelectors: {
          "Audio Selector 1": {
            DefaultSelection: "DEFAULT"
          }
        }
      }
    ],
    OutputGroups: [
      {
        Name: "Apple HLS",
        OutputGroupSettings: {
          Type: "HLS_GROUP_SETTINGS",
          HlsGroupSettings: {
            Destination: $dest,
            SegmentLength: 10,
            MinSegmentLength: 0
          }
        },
        Outputs: [
          { Preset: "System-Avc_16x9_1080p_29_97fps_8500kbps", NameModifier: "_1080p" },
          { Preset: "System-Avc_16x9_720p_29_97fps_5000kbps", NameModifier: "_720p" },
          { Preset: "System-Avc_16x9_360p_29_97fps_600kbps", NameModifier: "_360p" }
        ]
      }
    ]
  }')

echo "Submitting job..."
RESULT=$(aws mediaconvert create-job \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" \
  --role "$ROLE_ARN" \
  --settings "$JOB_JSON")

JOB_ID=$(echo "$RESULT" | jq -r '.Job.Id')

echo ""
echo "✅ Job submitted! Job ID: $JOB_ID"
echo ""
echo "Check its status anytime with:"
echo "  aws mediaconvert get-job --endpoint-url $ENDPOINT --region $REGION --id $JOB_ID --query 'Job.Status' --output text"
echo ""
echo "Once it says COMPLETE, your HLS files will be at:"
echo "  $DEST_URI"
echo "Look for the file WITHOUT a resolution suffix (e.g. just the film name + .m3u8) — that's the master playlist to use."
