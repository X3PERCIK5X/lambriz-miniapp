/* global Telegram */

const DEFAULT_CONFIG = {
  companyName: "ЛАМБРИЗ",
  companyPhone: "+7 (000) 000-00-00",
  companyEmail: "info@lambriz.ru",
  companyAddress: "Москва, адрес компании",
  privacyPolicyUrl: "https://example.com/privacy",
  orderEndpoint: "",
  orderRecipientEmail: "orders@example.com",
  aboutText:
    "Текст о компании будет добавлен позже. Сейчас это заглушка для структуры мини-аппа.",
  paymentText:
    "Оплата и доставка будут описаны позднее. Этот блок можно заменить на финальный текст.",
};

const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const state = {
  config: { ...DEFAULT_CONFIG },
  categories: [],
  products: [],
  currentGroup: null,
  currentCategory: null,
  currentProduct: null,
  favorites: new Set(),
  cart: {},
  profile: {},
  orders: [],
  tgUser: null,
};


let touchStartX = 0;
let touchStartY = 0;

function setActiveMenu(target) {

  ui.menuDrawer.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  ui.menuDrawer.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    if (deltaX < -40 && deltaY < 30) {
      closeDrawer();
    }
  }, { passive: true });
  ui.menuLinks.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav == target);
  });
}
const ui = {
  screens: document.querySelectorAll(".screen"),
  menuButton: document.getElementById("menuButton"),
  menuClose: document.getElementById("menuClose"),
  menuDrawer: document.getElementById("menuDrawer"),
  drawerOverlay: document.getElementById("drawerOverlay"),
  menuLinks: document.querySelectorAll(".drawer-menu button"),
  cartButton: document.getElementById("cartButton"),
  favoritesButton: document.getElementById("favoritesButton"),
  cartCount: document.getElementById("cartCount"),
  favoritesCount: document.getElementById("favoritesCount"),
  categoriesGrid: document.getElementById("categoriesGrid"),
  categoriesTitle: document.getElementById("categoriesTitle"),
  productsList: document.getElementById("productsList"),
  productsTitle: document.getElementById("productsTitle"),
  productView: document.getElementById("productView"),
  favoritesList: document.getElementById("favoritesList"),
  favoritesToCart: document.getElementById("favoritesToCart"),
  favoritesClear: document.getElementById("favoritesClear"),
  cartList: document.getElementById("cartList"),
  cartTotal: document.getElementById("cartTotal"),
  cartBar: document.getElementById("cartBar"),
  cartBarTotal: document.getElementById("cartBarTotal"),
  ordersList: document.getElementById("ordersList"),
  policyLink: document.getElementById("policyLink"),
  aboutText: document.getElementById("aboutText"),
  paymentText: document.getElementById("paymentText"),
  contactsCard: document.getElementById("contactsCard"),
  orderForm: document.getElementById("orderForm"),
  inputName: document.getElementById("inputName"),
  inputPhone: document.getElementById("inputPhone"),
  inputEmail: document.getElementById("inputEmail"),
  policyCheck: document.getElementById("policyCheck"),
  orderStatus: document.getElementById("orderStatus"),
};

