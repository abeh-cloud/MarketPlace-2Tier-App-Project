
// ============================================
// MARKETPLACE FRONTEND APPLICATION
// ============================================

// API configuration
const API_BASE_URL = (window.API_BASE_URL || "").replace(/\/$/, "");

const IMAGE_BASE_URL = (window.IMAGE_BASE_URL || "/assets/images").replace(/\/$/, "");

const FALLBACK_IMAGE =
    `${IMAGE_BASE_URL}/placeholders/food-placeholder.webp`;

let restaurantsCache = [];


// ============================================
// BUILD API URLS
// ============================================

function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}


// ============================================
// DISPLAY INLINE MESSAGES
// ============================================

function showMessage(elementId, message, type = "") {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;
    element.className = `message ${type}`;
}


// ============================================
// PROFESSIONAL TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");

    // Create the notification container if it does not exist
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");

    toast.className = `toast toast-${type}`;
    toast.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );

    const icon = document.createElement("span");
    icon.className = "toast-icon";
    icon.textContent = type === "success" ? "✓" : "!";

    const text = document.createElement("span");
    text.className = "toast-message";
    text.textContent = message;

    toast.append(icon, text);
    container.appendChild(toast);

    // Automatically dismiss notification after 4 seconds
    setTimeout(() => {
        toast.classList.add("toast-hide");

        setTimeout(() => {
            toast.remove();

            // Remove empty notification container
            if (container.children.length === 0) {
                container.remove();
            }
        }, 300);

    }, 4000);
}


// ============================================
// API REQUEST HELPER
// ============================================

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


// ============================================
// BACKEND HEALTH CHECK
// ============================================

async function checkHealth() {
    const healthText = document.getElementById("health");
    const healthDot = document.getElementById("health-dot");

    if (!healthText || !healthDot) return;

    healthText.textContent = "Checking service...";
    healthDot.className = "status-dot";

    try {
        const data = await apiRequest("/health");

        healthText.textContent =
            data.status === "ok"
                ? "Backend operational"
                : "Service response received";

        healthDot.className = "status-dot online";

    } catch (error) {
        healthText.textContent = "Backend unavailable";
        healthDot.className = "status-dot offline";

        console.error("Health check failed:", error);
    }
}


// ============================================
// FORMAT PRICES
// ============================================

function formatPrice(price) {
    if (price === null || price === undefined || price === "") {
        return "Price unavailable";
    }

    if (typeof price === "number") {
        return price.toLocaleString();
    }

    return String(price);
}


// ============================================
// DETERMINE RESTAURANT AVAILABILITY
// ============================================

function isRestaurantAvailable(status) {
    const value = String(status || "").toLowerCase();

    return ["open", "active", "available", "operational"].includes(value);
}


// ============================================
// CREATE RESTAURANT IMAGE URL
// ============================================

function getRestaurantImage(restaurant) {
    if (restaurant.imageUrl || restaurant.image) {
        return restaurant.imageUrl || restaurant.image;
    }

    return `${IMAGE_BASE_URL}/restaurants/restaurant-${restaurant.id}.webp`;
}


// ============================================
// CREATE RESTAURANT CARD
// ============================================

function createRestaurantCard(restaurant) {
    const card = document.createElement("article");
    card.className = "restaurant-card";

    const imageContainer = document.createElement("div");
    imageContainer.className = "restaurant-image";

    const image = document.createElement("img");
    image.src = getRestaurantImage(restaurant);
    image.alt = restaurant.name || "Restaurant";
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


// ============================================
// LOAD RESTAURANTS
// ============================================

async function loadRestaurants() {
    const container = document.getElementById("restaurants");

    if (!container) return;

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


// ============================================
// RENDER RESTAURANT CARDS
// ============================================

function renderRestaurants(restaurants) {
    const container = document.getElementById("restaurants");

    if (!container) return;

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


// ============================================
// LOAD A RESTAURANT'S MENU
// ============================================

async function loadMenu(restaurantId) {
    const container = document.getElementById(
        `menu-${restaurantId}`
    );

    if (!container) return;

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


// ============================================
// CREATE AN ORDER
// ============================================

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

    // Validate order information
    if (
        !Number.isInteger(restaurantId) ||
        !Number.isInteger(menuItemId) ||
        !Number.isInteger(quantity) ||
        restaurantId <= 0 ||
        menuItemId <= 0 ||
        quantity <= 0
    ) {
        showToast(
            "Please select a restaurant, menu item and valid quantity.",
            "error"
        );

        return;
    }

    const submitButton = document.querySelector(".submit-button");

    if (!submitButton) {
        console.error("Order submit button was not found.");
        return;
    }

    // Prevent duplicate order submissions
    if (submitButton.disabled) return;

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

        // Show a professional success notification
        showToast(
            `Order created successfully! Order #${data.id} is awaiting restaurant confirmation.`,
            "success"
        );

        // Remove the previous inline response
        showMessage("orderResult", "");

    } catch (error) {
        console.error("Order creation failed:", error);

        // Show a professional error notification
        showToast(
            `Order could not be created: ${error.message}`,
            "error"
        );

        showMessage("orderResult", "");

    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Create order <span>→</span>';
    }
}


// ============================================
// SEARCH RESTAURANTS
// ============================================

function searchRestaurants() {
    const searchInput = document.getElementById("restaurantSearch");

    if (!searchInput) return;

    const searchTerm = searchInput.value
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


// ============================================
// INITIALIZE FRONTEND
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    const orderForm = document.getElementById("orderForm");
    const searchInput = document.getElementById("restaurantSearch");
    const refreshButton = document.getElementById("refreshRestaurants");
    const currentYear = document.getElementById("currentYear");

    if (orderForm) {
        orderForm.addEventListener("submit", createOrder);
    }

    if (searchInput) {
        searchInput.addEventListener("input", searchRestaurants);
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", loadRestaurants);
    }

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    checkHealth();
    loadRestaurants();
});
