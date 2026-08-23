(function () {
  "use strict";

  var STORAGE_KEY = "fc_hasScanned";

  var views = document.querySelectorAll(".view");
  var tabs = document.querySelectorAll(".tab");
  var scanOverlay = document.getElementById("scanOverlay");
  var toastEl = document.getElementById("toast");

  function hasScanned() {
    return localStorage.getItem(STORAGE_KEY) === "1";
  }

  function showView(name) {
    views.forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + name);
    });
    tabs.forEach(function (t) {
      t.classList.toggle("active", t.dataset.view === name);
    });
    if (name === "home") renderHome();
    document.querySelectorAll(".view.active")[0].scrollTop = 0;
  }

  function renderHome() {
    var scanned = hasScanned();
    document.getElementById("heroDefault").hidden = !scanned;
    document.getElementById("heroEmpty").hidden = scanned;
    document.getElementById("activityDefault").hidden = !scanned;
    document.getElementById("activityEmpty").hidden = scanned;
    document.getElementById("bellDot").hidden = scanned;
  }

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }

  // --- tab bar navigation ---
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      showView(tab.dataset.view);
    });
  });

  // --- home screen ---
  document.getElementById("scanBtn").addEventListener("click", function () {
    scanOverlay.hidden = false;
    setTimeout(function () {
      localStorage.setItem(STORAGE_KEY, "1");
      scanOverlay.hidden = true;
      showView("receipt");
    }, 900);
  });

  document.getElementById("lastScanCard").addEventListener("click", function () {
    showView("receipt");
    switchInventorySubview("receipt");
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    localStorage.removeItem(STORAGE_KEY);
    renderHome();
    showToast("初期状態に戻しました");
  });

  // --- receipt screen ---
  document.getElementById("backBtn").addEventListener("click", function () {
    showView("home");
  });

  document.querySelectorAll("[data-edit]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var nameEl = btn.previousElementSibling;
      var editing = nameEl.getAttribute("contenteditable") === "true";
      if (editing) {
        nameEl.setAttribute("contenteditable", "false");
        showToast("品目名を更新しました");
      } else {
        nameEl.setAttribute("contenteditable", "true");
        nameEl.focus();
        var range = document.createRange();
        range.selectNodeContents(nameEl);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  });

  // --- inventory sub-navigation (レシート解析結果 / お店) ---
  function switchInventorySubview(name) {
    document.querySelectorAll(".seg-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.subview === name);
    });
    document.querySelectorAll(".subview").forEach(function (v) {
      v.classList.toggle("active", v.id === "subview-" + name);
    });
  }
  document.querySelectorAll(".seg-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchInventorySubview(btn.dataset.subview);
    });
  });

  // --- store data: single source of truth for history, totals and category prices ---
  var STORE_META = {
    A: {
      name: "Aスーパー",
      visits: 5,
      total: 18940,
      history: [
        { date: "2026/07/02", total: 2010 },
        { date: "2026/06/25", total: 3480 },
        { date: "2026/06/18", total: 4120 },
        { date: "2026/06/09", total: 3960 },
        { date: "2026/06/02", total: 5370 }
      ],
      prices: { meat_fish: 480, veg_fruit: 158, dairy_egg: 210, staple_other: 320 }
    },
    B: {
      name: "Bスーパー",
      visits: 3,
      total: 9870,
      history: [
        { date: "2026/06/29", total: 3340 },
        { date: "2026/06/14", total: 2980 },
        { date: "2026/06/05", total: 3550 }
      ],
      prices: { meat_fish: 540, veg_fruit: 118, dairy_egg: 206, staple_other: 335 }
    }
  };
  var CATEGORIES = [
    { key: "meat_fish", label: "肉・魚" },
    { key: "veg_fruit", label: "野菜・果物" },
    { key: "dairy_egg", label: "乳製品・卵" },
    { key: "staple_other", label: "米・パン・麺・調味料など" }
  ];

  function renderStores() {
    var list = document.getElementById("storeList");
    if (!list) return;
    list.innerHTML = Object.keys(STORE_META).map(function (key) {
      var store = STORE_META[key];
      var historyRows = store.history.map(function (h) {
        return '<div class="store-history-row"><span>' + h.date + "</span><span>¥" + h.total.toLocaleString() + "</span></div>";
      }).join("");
      return (
        '<div class="card store-card" data-store="' + key + '">' +
        '<button class="store-summary" data-store-toggle>' +
        '<div class="store-avatar store-' + key + '">' + key + "</div>" +
        '<div class="store-info">' +
        '<div class="store-name">' + store.name + "</div>" +
        '<div class="store-stats">利用' + store.visits + "回 ・ 合計¥" + store.total.toLocaleString() + "</div>" +
        "</div>" +
        '<svg class="store-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
        "</button>" +
        '<div class="store-history" hidden>' + historyRows + "</div>" +
        "</div>"
      );
    }).join("");

    document.querySelectorAll("[data-store-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".store-card");
        var history = card.querySelector(".store-history");
        var open = card.classList.toggle("is-open");
        history.hidden = !open;
      });
    });
  }
  renderStores();

  function priceChip(storeKey, price, isCheap) {
    var check = isCheap
      ? '<svg class="chip-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
      : "";
    return (
      '<span class="price-chip' + (isCheap ? " is-cheap" : "") + '">' +
      check +
      STORE_META[storeKey].name +
      " 平均¥" +
      price.toLocaleString() +
      "</span>"
    );
  }

  function renderPriceTrend() {
    var list = document.getElementById("compareList");
    if (!list) return;
    list.innerHTML = CATEGORIES.map(function (cat) {
      var priceA = STORE_META.A.prices[cat.key];
      var priceB = STORE_META.B.prices[cat.key];
      var diff = Math.abs(priceA - priceB);
      var cheaper = priceA === priceB ? null : priceA < priceB ? "A" : "B";
      var summary =
        cheaper === null
          ? cat.label + "はどちらもほぼ同じ価格です。"
          : cat.label + "は" + STORE_META[cheaper].name + "が平均¥" + diff + "安い傾向です。";
      return (
        '<div class="compare-row">' +
        '<div class="compare-label">' + cat.label + "</div>" +
        '<p class="compare-summary">' + summary + "</p>" +
        '<div class="compare-chips">' +
        priceChip("A", priceA, cheaper === "A") +
        priceChip("B", priceB, cheaper === "B") +
        "</div>" +
        "</div>"
      );
    }).join("");
  }
  renderPriceTrend();

  function updateHomeSpend() {
    var total = Object.keys(STORE_META).reduce(function (sum, key) {
      return sum + STORE_META[key].total;
    }, 0);
    document.getElementById("homeSpendTotal").textContent = "¥" + total.toLocaleString();
  }
  updateHomeSpend();

  document.getElementById("homeFridgeStat").addEventListener("click", function () {
    showView("receipt");
    switchInventorySubview("receipt");
  });
  document.getElementById("homeSpendStat").addEventListener("click", function () {
    showView("receipt");
    switchInventorySubview("stores");
  });

  // --- fridge item status (残っている / 消費済み) ---
  var fridgeRemaining = document.getElementById("fridgeRemaining");
  var fridgeUsed = document.getElementById("fridgeUsed");
  var fridgeCount = document.getElementById("fridgeCount");
  var usedEmptyMsg = document.getElementById("usedEmptyMsg");

  function updateFridgeCount() {
    var n = fridgeRemaining.children.length;
    fridgeCount.textContent = n + "品";
    document.getElementById("homeFridgeCount").textContent = n;
  }
  updateFridgeCount();

  function updateUsedEmptyState() {
    usedEmptyMsg.hidden = fridgeUsed.children.length > 0;
  }

  document.querySelectorAll("[data-status-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".fridge-item");
      var nowUsed = item.dataset.status !== "used";
      item.dataset.status = nowUsed ? "used" : "remaining";
      item.classList.toggle("is-used", nowUsed);
      btn.classList.toggle("st-used", nowUsed);
      btn.classList.toggle("st-remaining", !nowUsed);
      btn.querySelector(".icon-remaining").hidden = nowUsed;
      btn.querySelector(".icon-used").hidden = !nowUsed;
      btn.querySelector(".label").textContent = nowUsed ? "消費済み" : "残っている";
      (nowUsed ? fridgeUsed : fridgeRemaining).appendChild(item);
      updateFridgeCount();
      updateUsedEmptyState();
    });
  });

  // --- nutrition screen: recipe suggestions built only from what's in the fridge ---
  var VEGETABLE_INGREDIENTS = ["ほうれん草", "トマト"]; // matches this week's diagnosis ("今週は野菜が不足しています")

  var HERO_RECIPE = { ingredients: ["サーモン", "ほうれん草", "キノア"] };

  var RECIPE_CATEGORIES = {
    main: {
      label: "メイン料理",
      items: [
        { name: "サーモンとほうれん草のソテー", ingredients: ["サーモン", "ほうれん草"] },
        { name: "トマトと卵の炒め物", ingredients: ["トマト", "卵"] },
        { name: "キノアと卵のチャーハン風", ingredients: ["キノア", "卵"] },
        { name: "サーモンのムニエル", ingredients: ["サーモン", "牛乳"] }
      ]
    },
    side: {
      label: "副菜",
      items: [
        { name: "ほうれん草の胡麻和え", ingredients: ["ほうれん草"] },
        { name: "トマトサラダ", ingredients: ["トマト"] },
        { name: "キノアサラダ", ingredients: ["キノア"] }
      ]
    },
    soup: {
      label: "汁物",
      items: [
        { name: "卵とトマトのスープ", ingredients: ["卵", "トマト"] },
        { name: "牛乳のクリームスープ(キノア入り)", ingredients: ["牛乳", "キノア"] },
        { name: "ほうれん草の味噌汁", ingredients: ["ほうれん草"] }
      ]
    }
  };

  function isVeggieRecipe(ingredients) {
    return ingredients.some(function (i) {
      return VEGETABLE_INGREDIENTS.indexOf(i) !== -1;
    });
  }

  // Search by the fridge ingredients themselves (not the invented dish name),
  // so the linked-out results are actually built around food the user has.
  function cookpadSearchUrl(ingredients) {
    return "https://cookpad.com/search/" + encodeURIComponent(ingredients.join(" "));
  }

  function renderRecipeCategory(key) {
    var list = document.getElementById("recipeCategoryList");
    if (!list) return;
    list.innerHTML = RECIPE_CATEGORIES[key].items.map(function (item) {
      var isRecommended = isVeggieRecipe(item.ingredients);
      return (
        '<a class="recipe-item" href="' + cookpadSearchUrl(item.ingredients) + '" target="_blank" rel="noopener">' +
        '<span class="recipe-item-text">' +
        '<span class="recipe-item-name">' + item.name + "</span>" +
        '<span class="recipe-item-ingredients">使用食材: ' + item.ingredients.join("・") + "</span>" +
        "</span>" +
        (isRecommended ? '<span class="badge-recommend">おすすめ</span>' : "") +
        '<svg class="ext-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>' +
        "</a>"
      );
    }).join("");
  }

  document.querySelectorAll(".cat-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".cat-btn").forEach(function (b) {
        b.classList.toggle("active", b === btn);
      });
      renderRecipeCategory(btn.dataset.category);
    });
  });
  document.querySelector('.cat-btn[data-category="main"]').classList.add("active");
  renderRecipeCategory("main");

  document.getElementById("heroRecipeLink").href = cookpadSearchUrl(HERO_RECIPE.ingredients);

  document.getElementById("scrollHintBtn").addEventListener("click", function () {
    document.getElementById("view-nutrition").scrollBy({ top: 360, behavior: "smooth" });
  });

  // --- initial render ---
  renderHome();
})();
