// API functions
const API = {
  async getBookmarks() {
    const response = await fetch("/api/bookmarks");
    return response.json();
  },

  async getCategories() {
    const response = await fetch("/api/categories");
    return response.json();
  },

  async addBookmark(bookmark) {
    const response = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookmark),
    });
    return response.json();
  },

  async addCategory(category) {
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });
    return response.json();
  },

  async deleteBookmark(id) {
    await fetch(`/api/bookmarks/${id}`, { method: "DELETE" });
  },

  async deleteCategory(name) {
    await fetch(`/api/categories/${name}`, { method: "DELETE" });
  },

  async reorderCategories(orderedCategories) {
    const response = await fetch("/api/categories/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedCategories }),
    });
    return response.json();
  },
};

// DOM elements
const bookmarkForm = document.getElementById("bookmarkForm");
const bookmarksList = document.getElementById("bookmarksList");
const categorySelect = document.getElementById("linkCategory");
const newCategoryInput = document.getElementById("newCategory");
const categoryColorInput = document.getElementById("categoryColor");

// Event Listeners
categorySelect.addEventListener("change", () => {
  const isNewCategory = categorySelect.value === "new";
  newCategoryInput.style.display = isNewCategory ? "inline" : "none";
  categoryColorInput.style.display = isNewCategory ? "inline" : "none";
  if (isNewCategory) {
    newCategoryInput.focus();
  }
});

bookmarkForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("linkTitle").value;
  const url = document.getElementById("linkUrl").value;
  let category = categorySelect.value;

  if (category === "new") {
    const newCategory = {
      name: newCategoryInput.value.trim(),
      color: categoryColorInput.value,
    };
    if (!newCategory.name) {
      alert("Please enter a category name");
      return;
    }
    try {
      await API.addCategory(newCategory);
      category = newCategory.name;
    } catch (error) {
      alert("Error creating new category");
      return;
    }
  }

  try {
    await API.addBookmark({ title, url, category });
    bookmarkForm.reset();
    newCategoryInput.style.display = "none";
    categoryColorInput.style.display = "none";
    await loadAndDisplayBookmarks();
  } catch (error) {
    alert("Error adding bookmark");
  }
});

// Display functions
async function updateCategoryDropdown() {
  const categories = await API.getCategories();
  categorySelect.innerHTML = `
        <option value="">Select category...</option>
        ${categories
          .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
          .join("")}
        <option value="new">+ Add new category</option>
    `;
}

async function loadAndDisplayBookmarks() {
  try {
    const [bookmarks, categories] = await Promise.all([
      API.getBookmarks(),
      API.getCategories(),
    ]);

    // Sort categories by order, keeping Uncategorized last
    categories.sort((a, b) => {
      if (a.name === "Uncategorized") return 1;
      if (b.name === "Uncategorized") return -1;
      return (a.order || 0) - (b.order || 0);
    });

    // Create category map for easy access to colors
    const categoryMap = categories.reduce((acc, cat) => {
      acc[cat.name] = cat.color;
      return acc;
    }, {});

    // Group bookmarks by category
    const categorizedBookmarks = categories.reduce((acc, category) => {
      acc[category.name] = bookmarks.filter(
        (b) => b.category === category.name
      );
      return acc;
    }, {});

    // Sort bookmarks within each category
    Object.values(categorizedBookmarks).forEach((categoryBookmarks) => {
      categoryBookmarks.sort((a, b) =>
        a.title.toLowerCase().localeCompare(b.title.toLowerCase())
      );
    });

    // Generate HTML
    bookmarksList.innerHTML = Object.entries(categorizedBookmarks)
      .map(
        ([category, categoryBookmarks]) => `
                <div class="category-group" 
                    style="border-left-color: ${categoryMap[category]}"
                    data-category="${category}"
                    ondragover="handleDragOver(event)"
                    ondrop="handleDrop(event)">
                    <div class="category-header">
                        <h2 class="category-title" 
                            style="background-color: ${categoryMap[category]}20"
                            onclick="toggleCategory(this)">
                            ▼ ${category}
                        </h2>
                        <div class="category-actions">
                            ${
                              category !== "Uncategorized"
                                ? `
                                <button class="drag-handle" 
                                    draggable="true"
                                    ondragstart="handleCategoryDragStart(event)"
                                    ondragend="handleCategoryDragEnd(event)">
                                    <i class="fas fa-grip-vertical"></i>
                                </button>
                                <button onclick="deleteCategory('${category}')" title="Delete category">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `
                                : ""
                            }
                        </div>
                    </div>
                    <div class="category-content">
                        ${
                          categoryBookmarks.length
                            ? categoryBookmarks
                                .map(
                                  (bookmark) => `
                                <div class="bookmark-item" 
                                    data-id="${bookmark.id}"
                                    draggable="true"
                                    ondragstart="handleBookmarkDragStart(event)"
                                    ondragend="handleBookmarkDragEnd(event)">
                                    <a href="${bookmark.url}" target="_blank">${bookmark.title}</a>
                                    <span class="bookmark-actions">
                                        <button onclick="deleteBookmark(${bookmark.id})" title="Delete bookmark">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </span>
                                </div>
                            `
                                )
                                .join("")
                            : '<div class="empty-category">No bookmarks in this category</div>'
                        }
                    </div>
                </div>
            `
      )
      .join("");

    await updateCategoryDropdown();
  } catch (error) {
    console.error("Error loading bookmarks:", error);
    bookmarksList.innerHTML = "<p>Error loading bookmarks</p>";
  }
}

