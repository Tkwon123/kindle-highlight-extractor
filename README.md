# Kindle Highlights

The following is a basic automation tool to extract and store highlights from a book.

Uses the following technologies:

- Google Functions
- Google Cloud Storage
- Google Firestore

Files needed:

- Kindle Highlight Export (CSV)

## Configuration

TODO

## Usage

The function watches for changes in a Google bucket and triggers the function to process and save results in your Firestore.

# Deploy

```
npm run deploy
```