function setScreen(name) {
  ui.screens.forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${name}`);
  });
  setActiveMenu(name);
}

function openDrawer() {
  ui.menuDrawer.classList.remove("hidden");
  ui.drawerOverlay.classList.remove("hidden");
  requestAnimationFrame(() => {
    ui.menuDrawer.classList.add("drawer-open");
    ui.drawerOverlay.classList.add("overlay-visible");
  });
}

function closeDrawer() {
  ui.menuDrawer.classList.remove("drawer-open");
  ui.drawerOverlay.classList.remove("overlay-visible");
  setTimeout(() => {
    ui.menuDrawer.classList.add("hidden");
    ui.drawerOverlay.classList.add("hidden");
  }, 280);
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("ru-RU");
}

function getProductById(id) {
  return state.products.find((item) => item.id === id);
}

function getCartItems() {
  return Object.entries(state.cart).map(([id, qty]) => {
    const product = getProductById(id);
    return product ? { ...product, qty } : null;
  }).filter(Boolean);
}

function cartTotal() {
  return getCartItems().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateBadges() {
  const totalCount = Object.values(state.cart).reduce((sum, qty) => sum + qty, 0);
  ui.cartCount.textContent = totalCount;
  ui.favoritesCount.textContent = state.favorites.size;

  if (totalCount > 0) {
    ui.cartBar.classList.remove("hidden");
    ui.cartBarTotal.textContent = `${formatPrice(cartTotal())} ₽`;
  } else {
    ui.cartBar.classList.add("hidden");
  }
}

function renderCategories() {
  const categories = state.categories.filter((cat) => cat.groupId === state.currentGroup);
  ui.categoriesGrid.innerHTML = categories
    .map(
      (cat) => `
      <button class="category-card" data-category="${cat.id}">
        <img src="${cat.image}" alt="${cat.title}" />
        <span>${cat.title}</span>
      </button>`
    )
    .join("");
}

function renderProducts() {
  const products = state.products.filter((item) => item.categoryId === state.currentCategory);
  ui.productsList.innerHTML = products
    .map(
      (item) => `
      <article class="product-card">
        <img src="${item.images[0]}" alt="${item.title}" />
        <div>
          <div class="product-title">${item.title}</div>
          <div class="product-meta">${item.shortDescription}</div>
          <div class="product-meta">Артикул: ${item.sku}</div>
          <div class="product-price">${formatPrice(item.price)} ₽</div>
          <div class="product-actions">
            <button class="ghost-button" data-favorite="${item.id}">
              ${state.favorites.has(item.id) ? "Убрать из избранного" : "В избранное"}
            </button>
            <button class="primary-button" data-cart="${item.id}">В корзину</button>
            <button class="secondary-button" data-open="${item.id}">Подробнее</button>
          </div>
        </div>
      </article>`
    )
    .join("");
}

function renderProductView() {
  const product = getProductById(state.currentProduct);
  if (!product) return;
  const specs = (product.specs || []).map((spec) => {
    if (typeof spec === "string") {
      return `<div><span>${spec}</span></div>`;
    }
    return `<div><span>${spec.label}</span><span>${spec.value}</span></div>`;
  });

  ui.productView.innerHTML = `
    <div class="product-gallery">
      ${product.images.map((src) => `<img src="${src}" alt="${product.title}" />`).join("")}
    </div>
    <div>
      <div class="product-title">${product.title}</div>
      <div class="product-meta">Артикул: ${product.sku}</div>
      <div class="product-price">${formatPrice(product.price)} ₽</div>
      <div class="product-actions">
        <button class="ghost-button" data-favorite="${product.id}">
          ${state.favorites.has(product.id) ? "Убрать из избранного" : "В избранное"}
        </button>
        <button class="primary-button" data-cart="${product.id}">В корзину</button>
      </div>
    </div>
    <div class="text-card">
      <strong>Описание</strong>
      <p>${product.description}</p>
    </div>
    <div class="product-specs">
      <strong>Характеристики</strong>
      ${specs.join("")}
    </div>
  `;
}

function renderFavorites() {
  const items = state.products.filter((item) => state.favorites.has(item.id));
  ui.favoritesList.innerHTML = items
    .map(
      (item) => `
      <article class="product-card">
        <img src="${item.images[0]}" alt="${item.title}" />
        <div>
          <div class="product-title">${item.title}</div>
          <div class="product-meta">${item.shortDescription}</div>
          <div class="product-price">${formatPrice(item.price)} ₽</div>
          <div class="product-actions">
            <button class="ghost-button" data-favorite="${item.id}">Удалить</button>
            <button class="primary-button" data-cart="${item.id}">В корзину</button>
          </div>
        </div>
      </article>`
    )
    .join("");
}

function renderCart() {
  const items = getCartItems();
  ui.cartList.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item">
        <div><strong>${item.title}</strong></div>
        <div>Артикул: ${item.sku}</div>
        <div>${formatPrice(item.price)} ₽</div>
        <div class="cart-controls">
          <button data-qty="${item.id}" data-action="dec">−</button>
          <span>${item.qty}</span>
          <button data-qty="${item.id}" data-action="inc">+</button>
          <button class="ghost-button" data-remove="${item.id}">Удалить</button>
        </div>
      </div>`
    )
    .join("");

  ui.cartTotal.textContent = formatPrice(cartTotal());
}

