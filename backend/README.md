
# README for Video Preview Thumbnails Generator

## Overview

This system is designed to efficiently generate preview thumbnails for large video files. It handles the upload of video files in chunks, reassembles them on the server, and then processes these videos to generate and store thumbnails.

## Features

- **Chunked Video Upload**: Supports uploading large video files in chunks, ideal for handling large video sizes.
- **Video Processing**: Automated processing of uploaded video files for thumbnail generation.
- **Thumbnail Generation**: Generates multiple thumbnails for each video, providing a preview of the content.
- **Webhook Notifications**: Notifies specified endpoints upon completion of thumbnail generation.

## Installation

Before installing, ensure Bun.js is available on your system.

1. **Clone the Repository**: 
   ```
   git clone https://github.com/siinghd/player-custom-seekbar
   cd player-custom-seekbar/backend
   ```

2. **Install Dependencies**: 
   ```
   bun install
   ```

3. **Configuration**: Set up necessary configurations in the `.env` file, including database credentials, server ports, etc.
4.  **Build**: 
    ```
        bun build app.ts
    ```
## Usage

Start the server using the command:

```
bun run out/app.js
```

### Endpoints

- **POST `/upload`**: For uploading video file chunks.
- **GET `/video`**: To retrieve information about the generated thumbnails for a specific video.

### Uploading Videos for Thumbnail Generation

1. Split your video file into chunks.
2. Upload each chunk to the `/upload` endpoint.
3. The server processes the video and generates thumbnails.

### Retrieving Thumbnail Information

- Send a GET request to `/video` with the `fileId` to get thumbnail information for the processed video.

## Video File Chunking and Uploading Script

A Bash script is provided for splitting and uploading large video files. This script is particularly useful for handling videos that are too large to upload in a single request.

### Script Usage

1. **Set the File Path**: Define the path of your video file in the script.
2. **Execute the Script**: Run the script in a Bash environment. It automatically splits the file and uploads the chunks.

### Script Features

- **File Splitting**: Divides video files into predefined sizes for easier handling.
- **Sequential Uploading**: Uploads file chunks to the server in an orderly manner.
- **Configurable Chunk Size**: Allows customization of the chunk size as needed.

### Prerequisites for the Script

- Bash environment (Unix/Linux/MacOS)
- `curl` installed

## Contributing

Contributions to this project are welcome. To contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Submit a pull request with a description of your changes.

## Testing

Test the system at [https://api-videothumb.hsingh.site/](https://api-videothumb.hsingh.site/).

## License

Refer to the `LICENSE` file for more details.

