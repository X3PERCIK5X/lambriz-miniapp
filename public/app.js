const view = document.getElementById("view");
const menu = document.getElementById("menu");
const menuBackdrop = document.getElementById("menu-backdrop");
const cartBar = document.getElementById("cart-bar");
const cartCount = document.getElementById("cart-count");

const state = {
  userId: "guest",
  config: {},
  categories: [],
  products: [],
  favorites: new Set(),
  cart: new Map(),
  userInfo: { fullName: "", phone: "", email: "" },
  orders: [],
  slideIndex: 0
};

const slides = [
  {
    title: "Профессиональное оборудование\nдля моек высокого давления",
    text: "Промышленные модели для бизнеса и частных задач",
    image: "/assets/hero-1.svg",
    cta: "В каталог",
    route: "#categories"
  },
  {
    title: "Поломоечные и\nподметальные машины",
    text: "Специализированные модели ведущих брендов",
    image: "/assets/hero-2.svg",
    cta: "В каталог",
    route: "#categories"
  },
  {
    title: "Собственное производство\nметаллоизделий",
    text: "Полный цикл работ от проектирования до финальной обработки",
    image: "/assets/hero-3.svg",
    cta: "Подробнее",
    route: "#production"
  }
];

function detectUserId() {
  const tg = window.Telegram?.WebApp;
  if (tg?.initDataUnsafe?.user?.id) {
    return String(tg.initDataUnsafe.user.id);
  }
  let local = localStorage.getItem("lambriz_user_id");
  if (!local) {
    local = `guest-${Date.now()}`;
    localStorage.setItem("lambriz_user_id", local);
  }
  return local;
}

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-telegram-user-id": state.userId,
      ...(options.headers || {})
    }
  }).then((res) => res.json());
}

function formatPrice(value) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function loadCart() {
  try {
    const raw = localStorage.getItem("lambriz_cart");
    if (!raw) return;
    const obj = JSON.parse(raw);
    state.cart = new Map(Object.entries(obj));
  } catch {
    state.cart = new Map();
  }
}

function saveCart() {
  const obj = {};
  state.cart.forEach((qty, id) => {
    obj[id] = qty;
  });
  localStorage.setItem("lambriz_cart", JSON.stringify(obj));
}

function updateCartCount() {
  let totalQty = 0;
  state.cart.forEach((qty) => {
    totalQty += Number(qty || 0);
  });
  cartCount.textContent = String(totalQty);
  cartCount.style.display = totalQty > 0 ? "grid" : "none";
}

function updateCartBar() {
  const total = getCartTotal();
  updateCartCount();
  if (total <= 0) {
    cartBar.classList.remove("show");
    cartBar.innerHTML = "";
    return;
  }
  cartBar.classList.add("show");
  cartBar.innerHTML = `
    <div>
      <div style="font-weight:700">Корзина</div>
      <div style="color:#6b6f74;font-size:12px">Итого: ${formatPrice(total)} ₽</div>
    </div>
    <button class="btn btn-primary" data-action="go-cart">Открыть</button>
  `;
}

function getCartTotal() {
  let total = 0;
  state.cart.forEach((qty, id) => {
    const product = state.products.find((p) => p.id === id);
    if (product) total += product.price * Number(qty || 0);
  });
  return total;
}

function parseRoute() {
  const hash = window.location.hash || "#home";
  const [path, queryString] = hash.split("?");
  const query = new URLSearchParams(queryString || "");
  return { path, query };
}

function setRoute(route) {
  window.location.hash = route;
}

function toggleMenu(force) {
  const shouldOpen = force !== undefined ? force : !menu.classList.contains("open");
  menu.classList.toggle("open", shouldOpen);
  menuBackdrop.classList.toggle("show", shouldOpen);
}

