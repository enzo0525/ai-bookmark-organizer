# AI Bookmark Organizer

A Chrome extension that uses AI to intelligently organize your bookmarks into logical folders and categories.

## Features

- 🤖 **AI-Powered Organization**: Uses Google's Gemini AI to analyze and organize bookmarks
- 🌐 **Domain-Based Organization**: Group bookmarks by website domain
- 📁 **Category-Based Organization**: Group bookmarks by content type and topic
- 🔄 **Smart Folder Reuse**: Reuses existing folders instead of creating duplicates
- 🎨 **Modern UI**: Clean, intuitive interface with smooth animations
- ⚡ **Fast & Efficient**: Processes bookmarks quickly with minimal user interaction

## Installation

### For Development

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select this folder
5. Replace `YOUR_API_KEY_HERE` in `background.js` with your Gemini API key

### For Users

Available on the Chrome Web Store (coming soon)

## Usage

1. Click the extension icon in your browser toolbar
2. Choose your preferred organization style:
   - **By Domain**: Groups bookmarks by website (e.g., YouTube, GitHub, Reddit)
   - **By Category**: Groups by content type (e.g., Development, News, Entertainment)
3. Click "Continue" and wait for AI to organize your bookmarks
4. Your bookmarks will be automatically organized into logical folders

## API Key Setup

To use this extension, you need a Google Gemini API key:

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Replace `YOUR_API_KEY_HERE` in `background.js` with your actual key

## Privacy & Security

- **Local Processing**: All bookmark data is processed locally in your browser
- **API Calls**: Only bookmark metadata (title, URL, domain) is sent to Gemini API
- **No Data Storage**: We don't store any of your bookmark data
- **Secure**: Uses HTTPS for all API communications

## Development

### Project Structure

```
ai-bookmark-organizer/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (main logic)
├── popup/
│   ├── popup.html        # Extension popup UI
│   ├── popup.css         # Styles
│   └── popup.js          # Popup logic
└── icons/
    └── icon16.png        # Extension icon
```

### Key Components

- **Background Script**: Handles bookmark manipulation and AI API calls
- **Popup UI**: User interface for selecting organization preferences
- **Manifest v3**: Modern Chrome extension architecture

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues, feature requests, or questions:

- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## Roadmap

- [ ] Undo functionality
- [ ] Custom organization rules
- [ ] Batch processing for large bookmark collections
- [ ] Export/import organization templates
- [ ] Integration with other bookmark managers
