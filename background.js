const SYSTEM_PROMPT = `
# Bookmark Organizer System Prompt

You are a bookmark organization assistant. Your task is to analyze a user's bookmarks and organize them into a logical folder structure using only bookmark IDs.

## Input Format
The user will provide bookmarks and existing folders in this format:

Bookmarks:
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

Existing Folders:
[
  {
    "id": "456",
    "title": "Car videos",
    "parentId": "1"
  },
  // ... more existing folders
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
- **REUSE EXISTING FOLDERS**: If there are existing folders that already make sense with appropriate names, do not create new ones. Instead, reuse the existing folder names in your structure. For example, if there's already a folder called "Car videos", don't create another folder with a similar name like "Car content" or "Automotive Videos" - instead, use the existing "Car videos" folder name. Always prioritize reusing existing folder names when they logically fit the content being organized.

`;

//Listener when popup.js sends a message with parameters
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "organizeBookmarks") {
    // Handle the async operation
    handleOrganizeBookmarks(message, sendResponse);
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
});

async function handleOrganizeBookmarks(message, sendResponse) {
  try {
    const { organizationType } = message;
    console.log("Starting bookmark organization with type:", organizationType);

    const bookmarks = await chrome.bookmarks.getTree(); //bookmark tree (all bookmarks)
    const flatBookmarks = flattenBookmarks(bookmarks); //bookmark tree into array
    const existingFolders = extractExistingFolders(bookmarks); //existing folders for reuse

    console.log(`Found ${flatBookmarks.length} bookmarks to organize`);

    const result = await callGeminiAPI(
      flatBookmarks,
      organizationType,
      existingFolders
    ); //structure of bookmarks
    const bookmarkBar = getBookmarkBar(bookmarks);

    console.log("AI organization result:", JSON.stringify(result));
    console.log("--------------------------------");

    // First create all folders recursively
    await createFoldersRecursively(result, bookmarkBar);

    // Then move all bookmarks to their proper locations
    await moveBookmarksRecursively(result, bookmarkBar);

    console.log("Bookmark organization completed successfully");

    // Send success response
    sendResponse({
      success: true,
      message: "Bookmarks organized successfully",
    });
  } catch (error) {
    console.error("Error organizing bookmarks:", error);
    sendResponse({
      success: false,
      error: error.message || "An unknown error occurred",
    });
  }
}

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

async function createFoldersRecursively(folderStructure, bookmarkBar) {
  const folders = folderStructure.bookmarks.folders;

  // Create folders using DFS to ensure parent folders are created before children
  for (const folder of folders) {
    await createFolderDFS(folder, bookmarkBar.id);
  }
}

async function createFolderDFS(folderDef, parentId) {
  // Check if folder already exists
  const existingFolder = await findExistingFolderAsync(
    parentId,
    folderDef.name
  );

  let folderId;
  if (!existingFolder) {
    // Create new folder
    const newFolder = await createFolderAsync(parentId, folderDef.name);
    folderId = newFolder.id;
    console.log(`Folder "${newFolder.title}" created with ID: ${folderId}`);
  } else {
    folderId = existingFolder.id;
    console.log(
      `Folder "${folderDef.name}" already exists with ID: ${folderId}`
    );
  }

  // Recursively create child folders
  for (const child of folderDef.children) {
    if (typeof child === "object" && child.name) {
      // This is a nested folder
      await createFolderDFS(child, folderId);
    }
    // If child is a string, it's a bookmark ID - we'll handle these in moveBookmarksRecursively
  }
}

async function moveBookmarksRecursively(folderStructure, bookmarkBar) {
  // Move bookmarks to bookmark bar
  const bookmarkBarChildren =
    folderStructure.bookmarks.bookmark_bar?.children || [];
  for (const bookmarkId of bookmarkBarChildren) {
    await moveBookmarkAsync(bookmarkId, bookmarkBar.id);
  }

  // Move bookmarks to folders
  const folders = folderStructure.bookmarks.folders;
  for (const folder of folders) {
    const existingFolder = await findExistingFolderAsync(
      bookmarkBar.id,
      folder.name
    );
    if (existingFolder) {
      await moveBookmarksDFS(folder, existingFolder.id);
    }
  }
}

async function moveBookmarksDFS(folderDef, parentId) {
  for (const child of folderDef.children) {
    if (typeof child === "string") {
      // This is a bookmark ID
      await moveBookmarkAsync(child, parentId);
    } else if (typeof child === "object" && child.name) {
      // This is a nested folder
      const childFolder = await findExistingFolderAsync(parentId, child.name);
      if (childFolder) {
        await moveBookmarksDFS(child, childFolder.id);
      }
    }
  }
}

// Helper function to create folder with promise
function createFolderAsync(parentId, title) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create(
      {
        parentId: parentId,
        title: title,
      },
      (newFolder) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(newFolder);
        }
      }
    );
  });
}

// Helper function to move bookmark with promise
function moveBookmarkAsync(bookmarkId, parentId) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.move(
      String(bookmarkId),
      { parentId: String(parentId) },
      (movedBookmark) => {
        if (chrome.runtime.lastError) {
          console.error(
            `Error moving bookmark "${bookmarkId}": ${chrome.runtime.lastError.message}`
          );
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          console.log(`Bookmark "${bookmarkId}" moved to "${parentId}"`);
          resolve(movedBookmark);
        }
      }
    );
  });
}

// Helper function to find existing folder with promise
function findExistingFolderAsync(parentId, folderName) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getChildren(parentId, (children) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        const existingFolder = children.find(
          (child) => !child.url && child.title === folderName
        );
        resolve(existingFolder || null);
      }
    });
  });
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

function extractExistingFolders(bookmarkTree) {
  const existingFolders = [];

  function traverse(nodes) {
    for (const node of nodes) {
      // If it's a folder (no URL but has children), add to result
      if (!node.url && node.children) {
        // Skip system folders (root, bookmark bar, other bookmarks, mobile)
        if (
          node.id !== "0" &&
          node.id !== "1" &&
          node.id !== "2" &&
          node.id !== "3"
        ) {
          existingFolders.push({
            id: node.id,
            title: node.title,
            parentId: node.parentId,
          });
        }
        // Recurse into folder children
        traverse(node.children);
      }
    }
  }
  traverse(bookmarkTree);
  return existingFolders;
}

async function callGeminiAPI(flatBookmarks, organizationType, existingFolders) {
  // TODO: For production, you should:
  // 1. Use environment variables or secure storage
  // 2. Implement API key rotation
  // 3. Consider using a backend proxy to hide the API key
  // 4. Add rate limiting and usage monitoring

  // Replace this with your actual API key for development
  // For production, use a secure method to store/retrieve the API key
  const GEMINI_API_KEY = "AIzaSyB_a2rgHz_xL2SjIpbzFIYNgZbSBmr3f70"; // Replace with actual key for testing

  const GEMINI_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  // Create the user content with bookmarks and existing folders data
  const userContent = `
    Organization Type: ${organizationType}

    Bookmarks to organize:
    ${JSON.stringify(flatBookmarks, null, 2)}

    Existing Folders:
    ${JSON.stringify(existingFolders, null, 2)}

    Please organize these bookmarks according to the system instructions. Remember to reuse existing folder names when they make sense instead of creating new ones with similar names.
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