function renderOrders() {
  if (!state.orders.length) {
    ui.ordersList.innerHTML = "<div class="text-card">История заказов пока пуста.</div>";
    return;
  }

  ui.ordersList.innerHTML = state.orders
    .slice()
    .reverse()
    .map((order) => {
      const items = order.items
        .map((item) => `${item.title} × ${item.qty}`)
        .join("<br/>");
      return `
        <div class="order-card">
          <div><strong>Заявка №${order.id}</strong></div>
          <div>${new Date(order.createdAt).toLocaleString("ru-RU")}</div>
          <div>${items}</div>
          <div><strong>Итого: ${formatPrice(order.total)} ₽</strong></div>
        </div>`;
    })
    .join("");
}

function saveState() {
  storage.set("lambriz_favorites", Array.from(state.favorites));
  storage.set("lambriz_cart", state.cart);
  storage.set("lambriz_profile", state.profile);
  storage.set("lambriz_orders", state.orders);
}

function loadState() {
  state.favorites = new Set(storage.get("lambriz_favorites", []));
  state.cart = storage.get("lambriz_cart", {});
  state.profile = storage.get("lambriz_profile", {});
  state.orders = storage.get("lambriz_orders", []);
}

function addToCart(id) {
  state.cart[id] = (state.cart[id] || 0) + 1;
  saveState();
  updateBadges();
}

function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
  } else {
    state.favorites.add(id);
  }
  saveState();
  updateBadges();
}

function handleProductAction(target) {
  const openId = target.dataset.open;
  const favId = target.dataset.favorite;
  const cartId = target.dataset.cart;

  if (openId) {
    state.currentProduct = openId;
    renderProductView();
    setScreen("product");
    return;
  }
  if (favId) {
    toggleFavorite(favId);
    renderProducts();
    renderFavorites();
    renderProductView();
  }
  if (cartId) {
    addToCart(cartId);
  }
}

