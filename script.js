// (No-op: chatForm event listener is now only registered inside DOMContentLoaded to prevent double submission)
/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const chatWindow = document.getElementById("chatWindow");
const generateRoutineBtn = document.getElementById("generateRoutine");

// Wait for DOM to be fully loaded before accessing chatForm
document.addEventListener("DOMContentLoaded", function () {
  const chatForm = document.getElementById("chatForm");
  if (chatForm) {
    chatForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const input = document.getElementById("userInput");
      const message = input.value.trim();
      if (!message) return;
      chatHistory.push({ role: "user", content: message });
      renderChatWindow();
      chatWindow.innerHTML += `<div class='placeholder-message'>Generating your personalized routine...</div>`;
      chatWindow.scrollTop = chatWindow.scrollHeight;
      try {
        const response = await fetch(
          "https://loreal-chatbot.lreyperez18.workers.dev/",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: chatHistory,
            }),
          }
        );
        const data = await response.json();
        if (
          data.choices &&
          data.choices[0] &&
          data.choices[0].message &&
          data.choices[0].message.content
        ) {
          chatHistory.push({
            role: "assistant",
            content: data.choices[0].message.content,
          });
          renderChatWindow();
          chatWindow.scrollTop = chatWindow.scrollHeight;
        } else {
          chatWindow.innerHTML += `<div class='placeholder-message'>Sorry, I couldn't get a response. Please try again.</div>`;
          chatWindow.scrollTop = chatWindow.scrollHeight;
        }
      } catch (error) {
        chatWindow.innerHTML += `<div class='placeholder-message'>Error: ${error.message}</div>`;
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }
      input.value = "";
    });
  }
});

// --- NEW: Reference for clear button ---
let clearSelectedBtn = null;

// Store the chat history as an array of messages
let chatHistory = [
  {
    role: "system",
    content:
      "You are a helpful skincare and beauty advisor. Create a step-by-step routine using the provided products. Explain the order and purpose of each product. Be friendly and clear.",
  },
];

// --- Product selection and display logic ---

// --- Load selected products from localStorage, or empty array ---
let selectedProductIds = [];
try {
  const saved = localStorage.getItem("selectedProductIds");
  if (saved) {
    selectedProductIds = JSON.parse(saved);
  }
} catch (e) {
  selectedProductIds = [];
}

let allProducts = [];

// Load product data from JSON file
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Create HTML for displaying product cards
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map(
      (product) => `
    <div class="product-card${
      selectedProductIds.includes(product.id) ? " selected" : ""
    }" data-product-id="${product.id}">
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
      </div>
      <div class="product-overlay">${product.description}</div>
    </div>
  `
    )
    .join("");

  // Add click event listeners to each product card
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const productId = parseInt(card.getAttribute("data-product-id"));
      toggleProductSelection(productId);
    });
  });
}

// Toggle product selection and update UI
function toggleProductSelection(productId) {
  const index = selectedProductIds.indexOf(productId);
  if (index === -1) {
    selectedProductIds.push(productId);
  } else {
    selectedProductIds.splice(index, 1);
  }
  // --- Save to localStorage ---
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(selectedProductIds)
  );
  // Re-render products to update visual state
  displayProducts(
    allProducts.filter((p) => p.category === categoryFilter.value)
  );
  updateSelectedProductsList();
}

// --- NEW: Remove a single product from selection ---
function removeProductSelection(productId) {
  const index = selectedProductIds.indexOf(productId);
  if (index !== -1) {
    selectedProductIds.splice(index, 1);
    localStorage.setItem(
      "selectedProductIds",
      JSON.stringify(selectedProductIds)
    );
    displayProducts(
      allProducts.filter((p) => p.category === categoryFilter.value)
    );
    updateSelectedProductsList();
  }
}

// --- NEW: Clear all selected products ---
function clearAllSelections() {
  selectedProductIds = [];
  localStorage.setItem(
    "selectedProductIds",
    JSON.stringify(selectedProductIds)
  );
  displayProducts(
    allProducts.filter((p) => p.category === categoryFilter.value)
  );
  updateSelectedProductsList();
}

