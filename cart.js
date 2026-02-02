// cart.js
// Рендер меню, корзины, подсчёт суммы и отправка предзаказа.

(function () {
  const MENU = window.HORECA_MENU || [];
  const TG = window.HORECA_TG;
  const IMAGE_MAP = window.HORECA_IMAGES || {};

  // DOM
  const categoriesEl = document.getElementById("categories");
  const menuEl = document.getElementById("menu");

  const cartButton = document.getElementById("cartButton");
  const cartCountEl = document.getElementById("cartCount");
  const historyButton = document.getElementById("historyButton");
  const cartFab = document.getElementById("cartFab");
  const cartFabCount = document.getElementById("cartFabCount");
  const cartFabTotal = document.getElementById("cartFabTotal");

  const cartScreen = document.getElementById("cartScreen");
  const closeCartBtn = document.getElementById("closeCart");
  const cartItemsEl = document.getElementById("cartItems");
  const orderHistoryEl = document.getElementById("orderHistory");
  const ordersScreen = document.getElementById("ordersScreen");
  const closeOrdersBtn = document.getElementById("closeOrders");

  const phoneInput = document.getElementById("phoneInput");
  const timeInput = document.getElementById("timeInput");
  const commentInput = document.getElementById("commentInput");
  const tgProfileEl = document.getElementById("tgProfile");

  const tabMenu = document.getElementById("tabMenu");
  const tabBooking = document.getElementById("tabBooking");
  const menuSection = document.getElementById("menuSection");
  const bookingSection = document.getElementById("bookingSection");

  const bookingName = document.getElementById("bookingName");
  const bookingPhone = document.getElementById("bookingPhone");
  const bookingDate = document.getElementById("bookingDate");
  const bookingTime = document.getElementById("bookingTime");
  const bookingGuests = document.getElementById("bookingGuests");
  const bookingComment = document.getElementById("bookingComment");
  const bookingStatus = document.getElementById("bookingStatus");
  const bookingSend = document.getElementById("bookingSend");

  const totalPriceEl = document.getElementById("totalPrice");
  const sendOrderBtn = document.getElementById("sendOrder");
  const statusBox = document.getElementById("statusBox");

  // State
  let activeCategoryId = MENU[0]?.id || "";
  // cart: { itemId: qty }
  const cart = {};
  function getHistoryKey() {
    const uid = TG?.initDataUnsafe?.user?.id;
    return uid ? `horeca_orders_v1_${uid}` : "horeca_orders_v1_guest";
  }

  function show(msg) {
    if (TG && typeof TG.show === "function") TG.show(msg);
    else console.log(msg);
  }
  function setStatus(msg) {
    if (statusBox) statusBox.textContent = msg || "";
  }

  function loadHistory() {
    try {
      const raw = localStorage.getItem(getHistoryKey());
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(getHistoryKey(), JSON.stringify(list.slice(0, 10)));
    } catch {
      // ignore storage errors
    }
  }

  function pushHistory(payload) {
    const items = (payload.items || []).map((it) => ({
      id: it.id,
      name: it.name,
      qty: it.qty,
      price: it.price,
    }));
    const entry = {
      id: Date.now(),
      created_at: payload.created_at,
      total: payload.total,
      items,
      phone: payload.phone || "",
    };
    const list = loadHistory().slice(0, 5);
    list.unshift(entry);
    saveHistory(list);
  }
  function setBookingStatus(msg) {
    if (bookingStatus) bookingStatus.textContent = msg || "";
  }

  function formatTime(value) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }

  function formatDate(value) {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  }

  function formatTime(value) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }


  function bindMask(input, formatter) {
    if (!input) return;
    input.addEventListener("input", () => {
      const pos = input.selectionStart || 0;
      const before = input.value;
      input.value = formatter(input.value);
      if (input.value.length >= before.length) {
        input.selectionStart = input.selectionEnd = pos + (input.value.length - before.length);
      }
    });
  }

  function bindTemplate(input, template) {
    if (!input) return;

    function fillTemplate(digits) {
      let di = 0;
      return template.replace(/_/g, () => (di < digits.length ? digits[di++] : "_"));
    }

    function caretToNext() {
      const next = input.value.indexOf("_");
      const pos = next === -1 ? input.value.length : next;
      input.selectionStart = input.selectionEnd = pos;
    }

    function normalize() {
      const digits = input.value.replace(/\D/g, "");
      input.value = fillTemplate(digits);
      caretToNext();
    }

    input.value = template;

    input.addEventListener("focus", () => {
      if (!input.value || input.value === template) {
        input.value = template;
      }
      caretToNext();
    });

    input.addEventListener("click", () => {
      caretToNext();
    });

    input.addEventListener("input", () => {
      normalize();
    });
  }


  function setActiveTab(name) {
    if (!tabMenu || !tabBooking || !menuSection || !bookingSection) return;
    const isMenu = name === "menu";
    tabMenu.classList.toggle("active", isMenu);
    tabBooking.classList.toggle("active", !isMenu);
    menuSection.classList.toggle("hidden", !isMenu);
    bookingSection.classList.toggle("hidden", isMenu);
  }

  function saveProfile(name, phone) {
    if (name) localStorage.setItem("horeca_name", name);
    if (phone) localStorage.setItem("horeca_phone", phone);
  }

  function findItem(itemId) {
    for (const c of MENU) {
      for (const it of c.items) {
        if (it.id === itemId) return it;
      }
    }
    return null;
  }

  function cartCount() {
    return Object.values(cart).reduce((a, b) => a + b, 0);
  }

  function cartTotal() {
    let total = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const it = findItem(id);
      if (!it) continue;
      total += Number(it.price) * Number(qty);
    }
    return total;
  }

  function setQty(itemId, qty) {
    const q = Number(qty);
    if (q <= 0) delete cart[itemId];
    else cart[itemId] = q;
  }

  // ---------- Render Categories ----------
  function renderCategories() {
    categoriesEl.innerHTML = "";
    for (const c of MENU) {
      const b = document.createElement("div");
      b.className = "category" + (c.id === activeCategoryId ? " active" : "");
      b.textContent = c.title;
      b.onclick = () => {
        activeCategoryId = c.id;
        renderCategories();
        const section = document.getElementById(`cat-${c.id}`);
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      categoriesEl.appendChild(b);
    }
  }

  // ---------- Render Menu ----------
  function renderMenu() {
    menuEl.innerHTML = "";
    for (const cat of MENU) {
      const section = document.createElement("section");
      section.id = `cat-${cat.id}`;
      section.dataset.cat = cat.id;

      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = cat.title;
      section.appendChild(title);

      const grid = document.createElement("div");
      grid.className = "menu-grid";

      for (const it of cat.items) {
        const qty = cart[it.id] || 0;

        const card = document.createElement("div");
        card.className = "menu-item";

        const safeDesc = (it.desc || "").trim();
        const safeWeight = (it.weight || "").trim();

        const imageUrl = (it.image || it.img || it.photo || IMAGE_MAP[it.id] || IMAGE_MAP[it.name] || "").trim();

        card.innerHTML = `
          <div class="menu-image">
            ${imageUrl ? `<img src="${imageUrl}" alt="${it.name}" loading="lazy" />` : `<div class="menu-image-placeholder"></div>`}
          </div>
          <div class="menu-content">
            <div class="menu-title">${it.name}</div>
            ${safeDesc ? `<div class="menu-desc">${safeDesc}</div>` : ""}
            <div class="menu-bottom">
              <div class="menu-meta">
                ${safeWeight ? `<div class="menu-weight">${safeWeight}</div>` : `<div class="menu-weight"></div>`}
                <div class="menu-price">${it.price} ₽</div>
              </div>

              <div class="controls">
                <button class="btnMinus" type="button">-</button>
                <span class="qty">${qty}</span>
                <button class="btnPlus" type="button">+</button>
              </div>
            </div>
          </div>
        `;

        const minus = card.querySelector(".btnMinus");
        const plus = card.querySelector(".btnPlus");

        minus.onclick = () => {
          const current = cart[it.id] || 0;
          setQty(it.id, current - 1);
          updateAll();
        };

        plus.onclick = () => {
          const current = cart[it.id] || 0;
          setQty(it.id, current + 1);
          updateAll();
        };

        grid.appendChild(card);
      }

      section.appendChild(grid);
      menuEl.appendChild(section);
    }
  }

  let scrollTick = false;
  function getCategoriesBarBottom() {
    const bar = document.getElementById("categories");
    if (!bar) return 0;
    const r = bar.getBoundingClientRect();
    return r.bottom;
  }

  function updateActiveCategoryByScroll() {
    if (scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      const sections = Array.from(menuEl.querySelectorAll("section[data-cat]"));
      if (!sections.length) return;
      const y = getCategoriesBarBottom() + 4;
      let current = sections[0];
      for (let i = 0; i < sections.length; i++) {
        const top = sections[i].getBoundingClientRect().top;
        if (top <= y) current = sections[i];
        else break;
      }
      const id = current?.dataset?.cat;
      if (id && id !== activeCategoryId) {
        activeCategoryId = id;
        renderCategories();
      }
    });
  }

  function setupCategoryObserver() {
    updateActiveCategoryByScroll();
    window.removeEventListener("scroll", updateActiveCategoryByScroll);
    window.addEventListener("scroll", updateActiveCategoryByScroll, { passive: true });
    window.addEventListener("resize", updateActiveCategoryByScroll);
  }

  // ---------- Cart Screen ----------
  function openCart() {
    cartScreen.classList.remove("hidden");
    if (ordersScreen) ordersScreen.classList.add("hidden");
    if (cartFab) cartFab.classList.add("hidden");
    renderCart();
  }

  function closeCart() {
    cartScreen.classList.add("hidden");
    updateAll();
  }

  function openOrders() {
    if (!ordersScreen) return;
    ordersScreen.classList.remove("hidden");
    cartScreen.classList.add("hidden");
    renderHistory();
  }

  function closeOrders() {
    if (!ordersScreen) return;
    ordersScreen.classList.add("hidden");
  }

  function renderCart() {
    cartItemsEl.innerHTML = "";

    const ids = Object.keys(cart);

    if (ids.length === 0) {
      cartItemsEl.innerHTML = `
        <div class="menu-item">
          <div class="menu-title">Корзина пустая</div>
          <div class="menu-desc">Добавь позиции из меню</div>
        </div>`;
      totalPriceEl.textContent = "0";
      return;
    }

    for (const id of ids) {
      const it = findItem(id);
      if (!it) continue;

      const qty = cart[id];
      const sum = Number(it.price) * Number(qty);

      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item-title">${it.name}</div>
        <div class="cart-item-sub">${it.price} ₽ × ${qty} = ${sum} ₽</div>
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button class="btnMinus" type="button">-</button>
          <button class="btnPlus" type="button">+</button>
          <button class="btnRemove" type="button" style="margin-left:auto; opacity:0.8;">Удалить</button>
        </div>
      `;

      row.querySelector(".btnMinus").onclick = () => {
        setQty(id, (cart[id] || 0) - 1);
        updateAll();
        renderCart();
      };

      row.querySelector(".btnPlus").onclick = () => {
        setQty(id, (cart[id] || 0) + 1);
        updateAll();
        renderCart();
      };

      row.querySelector(".btnRemove").onclick = () => {
        delete cart[id];
        updateAll();
        renderCart();
      };

      cartItemsEl.appendChild(row);
    }

    totalPriceEl.textContent = String(cartTotal());

    renderHistory();
  }

  function renderHistory() {
    if (!orderHistoryEl) return;
    const list = loadHistory().slice(0, 10);
    if (!list.length) {
      orderHistoryEl.innerHTML = `<div class="history-title">Пока нет заказов</div>`;
      return;
    }
    orderHistoryEl.innerHTML = `<div class="history-title">История заказов</div>`;
    for (const h of list) {
      const itemsText = (h.items || [])
        .map((it) => `${it.name} × ${it.qty}`)
        .join(", ");
      const row = document.createElement("div");
      row.className = "history-item";
      row.innerHTML = `
        <div class="history-meta">${new Date(h.created_at).toLocaleString()}</div>
        <div class="history-meta">${itemsText}</div>
        <div class="history-meta">Итого: ${h.total} ₽</div>
        <div class="history-actions">
          <button class="history-repeat" type="button">Повторить заказ</button>
        </div>
      `;
      row.querySelector(".history-repeat").onclick = () => {
        repeatOrder(h);
      };
      orderHistoryEl.appendChild(row);
    }
  }

  function repeatOrder(h) {
    // очищаем текущую корзину
    for (const k of Object.keys(cart)) delete cart[k];
    for (const it of h.items || []) {
      if (!it.id) continue;
      setQty(it.id, it.qty || 1);
    }
    if (phoneInput && h.phone) phoneInput.value = h.phone;
    if (timeInput) timeInput.value = "";
    if (commentInput) commentInput.value = "";
    updateAll();
    openCart();
    setStatus("Заполни время и комментарий, затем отправь заказ.");
  }

  // ---------- Build payload ----------
  function buildPayload() {
    const tgUser = TG?.initDataUnsafe?.user || null;
    const items = [];

    for (const [id, qty] of Object.entries(cart)) {
      const it = findItem(id);
      if (!it) continue;
      items.push({
        id: it.id,
        name: it.name,
        price: it.price,
        qty: qty,
        sum: Number(it.price) * Number(qty),
      });
    }

    return {
      payload_version: 2,
      type: "preorder",
      tg: tgUser
        ? {
            id: tgUser.id,
            username: tgUser.username || "",
            first_name: tgUser.first_name || "",
            last_name: tgUser.last_name || "",
          }
        : null,
      phone: phoneInput.value.trim(),
      desired_time: timeInput.value.trim(),
      comment: commentInput.value.trim(),
      total: cartTotal(),
      items,
      created_at: new Date().toISOString(),
    };
  }

  function buildPayloadCompact() {
    const tgUser = TG?.initDataUnsafe?.user || null;
    const items = [];
    for (const [id, qty] of Object.entries(cart)) {
      items.push({ id, qty: Number(qty) });
    }
    return {
      payload_version: 2,
      compact: true,
      type: "preorder",
      tg: tgUser
        ? {
            id: tgUser.id,
            username: tgUser.username || "",
            first_name: tgUser.first_name || "",
            last_name: tgUser.last_name || "",
          }
        : null,
      phone: phoneInput.value.trim(),
      desired_time: timeInput.value.trim(),
      comment: commentInput.value.trim(),
      total: cartTotal(),
      items,
      created_at: new Date().toISOString(),
    };
  }

  function validate(payload) {
    if (!payload.phone) return "Укажи телефон для подтверждения.";
    if (!payload.desired_time) return "Укажи, к какому времени приготовить.";
    if (!payload.items || payload.items.length === 0) return "Корзина пустая.";
    return null;
  }

  // ---------- Send order ----------
  async function sendOrder() {
    let payload = buildPayload();
    const err = validate(payload);
    if (err) {
      show(err);
      setStatus(err);
      return;
    }

    setStatus("⏳ Отправляю заказ...");
    let raw = JSON.stringify(payload);
    let compact = false;
    if (raw.length > 3500) {
      payload = buildPayloadCompact();
      raw = JSON.stringify(payload);
      compact = true;
    }
    if (raw.length > 3500) {
      const msg = "❌ Заказ слишком большой для отправки. Уменьши корзину.";
      show(msg);
      setStatus(msg);
      return;
    }

    setStatus(`⏳ Отправляю заказ... (payload ${raw.length} bytes${compact ? ", compact" : ""})`);
    if (sendOrderBtn) sendOrderBtn.disabled = true;

    if (!TG || typeof TG.sendOrder !== "function") {
      show("❌ Ошибка: telegram.js не подключился (HORECA_TG не найден).");
      setStatus("❌ Ошибка: telegram.js не подключился.");
      if (sendOrderBtn) sendOrderBtn.disabled = false;
      console.log("payload:", payload);
      return;
    }

    // API‑first: надёжный канал. sendData оставляем как фоллбэк.
    if (TG && typeof TG.sendOrderViaApi === "function" && TG.apiUrl) {
      const res = await TG.sendOrderViaApi(payload);
      if (!res.ok) {
        // fallback to Telegram sendData if API failed
        if (TG && typeof TG.sendOrder === "function" && TG.hasInitData) {
          TG.sendOrder(payload);
        } else {
          const detail = res.error ? ` (${res.error})` : "";
          const msg = `❌ Не удалось отправить заказ через API.${detail}`;
          show(msg);
          setStatus(msg);
          if (sendOrderBtn) sendOrderBtn.disabled = false;
          return;
        }
      }
    } else if (TG && typeof TG.sendOrder === "function") {
      TG.sendOrder(payload);
    } else {
      const msg = "❌ Нет доступного канала отправки заказа.";
      show(msg);
      setStatus(msg);
      if (sendOrderBtn) sendOrderBtn.disabled = false;
      return;
    }

    setStatus("✅ Заказ оформлен. Ожидайте звонка для подтверждения.");
    pushHistory(payload);
    saveProfile("", phoneInput.value.trim());
    if (sendOrderBtn) sendOrderBtn.disabled = false;

    // очищаем корзину
    for (const k of Object.keys(cart)) delete cart[k];

    // очищаем комментарий, телефон/время оставляем
    commentInput.value = "";

    updateAll();
    renderCart();
  }

  async function sendBooking() {
    if (!TG || typeof TG.sendOrderViaApi !== "function" || !TG.apiUrl) {
      setBookingStatus("❌ Канал брони не настроен.");
      return;
    }

    const payload = {
      type: "booking",
      tg: TG?.initDataUnsafe?.user
        ? {
            id: TG.initDataUnsafe.user.id,
            username: TG.initDataUnsafe.user.username || "",
            first_name: TG.initDataUnsafe.user.first_name || "",
            last_name: TG.initDataUnsafe.user.last_name || "",
          }
        : null,
      name: bookingName.value.trim(),
      phone: bookingPhone.value.trim(),
      date: bookingDate.value.trim(),
      time: bookingTime.value.trim(),
      guests: bookingGuests.value.trim(),
      comment: bookingComment.value.trim(),
      created_at: new Date().toISOString(),
    };

    if (!payload.name || !payload.phone || !payload.date || !payload.time || !payload.guests) {
      setBookingStatus("❌ Заполни имя, телефон, дату, время и гостей.");
      return;
    }

    // Ограничение времени: 13:00–00:00
    const timeDigits = payload.time.replace(/\D/g, "");
    let h = -1, m = -1;
    if (timeDigits.length >= 4) {
      h = parseInt(timeDigits.slice(0, 2), 10);
      m = parseInt(timeDigits.slice(2, 4), 10);
    }
    const minutes = h * 60 + m;
    const isValidRange = (minutes >= 13 * 60 && minutes <= 23 * 60 + 59) || minutes === 0;
    if (!isValidRange) {
      setBookingStatus("❌ Бронь доступна с 13:00 до 00:00.");
      return;
    }

    setBookingStatus("⏳ Отправляю бронь...");
    const res = await TG.sendOrderViaApi(payload);
    if (!res.ok) {
      setBookingStatus("❌ Не удалось отправить бронь.");
      return;
    }

    setBookingStatus("✅ Бронь отправлена. Мы свяжемся с вами.");
    saveProfile(payload.name, payload.phone);
  }

  // ---------- UI updates ----------
  function updateAll() {
    const count = cartCount();
    const total = cartTotal();
    cartCountEl.textContent = String(count);
    totalPriceEl.textContent = String(total);
    renderCategories();
    renderMenu();

    if (cartFab && cartFabCount && cartFabTotal) {
      cartFabCount.textContent = String(count);
      cartFabTotal.textContent = String(total);
      if (count > 0 && cartScreen.classList.contains("hidden")) {
        cartFab.classList.remove("hidden");
      } else {
        cartFab.classList.add("hidden");
      }
    }
  }

  // ---------- Events ----------
  cartButton.onclick = openCart;
  if (historyButton) historyButton.onclick = openOrders;
  if (cartFab) cartFab.onclick = openCart;
  closeCartBtn.onclick = closeCart;
  if (closeOrdersBtn) closeOrdersBtn.onclick = closeOrders;
  sendOrderBtn.onclick = sendOrder;
  if (tabMenu) tabMenu.onclick = () => setActiveTab("menu");
  if (tabBooking) tabBooking.onclick = () => setActiveTab("booking");
  if (bookingSend) bookingSend.onclick = sendBooking;

  // Скрывать клавиатуру при тапе в пустое место
  document.addEventListener("touchstart", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.closest("input, textarea, button")) return;
    const active = document.activeElement;
    if (active && active instanceof HTMLElement) active.blur();
  });

  // ---------- Init ----------
  // Без технических статусов при старте
  if (tgProfileEl) {
    const u = TG?.initDataUnsafe?.user;
    if (u) {
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
      const username = u.username ? `@${u.username}` : "";
      tgProfileEl.textContent = [name, username].filter(Boolean).join(" ");
    } else {
      tgProfileEl.textContent = "—";
    }
  }
  if (phoneInput) {
    const savedPhone = localStorage.getItem("horeca_phone") || "";
    if (!phoneInput.value) phoneInput.value = savedPhone;
  }
  if (bookingName) {
    const savedName = localStorage.getItem("horeca_name") || "";
    if (!bookingName.value) bookingName.value = savedName;
  }
  if (bookingPhone) {
    const savedPhone = localStorage.getItem("horeca_phone") || "";
    if (!bookingPhone.value) bookingPhone.value = savedPhone;
  }
  bindTemplate(timeInput, "__:__");
  bindMask(bookingTime, formatTime);
  bindMask(bookingDate, formatDate);
  setActiveTab("menu");
  renderHistory();
  renderCategories();
  renderMenu();
  setupCategoryObserver();
  cartCountEl.textContent = "0";
  totalPriceEl.textContent = "0";
  // init masks for booking date/time
})();
