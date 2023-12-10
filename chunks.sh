#!/bin/bash

# Variables
FILE_PATH="/mnt/g/Download/1701981138823-Screen-Recording-2023-12-06-at-10.22.15-PM.mp4" #file
ORIGINAL_FILE_NAME=$(basename "$FILE_PATH")
CHUNK_SIZE_MB=100
CHUNK_SIZE_BYTES=$(($CHUNK_SIZE_MB * 1024 * 1024)) # 100 MB in bytes
CHUNK_PREFIX="chunk"
SERVER_URL="https://api-videothumb.hsingh.site/upload"
FILE_ID="1234"
WEBHOOK_URL="http://172.29.1.90:3000/video" # provide url where to be notified
MIN_CHUNK_SIZE_BYTES=1000000 # Minimum chunk size to send (1 MB)

# Calculate the total file size in bytes
FILE_SIZE_BYTES=$(stat -c%s "$FILE_PATH")

# Calculate total chunks (round up)
TOTAL_CHUNKS=$(((FILE_SIZE_BYTES + CHUNK_SIZE_BYTES - 1) / CHUNK_SIZE_BYTES))

# Split the file into 100 MB chunks
split -b $CHUNK_SIZE_BYTES "$FILE_PATH" $CHUNK_PREFIX

# Send each chunk
COUNT=0
for file in ${CHUNK_PREFIX}*; do
  # Check if the chunk is too small (less than 1 MB)
  CHUNK_SIZE=$(stat -c%s "$file")
  if [ $CHUNK_SIZE -lt $MIN_CHUNK_SIZE_BYTES ]; then
    echo "Skipping small chunk: $file"
    continue
  fi

  let COUNT+=1
  echo "Sending $file (Chunk $COUNT of $TOTAL_CHUNKS)..."
  curl -X POST \
    "$SERVER_URL" \
    --header 'Accept: */*' \
    --header 'User-Agent: Thunder Client (https://www.thunderclient.com)' \
    --form "fileId=\"$FILE_ID\"" \
    --form "webhook=\"$WEBHOOK_URL\"" \
    --form "chunkIndex=$COUNT" \
    --form "totalChunks=$TOTAL_CHUNKS" \
    --form "originalFileName=\"$ORIGINAL_FILE_NAME\"" \
    --form "video=@$file"
done

echo "All chunks sent."