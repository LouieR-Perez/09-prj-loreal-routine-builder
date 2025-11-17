/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const generateRoutineBtn = document.getElementById("generateRoutine");

// Store the chat history as an array of messages
let chatHistory = [
  {
    role: "system",
    content:
      "You are a helpful skincare and beauty advisor. Create a step-by-step routine using the provided products. Explain the order and purpose of each product. Be friendly and clear.",
  },
];

// --- Product selection and display logic ---
let selectedProductIds = [];
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
  // Re-render products to update visual state
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
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML =
      '<div class="placeholder-message">No products selected</div>';
    return;
  }
  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-product-item">
          <img src="${product.image}" alt="${product.name}" title="${product.name}" style="width:48px;height:48px;object-fit:contain;border-radius:4px;">
        </div>
      `
    )
    .join("");
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
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_api_key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 400,
      }),
    });
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
    } else {
      chatWindow.innerHTML += `<div class='placeholder-message'>Sorry, I couldn't generate a routine. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class='placeholder-message'>Error: ${error.message}</div>`;
  }
}

// Render chat window from chatHistory
function renderChatWindow() {
  chatWindow.innerHTML = chatHistory
    .filter((msg) => msg.role !== "system")
    .map((msg) => {
      if (msg.role === "user") {
        return `<div class='user-message'><b>You:</b> ${msg.content.replace(
          /\n/g,
          "<br>"
        )}</div>`;
      } else {
        return `<div class='ai-response'><b>Advisor:</b> ${msg.content.replace(
          /\n/g,
          "<br>"
        )}</div>`;
      }
    })
    .join("");
}

// Handle follow-up questions and keep chat history
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;
  chatHistory.push({ role: "user", content: userInput });
  renderChatWindow();
  document.getElementById("userInput").value = "";
  chatWindow.innerHTML += `<div class='placeholder-message'>Thinking...</div>`;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openai_api_key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: chatHistory,
        max_tokens: 400,
      }),
    });
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
    } else {
      chatWindow.innerHTML += `<div class='placeholder-message'>Sorry, I couldn't get a response. Please try again.</div>`;
    }
  } catch (error) {
    chatWindow.innerHTML += `<div class='placeholder-message'>Error: ${error.message}</div>`;
  }
});

// Generate routine button event
generateRoutineBtn.addEventListener("click", generateRoutineWithOpenAI);

// Initial selected products list state
updateSelectedProductsList();