function renderSlider() {
  return `
    <section class="hero-slider fade-in">
      ${slides
        .map(
          (slide, index) => `
        <div class="slide ${index === state.slideIndex ? "active" : ""}" style="background-image:url('${slide.image}')">
          <div class="slide-content">
            <div class="slide-title">${slide.title.replace(/\n/g, "<br>")}</div>
            <div class="slide-text">${slide.text}</div>
            <button class="slide-cta" data-route="${slide.route}">${slide.cta}</button>
          </div>
        </div>
      `
        )
        .join("")}
      <div class="slide-nav">
        <button data-action="slide-prev">‹</button>
        <button data-action="slide-next">›</button>
      </div>
      <div class="slide-dots">
        ${slides
          .map(
            (_, index) => `<span class="${index === state.slideIndex ? "active" : ""}" data-action="slide-dot" data-index="${index}"></span>`
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderHome() {
  view.innerHTML = `
    ${renderSlider()}

    <div class="section-title">Каталог</div>
    <div class="grid fade-in">
      ${state.categories
        .map(
          (c) => `
        <div class="category-card" data-route="#products?categoryId=${c.id}">
          <img src="${c.image}" alt="${c.title}" />
          <div class="category-title">${c.title}</div>
        </div>
      `
        )
        .join("")}
    </div>

    <div class="info-card fade-in">
      <h3>Собственное производство металлоизделий</h3>
      <p>
        Наша компания предлагает полный спектр услуг, охватывающий все этапы
        производственного цикла — от проектирования до финальной обработки продукции.
      </p>
      <button class="btn btn-primary" data-route="#production">Подробнее</button>
    </div>

    <div class="info-card fade-in">
      <h3>О компании</h3>
      <p>
        Мы специализируемся на поставках высокотехнологичного оборудования для автомоек,
        промышленного клининга и предлагаем комплексные решения для бизнеса.
      </p>
      <button class="btn btn-primary" data-route="#about">Подробнее</button>
    </div>
  `;
}

function renderCategories(section) {
  const list = section
    ? state.categories.filter((c) => c.section === section)
    : state.categories;
  view.innerHTML = `
    <div class="section-title">Каталог</div>
    <div class="grid fade-in">
      ${list
        .map(
          (c) => `
        <div class="category-card" data-route="#products?categoryId=${c.id}">
          <img src="${c.image}" alt="${c.title}" />
          <div class="category-title">${c.title}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderProducts(categoryId) {
  const category = state.categories.find((c) => c.id === categoryId);
  const list = state.products.filter((p) => p.categoryId === categoryId);
  view.innerHTML = `
    <div class="section-title">${category ? category.title : "Товары"}</div>
    <div class="list fade-in">
      ${list
        .map(
          (p) => `
        <div class="product-row">
          <img src="${p.images[0]}" alt="${p.title}" data-route="#product?id=${p.id}" />
          <div class="product-meta">
            <div class="card-title" data-route="#product?id=${p.id}">${p.title}</div>
            <div class="card-desc">${p.shortDescription}</div>
            <div class="card-desc">Артикул ${p.sku}</div>
            <div class="card-price">${formatPrice(p.price)} ₽</div>
            <div class="card-actions">
              <button class="btn" data-action="toggle-favorite" data-id="${p.id}">
                ${state.favorites.has(p.id) ? "В избранном" : "В избранное"}
              </button>
              <button class="btn btn-primary" data-action="add-to-cart" data-id="${p.id}">В корзину</button>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderProduct(id) {
  const p = state.products.find((item) => item.id === id);
  if (!p) {
    view.innerHTML = `<div class="notice">Товар не найден.</div>`;
    return;
  }
  view.innerHTML = `
    <div class="section-title">${p.title}</div>
    <div class="detail-gallery fade-in">
      ${p.images.map((img) => `<img src="${img}" alt="${p.title}" />`).join("")}
    </div>
    <div class="info-card">
      <div class="card-desc">${p.description}</div>
      <div class="card-desc">Артикул ${p.sku}</div>
      <div class="card-price" style="font-size:18px">${formatPrice(p.price)} ₽</div>
      <ul class="detail-specs">
        ${p.specs.map((s) => `<li>• ${s}</li>`).join("")}
      </ul>
      <div class="card-actions">
        <button class="btn" data-action="toggle-favorite" data-id="${p.id}">
          ${state.favorites.has(p.id) ? "В избранном" : "В избранное"}
        </button>
        <button class="btn btn-primary" data-action="add-to-cart" data-id="${p.id}">В корзину</button>
      </div>
    </div>
  `;
}

function renderFavorites() {
  const list = state.products.filter((p) => state.favorites.has(p.id));
  view.innerHTML = `
    <div class="section-title">Избранное</div>
    <div class="card-actions">
      <button class="btn" data-action="favorites-to-cart">Добавить всё в корзину</button>
      <button class="btn" data-action="clear-favorites">Очистить избранное</button>
    </div>
    <div class="list fade-in">
      ${list
        .map(
          (p) => `
        <div class="product-row">
          <img src="${p.images[0]}" alt="${p.title}" />
          <div class="product-meta">
            <div class="card-title">${p.title}</div>
            <div class="card-desc">${p.shortDescription}</div>
            <div class="card-price">${formatPrice(p.price)} ₽</div>
            <div class="card-actions">
              <button class="btn btn-primary" data-action="add-to-cart" data-id="${p.id}">В корзину</button>
              <button class="btn" data-action="remove-favorite" data-id="${p.id}">Удалить</button>
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderCart() {
  const items = Array.from(state.cart.entries())
    .map(([id, qty]) => {
      const product = state.products.find((p) => p.id === id);
      if (!product) return null;
      const sum = product.price * Number(qty);
      return { ...product, qty: Number(qty), sum };
    })
    .filter(Boolean);

  view.innerHTML = `
    <div class="section-title">Корзина</div>
    <div class="list fade-in">
      ${items
        .map(
          (item) => `
        <div class="cart-item">
          <img src="${item.images[0]}" alt="${item.title}" width="70" height="70" style="border-radius:12px" />
          <div style="flex:1">
            <div class="card-title">${item.title}</div>
            <div class="card-desc">${formatPrice(item.price)} ₽</div>
          </div>
          <div class="qty">
            <button data-action="qty-minus" data-id="${item.id}">-</button>
            <div>${item.qty}</div>
            <button data-action="qty-plus" data-id="${item.id}">+</button>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
    <div class="info-card">
      <div class="card-title">Итоговая сумма</div>
      <div class="card-price" style="font-size:20px">${formatPrice(getCartTotal())} ₽</div>
      <button class="btn btn-primary" data-route="#checkout">Оформить заявку</button>
    </div>
  `;
}

function renderCheckout() {
  view.innerHTML = `
    <div class="section-title">Заявка</div>
    <form class="form fade-in" data-action="submit-order">
      <div class="input">
        <label>ФИО</label>
        <input name="fullName" value="${state.userInfo.fullName || ""}" required />
      </div>
      <div class="input">
        <label>Телефон</label>
        <input name="phone" value="${state.userInfo.phone || ""}" required />
      </div>
      <div class="input">
        <label>Email</label>
        <input name="email" type="email" value="${state.userInfo.email || ""}" required />
      </div>
      <label style="display:flex;gap:10px;align-items:flex-start;font-size:12px;color:#6b6f74">
        <input type="checkbox" name="agree" required />
        <span>Согласен с <a href="${state.config.privacyPolicyUrl}" target="_blank" rel="noreferrer">политикой конфиденциальности</a> и обработкой персональных данных. Оператор: ${state.config.operatorName}.</span>
      </label>
      <button class="btn btn-primary" type="submit">Оформить заявку</button>
    </form>
  `;
}

function renderOrders() {
  const list = state.orders;
  view.innerHTML = `
    <div class="section-title">Мои заказы</div>
    <div class="list fade-in">
      ${list
        .map(
          (o) => `
        <div class="info-card">
          <div class="card-title">Заказ #${o.id}</div>
          <div class="card-desc">${new Date(o.createdAt).toLocaleString("ru-RU")}</div>
          <div class="card-desc">Позиций: ${o.items.length}</div>
          <div class="card-price">${formatPrice(o.total)} ₽</div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderStatic(title, body) {
  view.innerHTML = `
    <div class="section-title">${title}</div>
    <div class="info-card fade-in">
      <p>${body}</p>
    </div>
  `;
}

function render() {
  const { path, query } = parseRoute();
  if (path === "#home") renderHome();
  if (path === "#categories") renderCategories(query.get("section"));
  if (path === "#products") renderProducts(query.get("categoryId"));
  if (path === "#product") renderProduct(query.get("id"));
  if (path === "#favorites") renderFavorites();
  if (path === "#cart") renderCart();
  if (path === "#checkout") renderCheckout();
  if (path === "#orders") renderOrders();
  if (path === "#about") renderStatic("О компании", "Текст о компании будет добавлен позже.");
  if (path === "#payment") renderStatic("Оплата и доставка", "Условия оплаты и доставки будут добавлены позже.");
  if (path === "#contacts") renderStatic("Контакты", "Контактная информация будет добавлена позже.");
  if (path === "#promos") renderStatic("Акции", "Актуальные акции будут добавлены позже.");
  if (path === "#production") renderStatic("Производство", "Информация о производстве будет добавлена позже.");
  updateCartBar();
}

async function bootstrap() {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  state.userId = detectUserId();
  state.config = await api("/api/config");
  state.categories = await api("/api/categories");
  state.products = await api("/api/products");

  loadCart();

  const favList = await api("/api/favorites");
  state.favorites = new Set(favList || []);

  const userInfo = await api("/api/user");
  if (userInfo) state.userInfo = userInfo;

  state.orders = await api("/api/orders");

  render();
}

function addToCart(id) {
  const qty = Number(state.cart.get(id) || 0) + 1;
  state.cart.set(id, qty);
  saveCart();
  updateCartBar();
}

function updateQty(id, delta) {
  const qty = Number(state.cart.get(id) || 0) + delta;
  if (qty <= 0) {
    state.cart.delete(id);
  } else {
    state.cart.set(id, qty);
  }
  saveCart();
  render();
}

async function toggleFavorite(id) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    await api(`/api/favorites/${id}`, { method: "DELETE" });
  } else {
    state.favorites.add(id);
    await api("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ productId: id })
    });
  }
  render();
}

async function clearFavorites() {
  const ids = Array.from(state.favorites);
  for (const id of ids) {
    await api(`/api/favorites/${id}`, { method: "DELETE" });
  }
  state.favorites.clear();
  render();
}

async function submitOrder(form) {
  const data = new FormData(form);
  const customer = {
    fullName: data.get("fullName"),
    phone: data.get("phone"),
    email: data.get("email")
  };

  await api("/api/user", {
    method: "POST",
    body: JSON.stringify(customer)
  });

  const items = Array.from(state.cart.entries()).map(([id, qty]) => ({ id, qty }));
  const response = await api("/api/orders", {
    method: "POST",
    body: JSON.stringify({ items, customer })
  });

  if (response.ok) {
    state.cart.clear();
    saveCart();
    state.orders = await api("/api/orders");
    setRoute("#orders");
  } else {
    view.innerHTML = `<div class="notice">Не удалось отправить заявку. Попробуйте позже.</div>`;
  }
}

function moveSlide(direction) {
  const next = (state.slideIndex + direction + slides.length) % slides.length;
  state.slideIndex = next;
  render();
}

view.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action], [data-route]");
  if (!target) return;

  const action = target.getAttribute("data-action");
  const route = target.getAttribute("data-route");
  if (route) {
    setRoute(route);
    return;
  }

  if (action === "go-home") setRoute("#home");
  if (action === "go-favorites") setRoute("#favorites");
  if (action === "go-cart") setRoute("#cart");
  if (action === "go-contacts") setRoute("#contacts");
  if (action === "toggle-menu") toggleMenu();

  if (action === "add-to-cart") addToCart(target.getAttribute("data-id"));
  if (action === "qty-minus") updateQty(target.getAttribute("data-id"), -1);
  if (action === "qty-plus") updateQty(target.getAttribute("data-id"), 1);
  if (action === "toggle-favorite") toggleFavorite(target.getAttribute("data-id"));
  if (action === "remove-favorite") toggleFavorite(target.getAttribute("data-id"));
  if (action === "favorites-to-cart") {
    state.favorites.forEach((id) => addToCart(id));
    render();
  }
  if (action === "clear-favorites") clearFavorites();

  if (action === "slide-prev") moveSlide(-1);
  if (action === "slide-next") moveSlide(1);
  if (action === "slide-dot") {
    state.slideIndex = Number(target.getAttribute("data-index")) || 0;
    render();
  }
});

cartBar.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='go-cart']");
  if (button) setRoute("#cart");
});

menuBackdrop.addEventListener("click", () => toggleMenu(false));
menu.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-route]");
  if (!btn) return;
  toggleMenu(false);
  setRoute(btn.getAttribute("data-route"));
});

view.addEventListener("submit", (event) => {
  if (event.target?.getAttribute("data-action") === "submit-order") {
    event.preventDefault();
    submitOrder(event.target);
  }
});

window.addEventListener("hashchange", render);

document.addEventListener("DOMContentLoaded", bootstrap);