// Show selected products above the button
function updateSelectedProductsList() {
  const selectedProductsList = document.getElementById("selectedProductsList");
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );
  // --- Add "Clear All" button if any selected ---
  if (!clearSelectedBtn) {
    clearSelectedBtn = document.createElement("button");
    clearSelectedBtn.textContent = "Clear All";
    clearSelectedBtn.className = "clear-selected-btn";
    clearSelectedBtn.style.marginLeft = "10px";
    clearSelectedBtn.style.padding = "6px 14px";
    clearSelectedBtn.style.fontSize = "15px";
    clearSelectedBtn.style.borderRadius = "6px";
    clearSelectedBtn.style.border = "1px solid #ccc";
    clearSelectedBtn.style.background = "#f8f8f8";
    clearSelectedBtn.style.cursor = "pointer";
    clearSelectedBtn.addEventListener("click", clearAllSelections);
    // Insert after the "Selected Products" heading
    const selectedProductsHeader = document.querySelector(
      ".selected-products h2"
    );
    if (
      selectedProductsHeader &&
      !selectedProductsHeader.parentNode.querySelector(".clear-selected-btn")
    ) {
      selectedProductsHeader.parentNode.insertBefore(
        clearSelectedBtn,
        selectedProductsHeader.nextSibling
      );
    }
  }
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<div class="placeholder-message">No products selected</div>';
    if (clearSelectedBtn) clearSelectedBtn.style.display = "none";
    return;
  }
  if (clearSelectedBtn) clearSelectedBtn.style.display = "inline-block";
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item" data-product-id="${product.id}">
          <img src="${product.image}" alt="${product.name}" title="${product.name}" style="width:48px;height:48px;object-fit:contain;border-radius:4px;">
          <button class="remove-selected-btn" title="Remove" style="margin-left:4px;padding:2px 7px;font-size:13px;border-radius:4px;border:1px solid #ccc;background:#fff;cursor:pointer;">&times;</button>
        </div>
      `
    )
    .join("");
  // --- Add event listeners for remove buttons ---
  document.querySelectorAll(".remove-selected-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const parent = btn.closest(".selected-product-item");
      if (parent) {
        const productId = parseInt(parent.getAttribute("data-product-id"));
        removeProductSelection(productId);
      }
    });
  });
}

// Helper: filter products by category and search
function getFilteredProducts() {
  const selectedCategory = categoryFilter.value;
  const searchTerm = productSearch.value.trim().toLowerCase();
  return allProducts.filter((product) => {
    const matchesCategory = selectedCategory
      ? product.category === selectedCategory
      : true;
    const matchesSearch = searchTerm
      ? product.name.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        (product.description &&
          product.description.toLowerCase().includes(searchTerm))
      : true;
    return matchesCategory && matchesSearch;
  });
}

// Filter and display products when category changes
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  displayProducts(getFilteredProducts());
  updateSelectedProductsList();
});

// Filter and display products when search changes
productSearch.addEventListener("input", () => {
  displayProducts(getFilteredProducts());
  updateSelectedProductsList();
});

// Generate routine with OpenAI
async function generateRoutineWithOpenAI() {
  const selectedProducts = allProducts.filter((p) =>
    selectedProductIds.includes(p.id)
  );
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "<div class='placeholder-message'>Please select at least one product to generate a routine.</div>";
    return;
  }
  const userMsg = `Here are my selected products:\n${selectedProducts
    .map((p) => `- ${p.name} (${p.brand}): ${p.description}`)
    .join("\n")}`;
  chatHistory.push({ role: "user", content: userMsg });
  renderChatWindow();
  chatWindow.innerHTML += `<div class='placeholder-message'>Generating your personalized routine...</div>`;
  chatWindow.scrollTop = chatWindow.scrollHeight;
  try {
    const response = await fetch(
      "https://loreal-chatbot.lreyperez18.workers.dev/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: chatHistory,
        }),
      }
    );
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Add assistant's response to chat history
      chatHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
      renderChatWindow();
      chatWindow.scrollTop = chatWindow.scrollHeight;
    } else {
      chatWindow.innerHTML += `<div class='placeholder-message'>Sorry, I couldn't get a response. Please try again.</div>`;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class='placeholder-message'>Error: ${error.message}</div>`;
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

// Generate routine button event
generateRoutineBtn.addEventListener("click", () => {
  generateRoutineWithOpenAI();
});

// Initial selected products list state
updateSelectedProductsList();

// Render chat window with chat history
function renderChatWindow() {
  chatWindow.innerHTML = chatHistory
    .filter((msg) => msg.role !== "system")
    .map((msg) => {
      if (msg.role === "user") {
        return `<div style="text-align:right;margin-bottom:12px;"><span style="background:#e3a535;color:#fff;padding:10px 16px;border-radius:16px 16px 2px 16px;display:inline-block;max-width:80%;word-break:break-word;">${msg.content.replace(
          /\n/g,
          "<br>"
        )}</span></div>`;
      } else {
        return `<div style="text-align:left;margin-bottom:12px;"><span style="background:#ff003b;color:#fff;padding:10px 16px;border-radius:16px 16px 16px 2px;display:inline-block;max-width:80%;word-break:break-word;">${msg.content.replace(
          /\n/g,
          "<br>"
        )}</span></div>`;
      }
    })
    .join("");
}
