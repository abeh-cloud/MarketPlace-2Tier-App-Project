// API configuration
const API_BASE_URL = (window.API_BASE_URL || "").replace(/\/$/, "");
const IMAGE_BASE_URL = (window.IMAGE_BASE_URL || "/assets/images").replace(/\/$/, "");

const FALLBACK_IMAGE =
  `${IMAGE_BASE_URL}/placeholders/food-placeholder.webp`;

let restaurantsCache = [];

// Build API URLs
function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

// Display messages safely
function showMessage(elementId, message, type = "") {
  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;
  element.className = `message ${type}`;
}

// API request helper
async function apiRequest(path, options = {}) {
  const response = await fetch(apiUrl(path), options);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

// Backend health check
async function checkHealth() {
  const healthText = document.getElementById("health");
  const healthDot = document.getElementById("health-dot");

  healthText.textContent = "Checking service...";
  healthDot.className = "status-dot";

  try {
    const data = await apiRequest("/health");

    healthText.textContent =
      data.status === "ok" ? "Backend operational" : "Service response received";

    healthDot.className = "status-dot online";

  } catch (error) {
    healthText.textContent = "Backend unavailable";
    healthDot.className = "status-dot offline";

    console.error("Health check failed:", error);
  }
}

// Format prices
function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "Price unavailable";
  }

  if (typeof price === "number") {
    return price.toLocaleString();
  }

  return String(price);
}

// Determine restaurant availability
function isRestaurantAvailable(status) {
  const value = String(status || "").toLowerCase();

  return ["open", "active", "available", "operational"].includes(value);
}

// Create restaurant image URL
function getRestaurantImage(restaurant) {
  if (restaurant.imageUrl || restaurant.image) {
    return restaurant.imageUrl || restaurant.image;
  }

  return `${IMAGE_BASE_URL}/restaurants/restaurant-${restaurant.id}.webp`;
}

// Create restaurant card
function createRestaurantCard(restaurant) {
  const card = document.createElement("article");
  card.className = "restaurant-card";

  const imageContainer = document.createElement("div");
  imageContainer.className = "restaurant-image";

  const image = document.createElement("img");
  image.src = getRestaurantImage(restaurant);
  image.alt = `${restaurant.name || "Restaurant"}`;
  image.loading = "lazy";

  image.onerror = () => {
    image.onerror = null;
    image.src = FALLBACK_IMAGE;
  };

  const status = document.createElement("span");
  status.className = "restaurant-status";

  const available = isRestaurantAvailable(restaurant.status);

  status.classList.add(
    available ? "available" : "unavailable"
  );

  status.textContent = restaurant.status || "Status unavailable";

  imageContainer.append(image, status);

  const info = document.createElement("div");
  info.className = "restaurant-info";

  const name = document.createElement("h3");
  name.textContent = restaurant.name || "Unnamed restaurant";

  const address = document.createElement("p");
  address.className = "restaurant-address";
  address.textContent = restaurant.address || "Address unavailable";

  const actions = document.createElement("div");
  actions.className = "restaurant-actions";

  const restaurantId = document.createElement("span");
  restaurantId.className = "restaurant-id";
  restaurantId.textContent = `Restaurant #${restaurant.id}`;

  const menuButton = document.createElement("button");
  menuButton.className = "menu-button";
  menuButton.type = "button";
  menuButton.textContent = "View menu →";

  const menuPanel = document.createElement("div");
  menuPanel.id = `menu-${restaurant.id}`;
  menuPanel.className = "menu-panel";
  menuPanel.hidden = true;

  menuButton.addEventListener("click", async () => {
    if (!menuPanel.hidden) {
      menuPanel.hidden = true;
      menuButton.textContent = "View menu →";
      return;
    }

    menuPanel.hidden = false;
    menuButton.textContent = "Hide menu ↑";

    if (!menuPanel.dataset.loaded) {
      await loadMenu(restaurant.id);
      menuPanel.dataset.loaded = "true";
    }
  });

  actions.append(restaurantId, menuButton);
  info.append(name, address, actions);

  card.append(imageContainer, info, menuPanel);

  return card;
}

// Load restaurants
async function loadRestaurants() {
  const container = document.getElementById("restaurants");

  container.innerHTML = "";

  showMessage("restaurantMessage", "Loading restaurants...");

  try {
    const data = await apiRequest("/api/restaurants");

    restaurantsCache = Array.isArray(data.data)
      ? data.data
      : [];

    renderRestaurants(restaurantsCache);

    if (restaurantsCache.length === 0) {
      showMessage(
        "restaurantMessage",
        "No restaurants are available yet."
      );
      return;
    }

    showMessage(
      "restaurantMessage",
      `${restaurantsCache.length} restaurant(s) found.`
    );

  } catch (error) {
    console.error("Restaurant loading failed:", error);

    showMessage(
      "restaurantMessage",
      `Unable to load restaurants: ${error.message}`,
      "error"
    );
  }
}

