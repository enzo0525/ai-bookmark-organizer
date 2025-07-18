const SYSTEM_PROMPT = `
# Bookmark Organizer System Prompt

You are a bookmark organization assistant. Your task is to analyze a user's bookmarks and organize them into a logical folder structure using only bookmark IDs.

## Input Format
The user will provide bookmarks in this format:

[
  {
    "id": "123",
    "title": "Example Title",
    "url": "https://example.com",
    "domain": "example.com",
    "parentId": "1"
  },
  // ... more bookmarks
]

## Output Format
You must output a JSON structure with the following rules:

1. **Structure**: Use a nested object with "bookmarks" containing "bookmark_bar" and "folders"
2. **Bookmark Bar**: Objects without a "name" property represent the bookmark bar
3. **Folders**: Objects with a "name" property represent folders
4. **Children**: Arrays containing only bookmark IDs (strings)
5. **Folder Names**: Use descriptive names with emojis for visual organization
6. **Hierarchy**: Create logical nested folder structures when appropriate

## Example Output Structure:
{
  "bookmarks": {
    "bookmark_bar": {
      "children": ["2", "3", "4", "5"]
    },
    "folders": [
      {
        "name": "🚀 Development & Programming",
        "children": [
          {
            "name": "📚 Learning Resources",
            "children": ["8", "9", "10"]
          },
          {
            "name": "💪 Practice Platforms",
            "children": ["15", "16", "17"]
          }
        ]
      },
      {
        "name": "🎵 Entertainment",
        "children": ["46", "47", "48"]
      }
    ]
  }
}

## Organization Guidelines:
- Group similar websites/topics together
- Use intuitive folder names with relevant emojis
- Create subfolders when a category has many items
- Put frequently accessed items in bookmark bar
- Example for common categories:
  - Development/Programming
  - Education/Learning
  - Entertainment
  - Productivity/Tools
  - Shopping/Lifestyle
  - Finance/Business
  - AI/Automation
  - Career/Professional

## Important Rules:
- Output ONLY the JSON file, without any markdown formatting
- Include ONLY bookmark IDs in children arrays
- Do NOT include bookmark titles or URLs in the output
- Ensure all provided bookmark IDs are included somewhere in the structure
- Use logical nesting (max 3-4 levels deep for usability)

`;

//Listener when popup.js sends a message with parameters
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "organizeBookmarks") {
    const { organizationType } = message;
    const bookmarks = await chrome.bookmarks.getTree(); //bookmark tree (all bookmarks)
    const flatBookmarks = flattenBookmarks(bookmarks); //bookmark tree into array
    const result = await callGeminiAPI(flatBookmarks, organizationType); //structure of bookmarks
    const bookmarkBar = getBookmarkBar(bookmarks);
    // createFolders(result, bookmarkBar);

    // console.log(`Normal bookmarks: ${JSON.stringify(bookmarks)}`);
    // console.log("--------------------------------");
    // console.log(`Flatten bookmarks: ${JSON.stringify(flatBookmarks)}`);
    // console.log("--------------------------------");
    console.log(`Structure: ${result}`);

    createFolders(result, bookmarkBar);

    // console.log("Bookmark Bar ID:", bookmarkBar.id);

    // if (organizationType === "domain") {
    //   console.log("Organizing bookmarks by domain...");
    // } else if (organizationType === "category") {
    //   console.log("Organizing bookmarks by category...");
    // }
  }
});

function getBookmarkBar(bookmarkTree) {
  // The bookmark tree structure: [{ id: "0", children: [bookmarkBar, otherBookmarks, mobile] }]
  const root = bookmarkTree[0];

  // Find the bookmark bar (usually the first child, has title "Bookmarks bar")
  const bookmarkBar = root.children.find(
    (child) => child.title === "Bookmarks bar" || child.id === "1"
  );

  if (!bookmarkBar) {
    throw new Error("Could not find bookmark bar");
  }

  return bookmarkBar;
}

function createFolders(folderStructure, bookmarkBar) {
  const folders = folderStructure.bookmarks.folders;
  for (const folder of folders) {
    // Check if folder already exists
    const existingFolder = findExistingFolder(bookmarkBar, folder.name);

    if (existingFolder) {
      // Move bookmarks to existing folder
      moveBookmarks(existingFolder.id, folder);
    } else {
      // Create new folder
      chrome.bookmarks.create(
        { parentId: bookmarkBar.id, title: folder.name },
        function (newFolder) {
          console.log("Folder created:", newFolder.title);
          moveBookmarks(newFolder.id, folder);
        }
      );
    }
  }
}

function moveBookmarks(parentId, folder) {
  for (const bookmarkId of folder.children) {
    chrome.bookmarks.move(
      (id = String(bookmarkId)),
      (destination = { parentId: String(parentId) }),
      (callback = (movedBookmark) => {
        console.log(`Bookmark "${movedBookmark}" moved to "${parentId}"`);
      })
    );
  }
}

function findExistingFolder(bookmarkBar, folderName) {
  // Search through bookmark bar children to find existing folder
  if (bookmarkBar.children) {
    return bookmarkBar.children.find(
      (child) => !child.url && child.title === folderName
    );
  }
  return null;
}

function flattenBookmarks(bookmarkTree) {
  const flatBookmarks = [];

  function traverse(nodes) {
    for (const node of nodes) {
      // If it's a bookmark (has URL), add to result
      if (node.url) {
        try {
          const domain = new URL(node.url).hostname;
          flatBookmarks.push({
            id: node.id,
            title: node.title,
            url: node.url,
            domain: domain,
            parentId: node.parentId,
          });
        } catch (error) {
          console.error(
            `Error processing bookmark ${node.title}: ${error.message}`
          );
          flatBookmarks.push({
            id: node.id,
            title: node.title,
            url: node.url,
            domain: "unknown",
            parentId: node.parentId,
          });
        }
      }
      // If it's a folder, recurse
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }
  traverse(bookmarkTree);
  return flatBookmarks;
}

async function callGeminiAPI(flatBookmarks, organizationType) {
  const GEMINI_API_KEY = "AIzaSyB_a2rgHz_xL2SjIpbzFIYNgZbSBmr3f70";
  const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  // Create the user content with bookmarks data
  const userContent = `
    Organization Type: ${organizationType}

    Bookmarks to organize:
    ${JSON.stringify(flatBookmarks, null, 2)}

    Please organize these bookmarks according to the system instructions.
    `;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: `SYSTEM_PROMPT: ${SYSTEM_PROMPT} \n USER_CONTENT: ${userContent}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  };

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const fileStructure = data.candidates[0].content.parts[0].text;

    const dataToJSON = JSON.parse(fileStructure);
    return dataToJSON;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
}