function bindEvents() {
  ui.menuButton.addEventListener("click", openDrawer);
  ui.menuClose.addEventListener("click", closeDrawer);
  ui.drawerOverlay.addEventListener("click", closeDrawer);


  ui.menuDrawer.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  ui.menuDrawer.addEventListener("touchmove", (event) => {
    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    if (deltaX < -40 && deltaY < 30) {
      closeDrawer();
    }
  }, { passive: true });
  ui.menuLinks.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.nav;
      closeDrawer();
      setScreen(target);
      if (target === "orders") {
        renderOrders();
      }
    });
  });

  document.querySelectorAll(".hero-tile").forEach((tile) => {
    tile.addEventListener("click", () => {
      state.currentGroup = tile.dataset.group;
      ui.categoriesTitle.textContent =
        tile.dataset.group === "equipment" ? "Каталог оборудования" : "Изделия из нержавейки";
      renderCategories();
      setScreen("categories");
    });
  });

  ui.categoriesGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    state.currentCategory = button.dataset.category;
    const category = state.categories.find((cat) => cat.id === state.currentCategory);
    ui.productsTitle.textContent = category ? category.title : "Категория";
    renderProducts();
    setScreen("products");
  });

  ui.productsList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    handleProductAction(target);
  });

  ui.productView.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    handleProductAction(target);
  });

  ui.favoritesList.addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;
    handleProductAction(target);
  });

  ui.favoritesButton.addEventListener("click", () => {
    renderFavorites();
    setScreen("favorites");
  });

  ui.cartButton.addEventListener("click", () => {
    renderCart();
    setScreen("cart");
  });

  ui.cartBar.addEventListener("click", () => {
    renderCart();
    setScreen("cart");
  });

  document.querySelectorAll(".back-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      setScreen(btn.dataset.back);
    });
  });

  document.querySelectorAll("[data-nav='home']").forEach((btn) => {
    btn.addEventListener("click", () => setScreen("home"));
  });

  ui.favoritesToCart.addEventListener("click", () => {
    state.favorites.forEach((id) => addToCart(id));
    renderFavorites();
  });

  ui.favoritesClear.addEventListener("click", () => {
    state.favorites.clear();
    saveState();
    renderFavorites();
    updateBadges();
  });

  ui.cartList.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const id = button.dataset.qty || button.dataset.remove;
    if (!id) return;

    if (button.dataset.action === "inc") {
      addToCart(id);
    } else if (button.dataset.action === "dec") {
      state.cart[id] = Math.max(0, (state.cart[id] || 0) - 1);
      if (state.cart[id] === 0) delete state.cart[id];
      saveState();
      updateBadges();
    } else if (button.dataset.remove) {
      delete state.cart[id];
      saveState();
      updateBadges();
    }
    renderCart();
  });

  ui.orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!ui.policyCheck.checked) {
      ui.orderStatus.textContent = "Подтвердите согласие с политикой конфиденциальности.";
      return;
    }

    const items = getCartItems();
    if (!items.length) {
      ui.orderStatus.textContent = "Корзина пуста.";
      return;
    }

    const profile = {
      name: ui.inputName.value.trim(),
      phone: ui.inputPhone.value.trim(),
      email: ui.inputEmail.value.trim(),
    };

    if (!profile.name || !profile.phone || !profile.email) {
      ui.orderStatus.textContent = "Заполните обязательные поля.";
      return;
    }

    const order = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      customer: profile,
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        price: item.price,
        sku: item.sku,
        qty: item.qty,
      })),
      total: cartTotal(),
      telegramUserId: state.tgUser ? state.tgUser.id : null,
      telegramUsername: state.tgUser ? state.tgUser.username : null,
      recipientEmail: state.config.orderRecipientEmail,
    };

    ui.orderStatus.textContent = "Отправляем заявку...";

    if (!state.config.orderEndpoint) {
      ui.orderStatus.textContent =
        "Не настроен адрес отправки заявки. Укажите orderEndpoint в config.json.";
      return;
    }

    try {
      const response = await fetch(state.config.orderEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      state.orders.push(order);
      state.profile = profile;
      state.cart = {};
      saveState();
      updateBadges();
      renderCart();
      renderOrders();
      ui.orderStatus.textContent = "Заявка отправлена.";
      setScreen("confirmation");
    } catch (err) {
      ui.orderStatus.textContent =
        "Не удалось отправить заявку. Проверьте настройки отправки.";
    }
  });
}

async function loadConfig() {
  try {
    const response = await fetch("config.json", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      state.config = { ...DEFAULT_CONFIG, ...data };
    }
  } catch (e) {
    state.config = { ...DEFAULT_CONFIG };
  }

  ui.policyLink.href = state.config.privacyPolicyUrl;
  ui.aboutText.textContent = state.config.aboutText;
  ui.paymentText.textContent = state.config.paymentText;
  ui.contactsCard.innerHTML = `
    <strong>${state.config.companyName}</strong><br/>
    Телефон: ${state.config.companyPhone}<br/>
    Email: ${state.config.companyEmail}<br/>
    Адрес: ${state.config.companyAddress}
  `;
}

async function loadData() {
  const [categoriesResponse, productsResponse] = await Promise.all([
    fetch("data/categories.json"),
    fetch("data/products.json"),
  ]);
  state.categories = await categoriesResponse.json();
  state.products = await productsResponse.json();
}

function initTelegram() {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    state.tgUser = Telegram.WebApp.initDataUnsafe
      ? Telegram.WebApp.initDataUnsafe.user
      : null;
  }
}

async function init() {
  initTelegram();
  loadState();
  await loadConfig();
  await loadData();
  bindEvents();
  updateBadges();
  renderFavorites();
  renderCart();
}

init();