// Category and bookmark actions
function toggleCategory(titleElement) {
  const content = titleElement.parentElement.nextElementSibling;
  const isCollapsed = content.classList.toggle("collapsed");
  titleElement.textContent = titleElement.textContent.replace(
    /[▼▶]/,
    isCollapsed ? "▶" : "▼"
  );
}

async function deleteBookmark(id) {
  if (confirm("Are you sure you want to delete this bookmark?")) {
    try {
      await API.deleteBookmark(id);
      await loadAndDisplayBookmarks();
    } catch (error) {
      alert("Error deleting bookmark");
    }
  }
}
async function deleteCategory(name) {
  if (
    confirm(
      `Are you sure you want to delete the category "${name}" and move its bookmarks to Uncategorized?`
    )
  ) {
    try {
      await API.deleteCategory(name);
      await loadAndDisplayBookmarks();
    } catch (error) {
      alert("Error deleting category");
    }
  }
}

// Bookmark drag and drop
function handleBookmarkDragStart(event) {
  const bookmarkItem = event.target.closest(".bookmark-item");
  if (!bookmarkItem) return;

  bookmarkItem.classList.add("dragging");
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      type: "bookmark",
      id: bookmarkItem.dataset.id,
    })
  );
}

function handleBookmarkDragEnd(event) {
  const bookmarkItem = event.target.closest(".bookmark-item");
  if (bookmarkItem) {
    bookmarkItem.classList.remove("dragging");
  }
  document.querySelectorAll(".category-group").forEach((group) => {
    group.classList.remove("drag-over");
  });
}

function handleDragOver(event) {
  event.preventDefault(); // This is crucial!
  const categoryGroup = event.target.closest(".category-group");
  if (categoryGroup) {
    categoryGroup.classList.add("drag-over");
  }
}

async function handleDrop(event) {
  event.preventDefault();
  const categoryGroup = event.target.closest(".category-group");
  if (!categoryGroup) return;

  const dataStr = event.dataTransfer.getData("application/json");
  if (!dataStr) return;

  const data = JSON.parse(dataStr);

  if (data.type === "category") {
    // Handle category reordering
    const draggedCategory = data.name;
    const targetCategory = categoryGroup.dataset.category;

    if (
      draggedCategory === "Uncategorized" ||
      targetCategory === "Uncategorized" ||
      draggedCategory === targetCategory
    ) {
      return;
    }

    const categories = Array.from(document.querySelectorAll(".category-group"))
      .map((group) => group.dataset.category)
      .filter((cat) => cat !== "Uncategorized"); // Exclude Uncategorized from reordering

    const draggedIndex = categories.indexOf(draggedCategory);
    const targetIndex = categories.indexOf(targetCategory);

    if (draggedIndex !== -1) {
      categories.splice(draggedIndex, 1);
      categories.splice(targetIndex, 0, draggedCategory);

      fetch("/api/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedCategories: categories }),
      })
        .then(() => loadAndDisplayBookmarks())
        .catch((error) => {
          console.error("Error reordering categories:", error);
          alert("Error reordering categories");
        });
    }
  } else if (data.type === "bookmark") {
    const bookmarkId = parseInt(data.id);
    const newCategory = categoryGroup.dataset.category;

    try {
      const bookmarks = await API.getBookmarks();
      const bookmark = bookmarks.find((b) => b.id === bookmarkId);

      if (bookmark && bookmark.category !== newCategory) {
        await fetch(`/api/bookmarks/${bookmarkId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bookmark, category: newCategory }),
        });
        await loadAndDisplayBookmarks();
      }
    } catch (error) {
      console.error("Error moving bookmark:", error);
    }
  }

  categoryGroup.classList.remove("drag-over");
}

// Category drag and drop
function handleCategoryDragStart(event) {
  const handle = event.target.closest(".drag-handle");
  if (!handle) {
    event.preventDefault();
    return;
  }

  const categoryGroup = handle.closest(".category-group");
  if (categoryGroup.dataset.category === "Uncategorized") {
    event.preventDefault();
    return;
  }

  categoryGroup.classList.add("dragging");
  event.dataTransfer.setData(
    "application/json",
    JSON.stringify({
      type: "category",
      name: categoryGroup.dataset.category,
    })
  );
}

function handleCategoryDragEnd(event) {
  const categoryGroup = event.target.closest(".category-group");
  if (categoryGroup) {
    categoryGroup.classList.remove("dragging");
  }
  document.querySelectorAll(".category-group").forEach((group) => {
    group.classList.remove("drag-over");
  });
}

// Initial load
loadAndDisplayBookmarks();
