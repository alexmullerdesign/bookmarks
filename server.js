const express = require("express");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/node_modules", express.static("node_modules"));

// Basic test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Server is running!" });
});

// File paths
const BOOKMARKS_FILE = path.join(__dirname, "data", "bookmarks.json");
const CATEGORIES_FILE = path.join(__dirname, "data", "categories.json");

// Helper functions for file operations
async function readDataFile(filePath) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw error;
  }
}

async function writeDataFile(filePath, data) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    throw error;
  }
}

// API Endpoints

// Get all bookmarks
app.get("/api/bookmarks", async (req, res) => {
  try {
    const data = await readDataFile(BOOKMARKS_FILE);
    res.json(data.bookmarks);
  } catch (error) {
    res.status(500).json({ error: "Error reading bookmarks" });
  }
});

// Get all categories
app.get("/api/categories", async (req, res) => {
  try {
    const data = await readDataFile(CATEGORIES_FILE);
    res.json(data.categories);
  } catch (error) {
    res.status(500).json({ error: "Error reading categories" });
  }
});

// Add new bookmark
app.post("/api/bookmarks", async (req, res) => {
  try {
    const { title, url, category } = req.body;
    if (!title || !url) {
      return res.status(400).json({ error: "Title and URL are required" });
    }

    const data = await readDataFile(BOOKMARKS_FILE);
    const newBookmark = {
      id: Date.now(),
      title,
      url,
      category: category || "Uncategorized",
    };

    data.bookmarks.push(newBookmark);
    await writeDataFile(BOOKMARKS_FILE, data);
    res.json(newBookmark);
  } catch (error) {
    res.status(500).json({ error: "Error adding bookmark" });
  }
});

// Add new category
app.post("/api/categories", async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !color) {
      return res.status(400).json({ error: "Name and color are required" });
    }

    const data = await readDataFile(CATEGORIES_FILE);
    if (data.categories.some((cat) => cat.name === name)) {
      return res.status(400).json({ error: "Category already exists" });
    }

    // Find the highest order excluding Uncategorized
    const maxOrder = Math.max(
      ...data.categories
        .filter((c) => c.name !== "Uncategorized")
        .map((c) => c.order || 0)
    );

    const newCategory = {
      name,
      color,
      order: maxOrder + 1,
    };

    data.categories.push(newCategory);
    await writeDataFile(CATEGORIES_FILE, data);
    res.json(newCategory);
  } catch (error) {
    res.status(500).json({ error: "Error adding category" });
  }
});

// Delete bookmark
app.delete("/api/bookmarks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = await readDataFile(BOOKMARKS_FILE);
    data.bookmarks = data.bookmarks.filter((bookmark) => bookmark.id !== id);
    await writeDataFile(BOOKMARKS_FILE, data);
    res.json({ message: "Bookmark deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting bookmark" });
  }
});

// Delete category
app.delete("/api/categories/:name", async (req, res) => {
  try {
    const { name } = req.params;
    if (name === "Uncategorized") {
      return res
        .status(400)
        .json({ error: "Cannot delete Uncategorized category" });
    }

    const data = await readDataFile(CATEGORIES_FILE);
    data.categories = data.categories.filter((cat) => cat.name !== name);
    await writeDataFile(CATEGORIES_FILE, data);

    // Move bookmarks to Uncategorized
    const bookmarksData = await readDataFile(BOOKMARKS_FILE);
    bookmarksData.bookmarks = bookmarksData.bookmarks.map((bookmark) => {
      if (bookmark.category === name) {
        return { ...bookmark, category: "Uncategorized" };
      }
      return bookmark;
    });
    await writeDataFile(BOOKMARKS_FILE, bookmarksData);

    res.json({ message: "Category deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting category" });
  }
});

// Add bookmark update endpoint
app.put("/api/bookmarks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updatedBookmark = req.body;

    const data = await readDataFile(BOOKMARKS_FILE);
    const bookmarkIndex = data.bookmarks.findIndex((b) => b.id === id);

    if (bookmarkIndex === -1) {
      return res.status(404).json({ error: "Bookmark not found" });
    }

    data.bookmarks[bookmarkIndex] = {
      ...data.bookmarks[bookmarkIndex],
      ...updatedBookmark,
    };
    await writeDataFile(BOOKMARKS_FILE, data);

    res.json(data.bookmarks[bookmarkIndex]);
  } catch (error) {
    res.status(500).json({ error: "Error updating bookmark" });
  }
});

// Add category reorder endpoint
app.put("/api/categories/reorder", async (req, res) => {
  try {
    const { orderedCategories } = req.body;
    const data = await readDataFile(CATEGORIES_FILE);

    // Update orders while preserving other category properties
    data.categories = data.categories.map((cat) => {
      if (cat.name === "Uncategorized") {
        return { ...cat, order: 99999 }; // Ensure Uncategorized is always last
      }
      const newOrder = orderedCategories.indexOf(cat.name);
      return {
        ...cat,
        order: newOrder !== -1 ? newOrder : cat.order,
      };
    });

    // Sort categories by order
    data.categories.sort((a, b) => a.order - b.order);

    await writeDataFile(CATEGORIES_FILE, data);
    res.json(data.categories);
  } catch (error) {
    res.status(500).json({ error: "Error reordering categories" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