// Render restaurant cards
function renderRestaurants(restaurants) {
  const container = document.getElementById("restaurants");

  container.innerHTML = "";

  if (restaurants.length === 0) {
    showMessage(
      "restaurantMessage",
      "No matching restaurants found."
    );
    return;
  }

  restaurants.forEach(restaurant => {
    container.appendChild(
      createRestaurantCard(restaurant)
    );
  });
}

// Load a restaurant's menu
async function loadMenu(restaurantId) {
  const container = document.getElementById(
    `menu-${restaurantId}`
  );

  container.innerHTML = "<p class='menu-empty'>Loading menu...</p>";

  try {
    const data = await apiRequest(
      `/api/restaurants/${restaurantId}/menu`
    );

    container.innerHTML = "";

    const heading = document.createElement("h4");
    heading.textContent = "Available menu items";

    container.appendChild(heading);

    const menuItems = Array.isArray(data.data)
      ? data.data
      : [];

    if (menuItems.length === 0) {
      const empty = document.createElement("p");
      empty.className = "menu-empty";
      empty.textContent = "No menu items available.";
      container.appendChild(empty);
      return;
    }

    menuItems.forEach(item => {
      const row = document.createElement("div");
      row.className = "menu-item";

      const details = document.createElement("div");

      const itemName = document.createElement("strong");
      itemName.textContent = item.name;

      const itemPrice = document.createElement("span");
      itemPrice.textContent = ` — ${formatPrice(item.price)}`;

      details.append(itemName, itemPrice);

      const selectButton = document.createElement("button");
      selectButton.type = "button";
      selectButton.textContent = "Select";

      selectButton.addEventListener("click", () => {
        document.getElementById("restaurantId").value =
          restaurantId;

        document.getElementById("menuItemId").value =
          item.id;

        document.getElementById("order-section").scrollIntoView({
          behavior: "smooth"
        });

        showMessage(
          "orderResult",
          `Selected ${item.name}. Enter your quantity to continue.`
        );
      });

      row.append(details, selectButton);
      container.appendChild(row);
    });

  } catch (error) {
    console.error("Menu loading failed:", error);

    container.innerHTML = "";

    const message = document.createElement("p");
    message.className = "menu-empty";
    message.textContent = `Unable to load menu: ${error.message}`;

    container.appendChild(message);
  }
}

// Create an order
async function createOrder(event) {
  event.preventDefault();

  const restaurantId = Number(
    document.getElementById("restaurantId").value
  );

  const menuItemId = Number(
    document.getElementById("menuItemId").value
  );

  const quantity = Number(
    document.getElementById("quantity").value
  );

  if (
    !Number.isInteger(restaurantId) ||
    !Number.isInteger(menuItemId) ||
    !Number.isInteger(quantity) ||
    restaurantId <= 0 ||
    menuItemId <= 0 ||
    quantity <= 0
  ) {
    showMessage(
      "orderResult",
      "Please enter valid restaurant, menu item and quantity values.",
      "error"
    );
    return;
  }

  const submitButton = document.querySelector(".submit-button");

  submitButton.disabled = true;
  submitButton.textContent = "Creating order...";

  showMessage("orderResult", "Submitting your order...");

  try {
    const data = await apiRequest("/api/orders", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        restaurantId,
        items: [
          {
            menuItemId,
            quantity
          }
        ]
      })
    });

    showMessage(
      "orderResult",
      `Order submitted successfully. ${JSON.stringify(data)}`,
      "success"
    );

  } catch (error) {
    console.error("Order creation failed:", error);

    showMessage(
      "orderResult",
      `Order could not be created: ${error.message}`,
      "error"
    );

  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Create order <span>→</span>';
  }
}

// Search restaurants
function searchRestaurants() {
  const searchTerm = document
    .getElementById("restaurantSearch")
    .value
    .trim()
    .toLowerCase();

  const filteredRestaurants = restaurantsCache.filter(restaurant => {
    const name = String(restaurant.name || "").toLowerCase();
    const address = String(restaurant.address || "").toLowerCase();

    return name.includes(searchTerm) ||
      address.includes(searchTerm);
  });

  renderRestaurants(filteredRestaurants);
}

// Initialize frontend
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("orderForm").addEventListener(
    "submit",
    createOrder
  );

  document.getElementById("restaurantSearch").addEventListener(
    "input",
    searchRestaurants
  );

  document.getElementById("refreshRestaurants").addEventListener(
    "click",
    loadRestaurants
  );

  document.getElementById("currentYear").textContent =
    new Date().getFullYear();

  checkHealth();
  loadRestaurants();
});