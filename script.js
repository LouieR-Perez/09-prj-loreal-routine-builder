/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const generateRoutineBtn = document.getElementById("generateRoutine");

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
  localStorage.setItem("selectedProductIds", JSON.stringify(selectedProductIds));
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
    localStorage.setItem("selectedProductIds", JSON.stringify(selectedProductIds));
    displayProducts(
      allProducts.filter((p) => p.category === categoryFilter.value)
    );
    updateSelectedProductsList();
  }
}

// --- NEW: Clear all selected products ---
function clearAllSelections() {
  selectedProductIds = [];
  localStorage.setItem("selectedProductIds", JSON.stringify(selectedProductIds));
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
    const selectedProductsHeader = document.querySelector(".selected-products h2");
    if (selectedProductsHeader && !selectedProductsHeader.parentNode.querySelector(".clear-selected-btn")) {
      selectedProductsHeader.parentNode.insertBefore(clearSelectedBtn, selectedProductsHeader.nextSibling);
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

// Filter and display products when category changes
categoryFilter.addEventListener("change", async (e) => {
  if (allProducts.length === 0) {
    allProducts = await loadProducts();
  }
  const selectedCategory = e.target.value;
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
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
  try {
    // Send request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_api_key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
      }),
    });
    // Parse the response from OpenAI
    const data = await response.json();
    // Check if response contains the expected message
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
      // Display the updated chat
      renderChatWindow();
    } else {
      chatWindow.innerHTML += `<div class='placeholder-message'>Sorry, I couldn't get a response. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class='placeholder-message'>Error: ${error.message}</div>`;
  }
}

// Generate routine button event
generateRoutineBtn.addEventListener("click", generateRoutineWithOpenAI);

// Initial selected products list state
updateSelectedProductsList();
