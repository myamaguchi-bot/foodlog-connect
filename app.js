(function () {
  "use strict";

  var STORAGE_KEY = "fc_hasScanned";
  var STATE_KEY = "fc_app_state_v1";
  var savedStateCache;

  function getSavedState() {
    if (savedStateCache !== undefined) return savedStateCache;
    try {
      var raw = localStorage.getItem(STATE_KEY);
      savedStateCache = raw ? JSON.parse(raw) : null;
    } catch (e) {
      savedStateCache = null;
    }
    return savedStateCache;
  }

  // Saved on every change so the demo survives page reloads on this device/browser
  // (this is browser-local storage, not a real server — it doesn't sync across devices).
  function saveState() {
    var itemStatus = {};
    ITEM_SOURCE.forEach(function (item, index) {
      itemStatus[index] = {
        status: item.status || "remaining",
        consumedAt: item.consumedAt || null,
        pantryStatus: item.currentPantryStatus || item.initialStatus || "ok",
        productName: item.productName
      };
    });
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        storeMeta: STORE_META,
        itemStatus: itemStatus,
        currentReceiptStoreKey: currentReceiptStoreKey,
        receiptItemNames: RECEIPT_ITEMS.map(function (i) { return i.name; })
      }));
    } catch (e) {}
  }

  var views = document.querySelectorAll(".view");
  var tabs = document.querySelectorAll(".tab");
  var scanOverlay = document.getElementById("scanOverlay");
  var toastEl = document.getElementById("toast");

  // 発表などの初回アクセス時に、その場でのカメラ撮影に失敗するリスクを避けるため、
  // 何も保存されていない状態(=初めてこのブラウザで開いたとき)は「スキャン済み」を既定値にする。
  // リセットボタンを押すと明示的に"0"を保存し、スキャン前の空の状態を再現できるようにする。
  function hasScanned() {
    return localStorage.getItem(STORAGE_KEY) !== "0";
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
  // Tapping "scan" opens the device camera for real (via the file input's
  // capture attribute); the captured photo is shown as the receipt background,
  // though the text inside it is still fixed demo data, not actually read.
  var receiptFileInput = document.getElementById("receiptFileInput");
  var receiptPhotoCard = document.getElementById("receiptPhotoCard");

  document.getElementById("scanBtn").addEventListener("click", function () {
    receiptFileInput.click();
  });

  receiptFileInput.addEventListener("change", function () {
    var file = receiptFileInput.files && receiptFileInput.files[0];
    receiptFileInput.value = "";
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      scanOverlay.hidden = false;
      setTimeout(function () {
        receiptPhotoCard.style.backgroundImage = "url(" + e.target.result + ")";
        localStorage.setItem(STORAGE_KEY, "1");
        scanOverlay.hidden = true;
        showView("receipt");
      }, 900);
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("lastScanCard").addEventListener("click", function () {
    showView("receipt");
  });

  document.getElementById("resetBtn").addEventListener("click", function () {
    localStorage.setItem(STORAGE_KEY, "0");
    localStorage.removeItem(STATE_KEY);
    location.reload();
  });

  // --- receipt screen ---
  document.getElementById("backBtn").addEventListener("click", function () {
    showView("home");
  });

  // Transcribed from an actual receipt (ツルヤ徳間店, 2026/08/23) the user photographed
  // and shared, so this screen reflects real purchase data rather than invented text.
  var RECEIPT_ITEMS = [
    { name: "レタス", price: 69 },
    { name: "ピーマン", price: 69 },
    { name: "みょうが", price: 79 },
    { name: "人参", price: 99 },
    { name: "市田柿", price: 599 },
    { name: "G皮なしウインナー", price: 199 },
    { name: "蒸しだこ", price: 522 },
    { name: "綾里浜刺身わかめ", price: 139 },
    { name: "きざみあげジャンボ", price: 99 },
    { name: "金のつぶたっぷりおだ", price: 109, lowConfidence: true },
    { name: "国産紅生姜(2個)", price: 238 },
    { name: "純生シュークリーム", price: 399 },
    { name: "森林そだち中玉", price: 219 },
    { name: "特選丸大豆しょうゆ", price: 249 },
    { name: "ツルヤ純米本みりん", price: 499 },
    { name: "料理酒国産米使用", price: 189 },
    { name: "シジシー上白糖", price: 199, lowConfidence: true },
    { name: "お新香三五八", price: 339 },
    { name: "さっぱり漬の素", price: 279 },
    { name: "なすの油みそのたれ", price: 129 },
    { name: "ヤマナカ塩こんぶ", price: 159 },
    { name: "手延そうめん", price: 299 },
    { name: "アカシアはちみつ", price: 1290 },
    { name: "SP強炭酸水", price: 79 },
    { name: "ダナブルースライス", price: 479 },
    { name: "チーズゴルゴンゾーラ", price: 119 }
  ];
  (function restoreReceiptItemNames() {
    var saved = getSavedState();
    if (!saved || !saved.receiptItemNames || saved.receiptItemNames.length !== RECEIPT_ITEMS.length) return;
    RECEIPT_ITEMS.forEach(function (item, index) {
      item.name = saved.receiptItemNames[index];
    });
  })();

  // 品目名を修正すると、在庫(冷蔵庫/常備品)側の商品名表示にも同じ内容を反映する。
  function wireReceiptEditButtons() {
    document.querySelectorAll("[data-edit]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var nameEl = btn.previousElementSibling;
        var editing = nameEl.getAttribute("contenteditable") === "true";
        if (editing) {
          nameEl.setAttribute("contenteditable", "false");
          var oldName = nameEl.dataset.originalName;
          var newName = nameEl.textContent.trim();
          if (newName && newName !== oldName) {
            var receiptItem = RECEIPT_ITEMS.filter(function (r) { return r.name === oldName; })[0];
            if (receiptItem) receiptItem.name = newName;
            var sourceItem = ITEM_SOURCE.filter(function (i) { return i.productName === oldName; })[0];
            if (sourceItem) {
              sourceItem.productName = newName;
              renderInventoryItems();
            }
            saveState();
            showToast(sourceItem ? "品目名を更新し、在庫にも反映しました" : "品目名を更新しました");
          } else {
            showToast("品目名を更新しました");
          }
        } else {
          nameEl.dataset.originalName = nameEl.textContent.trim();
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
  }

  function renderReceiptLines() {
    var list = document.getElementById("receiptLines");
    if (!list) return;
    list.innerHTML = RECEIPT_ITEMS.map(function (item) {
      return (
        '<div class="rline">' +
        '<span class="name' + (item.lowConfidence ? " low-confidence" : "") + '" contenteditable="false">' + item.name + "</span>" +
        '<button class="pencil-btn" data-edit>' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>' +
        "</button>" +
        '<span class="price">¥' + item.price.toLocaleString() + "</span>" +
        "</div>"
      );
    }).join("");
    wireReceiptEditButtons();
  }
  renderReceiptLines();

  // --- segmented sub-navigation, scoped per view (在庫: 冷蔵庫/常備品, お店: お店履歴/価格の傾向) ---
  function switchInventorySubview(viewId, name) {
    var scope = document.getElementById(viewId);
    if (!scope) return;
    scope.querySelectorAll(".seg-btn").forEach(function (b) {
      b.classList.toggle("active", b.dataset.subview === name);
    });
    scope.querySelectorAll(".subview").forEach(function (v) {
      v.classList.toggle("active", v.id === "subview-" + name);
    });
  }
  document.querySelectorAll(".seg-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      switchInventorySubview(btn.closest(".view").id, btn.dataset.subview);
    });
  });

  // --- store data: single source of truth for history, totals and category prices ---
  var STORE_META = {
    A: {
      name: "ツルヤ 徳間店",
      visits: 5,
      total: 24458,
      history: [
        { date: "2026/08/23", total: 7528 },
        { date: "2026/06/25", total: 3480 },
        { date: "2026/06/18", total: 4120 },
        { date: "2026/06/09", total: 3960 },
        { date: "2026/06/02", total: 5370 }
      ],
      prices: { meat_fish: 480, veg_fruit: 158, dairy_egg: 210, staple_other: 320 },
      tracked: true
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
      prices: { meat_fish: 540, veg_fruit: 118, dairy_egg: 206, staple_other: 335 },
      tracked: true
    },
    C: {
      name: "Cスーパー",
      visits: 0,
      total: 0,
      history: [],
      prices: { meat_fish: 510, veg_fruit: 145, dairy_egg: 215, staple_other: 300 },
      tracked: false,
      optional: true
    }
  };
  (function restoreStoreMeta() {
    var saved = getSavedState();
    if (saved && saved.storeMeta) {
      STORE_META = saved.storeMeta;
    }
  })();

  var CATEGORIES = [
    { key: "meat_fish", label: "肉・魚" },
    { key: "veg_fruit", label: "野菜・果物" },
    { key: "dairy_egg", label: "乳製品・卵" },
    { key: "staple_other", label: "米・パン・麺・調味料など" }
  ];

  // dates are "YYYY/MM/DD" -> month key "YYYY/MM"
  function getMonthKey(dateStr) {
    return dateStr.slice(0, 7);
  }
  function getMonthLabel(monthKey) {
    var parts = monthKey.split("/");
    return parts[0] + "年" + parseInt(parts[1], 10) + "月";
  }

  function groupByMonth(history) {
    var map = {};
    history.forEach(function (h) {
      var key = getMonthKey(h.date);
      if (!map[key]) map[key] = { monthKey: key, count: 0, total: 0, entries: [] };
      map[key].count += 1;
      map[key].total += h.total;
      map[key].entries.push(h);
    });
    return Object.keys(map).sort().reverse().map(function (k) {
      map[k].entries.sort(function (a, b) {
        return a.date < b.date ? 1 : -1;
      });
      return map[k];
    });
  }

  // Demo data is anchored to fixed dates, so "this month" is derived from the
  // most recent receipt on record rather than the real current date — a real
  // build would just use the actual current month.
  var allMonthKeys = Object.keys(STORE_META).reduce(function (acc, key) {
    STORE_META[key].history.forEach(function (h) {
      acc.push(getMonthKey(h.date));
    });
    return acc;
  }, []);
  var uniqueMonthKeys = allMonthKeys.filter(function (k, i) {
    return allMonthKeys.indexOf(k) === i;
  }).sort().reverse();
  var CURRENT_MONTH_KEY = uniqueMonthKeys[0];
  var PREVIOUS_MONTH_KEY = uniqueMonthKeys[1];

  function monthlyTotalAcrossStores(monthKey) {
    return Object.keys(STORE_META).reduce(function (sum, key) {
      var group = groupByMonth(STORE_META[key].history).filter(function (g) {
        return g.monthKey === monthKey;
      })[0];
      return sum + (group ? group.total : 0);
    }, 0);
  }

  function addNewStore(name) {
    var newKey = String.fromCharCode(65 + Object.keys(STORE_META).length);
    STORE_META[newKey] = {
      name: name,
      visits: 0,
      total: 0,
      history: [],
      prices: { meat_fish: 500, veg_fruit: 150, dairy_egg: 210, staple_other: 310 },
      tracked: false,
      optional: true
    };
    return newKey;
  }

  function renderMonthSummary() {
    var note = document.getElementById("monthSummaryNote");
    if (!note) return;
    var html = "今月(" + getMonthLabel(CURRENT_MONTH_KEY) + "): <b>¥" + monthlyTotalAcrossStores(CURRENT_MONTH_KEY).toLocaleString() + "</b>";
    if (PREVIOUS_MONTH_KEY) {
      html += "<span>先月(" + getMonthLabel(PREVIOUS_MONTH_KEY) + "): <b>¥" + monthlyTotalAcrossStores(PREVIOUS_MONTH_KEY).toLocaleString() + "</b></span>";
    }
    note.innerHTML = html;
  }
  renderMonthSummary();

  var MONTH_CHEVRON_SVG =
    '<svg class="month-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

  function renderStores() {
    var list = document.getElementById("storeList");
    if (!list) return;
    list.innerHTML = Object.keys(STORE_META).map(function (key) {
      var store = STORE_META[key];
      var monthGroups = groupByMonth(store.history);

      var monthHtml = monthGroups.length
        ? monthGroups.map(function (g) {
            var isCurrent = g.monthKey === CURRENT_MONTH_KEY;
            var dailyRows = g.entries.map(function (h) {
              return '<div class="store-daily-row"><span>' + h.date + "</span><span>¥" + h.total.toLocaleString() + "</span></div>";
            }).join("");
            return (
              '<div class="month-group">' +
              '<button class="store-month-row' + (isCurrent ? " is-current" : "") + '" data-month-toggle>' +
              '<span class="month-label">' + getMonthLabel(g.monthKey) + (isCurrent ? '<span class="current-tag">今月</span>' : "") + "</span>" +
              '<span class="month-count">' + g.count + "回</span>" +
              '<span class="month-total">¥' + g.total.toLocaleString() + "</span>" +
              MONTH_CHEVRON_SVG +
              "</button>" +
              '<div class="store-daily" hidden>' + dailyRows + "</div>" +
              "</div>"
            );
          }).join("")
        : '<div class="store-daily-empty">まだ購入記録がありません。</div>';

      var trackRow = store.optional
        ? '<div class="store-track-row">' +
          '<span class="lbl">価格の傾向に含める</span>' +
          '<button class="status-btn ' + (store.tracked ? "st-tracked" : "st-untracked") + '" data-track-toggle data-store="' + key + '">' +
          (store.tracked ? "含めています" : "含めていません") +
          "</button>" +
          "</div>"
        : "";

      return (
        '<div class="card store-card" data-store="' + key + '">' +
        '<div class="store-summary" data-store-toggle>' +
        '<div class="store-avatar store-' + key + '">' + key + "</div>" +
        '<div class="store-info">' +
        '<div class="store-name-row">' +
        '<span class="store-name" contenteditable="false">' + store.name + "</span>" +
        '<button class="pencil-btn" data-rename-store="' + key + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>' +
        "</button>" +
        "</div>" +
        '<div class="store-stats">利用' + store.visits + "回 ・ 合計¥" + store.total.toLocaleString() + "</div>" +
        "</div>" +
        '<svg class="store-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>' +
        "</div>" +
        trackRow +
        '<div class="store-history" hidden>' + monthHtml + "</div>" +
        "</div>"
      );
    }).join("");

    document.querySelectorAll("[data-rename-store]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var key = btn.dataset.renameStore;
        var nameEl = btn.previousElementSibling;
        var editing = nameEl.getAttribute("contenteditable") === "true";
        if (editing) {
          nameEl.setAttribute("contenteditable", "false");
          var newName = nameEl.textContent.trim();
          if (newName) {
            STORE_META[key].name = newName;
          }
          renderStores();
          renderPriceTrend();
          renderStoreOptions();
          saveState();
          showToast("お店の名前を更新しました");
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

    document.querySelectorAll(".store-name").forEach(function (nameEl) {
      nameEl.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    });

    document.querySelectorAll("[data-store-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".store-card");
        var history = card.querySelector(".store-history");
        var open = card.classList.toggle("is-open");
        history.hidden = !open;
      });
    });

    document.querySelectorAll("[data-month-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var group = btn.closest(".month-group");
        var daily = group.querySelector(".store-daily");
        var open = group.classList.toggle("is-open");
        daily.hidden = !open;
      });
    });

    document.querySelectorAll("[data-track-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.dataset.store;
        STORE_META[key].tracked = !STORE_META[key].tracked;
        renderStores();
        renderPriceTrend();
        saveState();
      });
    });
  }
  renderStores();

  // --- add a new store from the お店 tab ---
  var addStoreBtn = document.getElementById("addStoreBtn");
  var addStoreForm = document.getElementById("addStoreForm");
  var newStoreNameInput = document.getElementById("newStoreNameInput");

  addStoreBtn.addEventListener("click", function () {
    addStoreBtn.hidden = true;
    addStoreForm.hidden = false;
    newStoreNameInput.value = "";
    newStoreNameInput.focus();
  });
  document.getElementById("cancelAddStoreBtn").addEventListener("click", function () {
    addStoreForm.hidden = true;
    addStoreBtn.hidden = false;
  });
  document.getElementById("confirmAddStoreBtn").addEventListener("click", function () {
    var name = newStoreNameInput.value.trim();
    if (!name) return;
    addNewStore(name);
    renderStores();
    renderPriceTrend();
    renderStoreOptions();
    saveState();
    addStoreForm.hidden = true;
    addStoreBtn.hidden = false;
    showToast("お店を追加しました");
  });

  // --- store picker on the receipt scan result screen ---
  var storeSelect = document.getElementById("storeSelect");
  var currentReceiptStoreKey = "A";
  (function restoreReceiptStoreKey() {
    var saved = getSavedState();
    if (saved && saved.currentReceiptStoreKey && STORE_META[saved.currentReceiptStoreKey]) {
      currentReceiptStoreKey = saved.currentReceiptStoreKey;
    }
  })();

  function renderStoreOptions() {
    if (!storeSelect) return;
    storeSelect.innerHTML =
      Object.keys(STORE_META).map(function (key) {
        return '<option value="' + key + '">' + STORE_META[key].name + "</option>";
      }).join("") + '<option value="__add__">＋ 新しいお店を追加</option>';
    storeSelect.value = STORE_META[currentReceiptStoreKey] ? currentReceiptStoreKey : Object.keys(STORE_META)[0];
  }
  renderStoreOptions();

  function reassignReceiptStore(newKey, oldKey) {
    if (newKey === oldKey) return;
    var idx = STORE_META[oldKey].history.findIndex(function (h) {
      return h.date === "2026/08/23";
    });
    var entry;
    if (idx !== -1) {
      entry = STORE_META[oldKey].history.splice(idx, 1)[0];
      STORE_META[oldKey].visits -= 1;
      STORE_META[oldKey].total -= entry.total;
    } else {
      entry = { date: "2026/08/23", total: 7528 };
    }
    STORE_META[newKey].history.push(entry);
    STORE_META[newKey].visits += 1;
    STORE_META[newKey].total += entry.total;
    renderStores();
    renderPriceTrend();
    renderMonthSummary();
    updateHomeSpend();
    saveState();
  }

  storeSelect.addEventListener("change", function () {
    if (storeSelect.value === "__add__") {
      var name = window.prompt("新しいお店の名前を入力してください");
      if (name && name.trim()) {
        var key = addNewStore(name.trim());
        renderStores();
        renderPriceTrend();
        renderStoreOptions();
        reassignReceiptStore(key, currentReceiptStoreKey);
        currentReceiptStoreKey = key;
        storeSelect.value = key;
        saveState();
        showToast("お店を追加しました");
      } else {
        storeSelect.value = currentReceiptStoreKey;
      }
    } else {
      reassignReceiptStore(storeSelect.value, currentReceiptStoreKey);
      currentReceiptStoreKey = storeSelect.value;
      saveState();
    }
  });

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

  function trackedStoreKeys() {
    return Object.keys(STORE_META).filter(function (key) {
      return STORE_META[key].tracked;
    });
  }

  function renderPriceTrend() {
    var list = document.getElementById("compareList");
    if (!list) return;
    var keys = trackedStoreKeys();
    list.innerHTML = CATEGORIES.map(function (cat) {
      var prices = keys.map(function (key) {
        return { key: key, price: STORE_META[key].prices[cat.key] };
      });
      var summary;
      var cheapKeys = [];
      if (prices.length < 2) {
        summary = cat.label + "は比較できるお店が1つのため、傾向はまだ分かりません。";
      } else {
        var minPrice = Math.min.apply(null, prices.map(function (p) { return p.price; }));
        var maxPrice = Math.max.apply(null, prices.map(function (p) { return p.price; }));
        cheapKeys = prices.filter(function (p) { return p.price === minPrice; }).map(function (p) { return p.key; });
        if (minPrice === maxPrice) {
          summary = cat.label + "はどのお店もほぼ同じ価格です。";
        } else {
          var names = cheapKeys.map(function (k) { return STORE_META[k].name; }).join("・");
          summary = cat.label + "は" + names + "が平均¥" + (maxPrice - minPrice) + "安い傾向です。";
        }
      }
      var chips = prices.map(function (p) {
        return priceChip(p.key, p.price, cheapKeys.indexOf(p.key) !== -1 && cheapKeys.length < prices.length);
      }).join("");
      return (
        '<div class="compare-row">' +
        '<div class="compare-label">' + cat.label + "</div>" +
        '<p class="compare-summary">' + summary + "</p>" +
        '<div class="compare-chips">' + chips + "</div>" +
        "</div>"
      );
    }).join("");
  }
  renderPriceTrend();

  function updateHomeSpend() {
    var total = monthlyTotalAcrossStores(CURRENT_MONTH_KEY);
    document.getElementById("homeSpendTotal").textContent = "¥" + total.toLocaleString();

    var trendEl = document.getElementById("homeSpendTrend");
    if (!PREVIOUS_MONTH_KEY) {
      trendEl.hidden = true;
      return;
    }
    var previousTotal = monthlyTotalAcrossStores(PREVIOUS_MONTH_KEY);
    trendEl.classList.remove("trend-down", "trend-up", "trend-flat");
    if (total < previousTotal) {
      trendEl.textContent = "↓ 先月より抑えめのペース";
      trendEl.classList.add("trend-down");
    } else if (total > previousTotal) {
      trendEl.textContent = "↑ 先月より多めのペース";
      trendEl.classList.add("trend-up");
    } else {
      trendEl.textContent = "先月と同じくらいのペース";
      trendEl.classList.add("trend-flat");
    }
  }
  updateHomeSpend();

  document.getElementById("homeFridgeStat").addEventListener("click", function () {
    showView("inventory");
    switchInventorySubview("view-inventory", "fridge");
  });
  document.getElementById("homeSpendStat").addEventListener("click", function () {
    showView("stores");
    switchInventorySubview("view-stores", "trend");
  });

  // --- automatic 冷蔵庫/常備品 classification, by item name ---
  var PANTRY_KEYWORDS = [
    "醤油", "しょうゆ", "味噌", "みそ", "塩", "砂糖", "糖", "油", "みりん", "酢", "酒",
    "米", "小麦粉", "だし", "コンソメ", "カレー粉", "胡椒", "こしょう", "マヨネーズ", "ケチャップ", "ソース",
    "はちみつ", "そうめん", "三五八", "漬"
  ];

  function classifyItem(name) {
    var isPantry = PANTRY_KEYWORDS.some(function (kw) {
      return name.indexOf(kw) !== -1;
    });
    return isPantry ? "pantry" : "fresh";
  }

  var ICON_SVGS = {
    salmon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>',
    spinach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-8-4-8-11a8 8 0 0116 0c0 7-8 11-8 11z"/><path d="M12 21V10"/></svg>',
    meat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 3.5a4.95 4.95 0 010 7l-7 7a3.5 3.5 0 01-5-5l7-7a4.95 4.95 0 015-2z"/><path d="M6 19l-2 2"/></svg>',
    quinoa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10a8 8 0 0016 0"/><path d="M4 10c0-1 3.5-2 8-2s8 1 8 2"/><path d="M4 10l1.5 8.5A2 2 0 007.5 20h9a2 2 0 002-1.5L20 10"/></svg>',
    other: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6M10 2v5l-4 6.5A3 3 0 008.5 18h7a3 3 0 002.5-4.5L14 7V2"/></svg>',
    "pantry-soy": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6M10 2v4l-3 4a4 4 0 00-1 2.6V19a3 3 0 003 3h4a3 3 0 003-3v-6.4a4 4 0 00-1-2.6l-3-4V2"/></svg>',
    "pantry-oil": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2h6M10 2v4l-3 4a4 4 0 00-1 2.6V19a3 3 0 003 3h4a3 3 0 003-3v-6.4a4 4 0 00-1-2.6l-3-4V2"/></svg>'
  };

  // Each item only carries its own facts (name, quantity, icon, how long ago it was
  // bought or its current stock level) — classifyItem() decides which section it renders in.
  // Populated from the same real receipt (ツルヤ徳間店, 2026/08/23) shown on the receipt screen,
  // so what's "in the fridge" actually matches what was bought.
  // "name" = 内容(何であるか、大きく表示) / "productName" = レシート上の商品名(小さく補足表示)。
  // productName はレシート解析結果画面の品目名と一致させ、修正時に紐付けられるようにしている。
  var ITEM_SOURCE = [
    { name: "レタス", productName: "レタス", purchasedDaysAgo: 1, icon: "spinach" },
    { name: "ピーマン", productName: "ピーマン", purchasedDaysAgo: 1, icon: "spinach" },
    { name: "みょうが", productName: "みょうが", purchasedDaysAgo: 1, icon: "spinach" },
    { name: "人参", productName: "人参", purchasedDaysAgo: 1, icon: "spinach" },
    { name: "干し柿", productName: "市田柿", purchasedDaysAgo: 1, icon: "quinoa" },
    { name: "ウインナー", productName: "G皮なしウインナー", purchasedDaysAgo: 1, icon: "meat" },
    { name: "たこ", productName: "蒸しだこ", purchasedDaysAgo: 1, icon: "salmon" },
    { name: "わかめ", productName: "綾里浜刺身わかめ", purchasedDaysAgo: 1, icon: "salmon" },
    { name: "きざみあげ", productName: "きざみあげジャンボ", purchasedDaysAgo: 1, icon: "other" },
    { name: "納豆", productName: "金のつぶたっぷりおだ", purchasedDaysAgo: 1, icon: "other" },
    { name: "紅生姜", productName: "国産紅生姜(2個)", purchasedDaysAgo: 1, icon: "spinach" },
    { name: "シュークリーム", productName: "純生シュークリーム", purchasedDaysAgo: 1, icon: "quinoa" },
    { name: "トマト", productName: "森林そだち中玉", purchasedDaysAgo: 1, icon: "spinach" },
    { name: "炭酸水", productName: "SP強炭酸水", purchasedDaysAgo: 1, icon: "other" },
    { name: "チーズ", productName: "ダナブルースライス", purchasedDaysAgo: 1, icon: "other" },
    { name: "チーズ", productName: "チーズゴルゴンゾーラ", purchasedDaysAgo: 1, icon: "other" },
    { name: "しょうゆ", productName: "特選丸大豆しょうゆ", icon: "pantry-soy", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "みりん", productName: "ツルヤ純米本みりん", icon: "pantry-oil", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "料理酒", productName: "料理酒国産米使用", icon: "pantry-soy", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "砂糖", productName: "シジシー上白糖", icon: "pantry-oil", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "漬け床", productName: "お新香三五八", icon: "pantry-soy", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "漬けの素", productName: "さっぱり漬の素", icon: "pantry-oil", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "油みそだれ", productName: "なすの油みそのたれ", icon: "pantry-soy", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "塩こんぶ", productName: "ヤマナカ塩こんぶ", icon: "pantry-oil", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "そうめん", productName: "手延そうめん", icon: "pantry-soy", initialStatus: "ok", purchasedDate: "8/23" },
    { name: "はちみつ", productName: "アカシアはちみつ", icon: "pantry-oil", initialStatus: "ok", purchasedDate: "8/23" }
  ];
  (function restoreItemState() {
    var saved = getSavedState();
    if (!saved || !saved.itemStatus) return;
    ITEM_SOURCE.forEach(function (item, index) {
      var s = saved.itemStatus[index];
      if (!s) return;
      item.status = s.status;
      item.consumedAt = s.consumedAt;
      item.currentPantryStatus = s.pantryStatus;
      if (s.productName) item.productName = s.productName;
    });
  })();

  var THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
  function isFadedOut(item) {
    var isPantry = classifyItem(item.name) === "pantry";
    var status = isPantry ? (item.currentPantryStatus || item.initialStatus) : item.status;
    if (status !== "used" || !item.consumedAt) return false;
    return Date.now() - new Date(item.consumedAt).getTime() > THREE_DAYS_MS;
  }

  function freshItemHtml(item) {
    var isUsed = item.status === "used";
    var purchasedLabel = item.purchasedDaysAgo === 0 ? "本日購入" : item.purchasedDaysAgo + "日前に購入";
    return (
      '<div class="card fridge-item' + (isUsed ? " is-used" : "") + '" data-status="' + (isUsed ? "used" : "remaining") + '" data-item-key="' + item.productName + '"' +
      (item.consumedAt ? ' data-consumed-at="' + item.consumedAt + '"' : "") + '>' +
      '<div class="ic ' + item.icon + '">' + ICON_SVGS[item.icon] + "</div>" +
      '<div class="txt"><div class="name">' + item.name + '</div><div class="sub">' + item.productName + " ・ " + purchasedLabel + "</div></div>" +
      '<button class="status-btn ' + (isUsed ? "st-used" : "st-remaining") + '" data-status-btn>' +
      '<svg class="icon-remaining" ' + (isUsed ? "hidden " : "") + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
      '<svg class="icon-used" ' + (isUsed ? "" : "hidden ") + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a8 8 0 1 1 2.6 5.9M3 11v5h5"/></svg>' +
      '<span class="label">' + (isUsed ? "消費済み" : "残っている") + "</span>" +
      "</button>" +
      "</div>"
    );
  }

  var PANTRY_STATUS_META = {
    ok: { cls: "st-ok", label: "在庫あり" },
    low: { cls: "st-low", label: "そろそろ切れそう" },
    used: { cls: "st-used", label: "消費" }
  };
  var PANTRY_STATUS_ORDER = ["ok", "low", "used"];

  function pantryItemHtml(item) {
    var status = item.currentPantryStatus || item.initialStatus || "ok";
    var meta = PANTRY_STATUS_META[status];
    return (
      '<div class="card fridge-item" data-item-key="' + item.productName + '" data-pantry-status="' + status + '"' +
      (status === "used" ? ' data-status="used" data-consumed-at="' + item.consumedAt + '"' : "") + '>' +
      '<div class="ic ' + item.icon + '">' + ICON_SVGS[item.icon] + "</div>" +
      '<div class="txt"><div class="name">' + item.name + '</div><div class="sub">' + item.productName + " ・ " + item.purchasedDate + "購入</div></div>" +
      '<button class="status-btn ' + meta.cls + '" data-pantry-cycle>' +
      '<svg class="icon-ok" ' + (status === "ok" ? "" : "hidden ") + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>' +
      '<svg class="icon-low" ' + (status === "low" ? "" : "hidden ") + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2.5 17a1.8 1.8 0 001.6 2.7h15.8a1.8 1.8 0 001.6-2.7L13.7 3.9a1.8 1.8 0 00-3.4 0z"/></svg>' +
      '<svg class="icon-used" ' + (status === "used" ? "" : "hidden ") + 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a8 8 0 1 1 2.6 5.9M3 11v5h5"/></svg>' +
      '<span class="label">' + meta.label + "</span>" +
      "</button>" +
      "</div>"
    );
  }

  // --- fridge item status (残っている / 消費済み) ---
  var fridgeRemaining = document.getElementById("fridgeRemaining");
  var fridgeUsed = document.getElementById("fridgeUsed");
  var fridgeCount = document.getElementById("fridgeCount");
  var usedEmptyMsg = document.getElementById("usedEmptyMsg");
  var pantryListEl = document.getElementById("pantryList");

  function updateFridgeCount() {
    var names = Array.prototype.map.call(fridgeRemaining.children, function (item) {
      return item.querySelector(".txt .name").textContent.trim();
    });
    fridgeCount.textContent = names.length + "品";
    document.getElementById("homeFridgeCount").textContent = names.length;

    var previewEl = document.getElementById("homeFridgePreview");
    if (names.length === 0) {
      previewEl.textContent = "在庫はありません";
    } else if (names.length <= 2) {
      previewEl.textContent = names.join("、");
    } else {
      previewEl.textContent = names.slice(0, 2).join("、") + " ほか" + (names.length - 2) + "品";
    }
  }

  function updateUsedEmptyState() {
    usedEmptyMsg.hidden = fridgeUsed.children.length > 0;
  }

  function findSourceItem(productName) {
    return ITEM_SOURCE.filter(function (i) {
      return i.productName === productName;
    })[0];
  }

  // 状態を切り替えるたびに一覧を作り直す(=renderInventoryItemsを呼ぶ)ことで、
  // 「野菜→海鮮→肉類→その他」の並び順が消費済みへの移動時にも崩れないようにしている。
  function wireStatusButtons() {
    document.querySelectorAll("[data-status-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".fridge-item");
        var nowUsed = item.dataset.status !== "used";
        var sourceItem = findSourceItem(item.dataset.itemKey);
        if (sourceItem) {
          sourceItem.status = nowUsed ? "used" : "remaining";
          sourceItem.consumedAt = nowUsed ? new Date().toISOString() : null;
        }

        renderInventoryItems();
        renderNutritionDiagnosis();
        refreshRecipes();
        saveState();
      });
    });
  }

  // 常備品も冷蔵庫と同じく「消費」を記録できるよう、在庫あり→そろそろ切れそう→消費 の3状態を順に切り替える。
  // 「消費」になった常備品は栄養診断の対象にもなり(data-status/data-consumed-atを付与)、
  // 消費してから3日経つと在庫表示から自動的に消える(isFadedOut/renderInventoryItems側で判定)。
  function wirePantryButtons() {
    document.querySelectorAll("[data-pantry-cycle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".fridge-item");
        var current = item.dataset.pantryStatus || "ok";
        var next = PANTRY_STATUS_ORDER[(PANTRY_STATUS_ORDER.indexOf(current) + 1) % PANTRY_STATUS_ORDER.length];
        var meta = PANTRY_STATUS_META[next];

        var sourceItem = findSourceItem(item.dataset.itemKey);
        var consumedAt = next === "used" ? new Date().toISOString() : null;
        if (sourceItem) {
          sourceItem.currentPantryStatus = next;
          sourceItem.consumedAt = consumedAt;
        }

        item.dataset.pantryStatus = next;
        if (next === "used") {
          item.dataset.status = "used";
          item.dataset.consumedAt = consumedAt;
        } else {
          delete item.dataset.status;
          delete item.dataset.consumedAt;
        }
        item.className = "card fridge-item";
        btn.className = "status-btn " + meta.cls;
        btn.querySelector(".icon-ok").hidden = next !== "ok";
        btn.querySelector(".icon-low").hidden = next !== "low";
        btn.querySelector(".icon-used").hidden = next !== "used";
        btn.querySelector(".label").textContent = meta.label;

        renderNutritionDiagnosis();
        refreshRecipes();
        saveState();
      });
    });
  }

  // 献立を考えやすいよう、冷蔵庫の並び順を「野菜→海鮮→肉類→その他」でまとめる。
  var CATEGORY_ORDER = { spinach: 0, salmon: 1, meat: 2, quinoa: 3, other: 3 };
  function sortByCategory(items) {
    return items.slice().sort(function (a, b) {
      return (CATEGORY_ORDER[a.icon] != null ? CATEGORY_ORDER[a.icon] : 9) -
        (CATEGORY_ORDER[b.icon] != null ? CATEGORY_ORDER[b.icon] : 9);
    });
  }

  function renderInventoryItems() {
    var freshRemaining = [];
    var freshUsed = [];
    var pantryHtml = "";
    ITEM_SOURCE.forEach(function (item) {
      if (isFadedOut(item)) return; // 消費済みから3日経過した商品は在庫表示から消す
      if (classifyItem(item.name) === "pantry") {
        pantryHtml += pantryItemHtml(item);
      } else if (item.status === "used") {
        freshUsed.push(item);
      } else {
        freshRemaining.push(item);
      }
    });
    fridgeRemaining.innerHTML = sortByCategory(freshRemaining).map(freshItemHtml).join("");
    fridgeUsed.innerHTML = sortByCategory(freshUsed).map(freshItemHtml).join("");
    pantryListEl.innerHTML = pantryHtml;
    wireStatusButtons();
    wirePantryButtons();
    updateFridgeCount();
    updateUsedEmptyState();
  }
  renderInventoryItems();

  // --- nutrition diagnosis: computed from items marked 消費済み in the last 7 days ---
  var NUTRIENT_AXES = [
    { key: "protein", label: "タンパク質", angle: -90 },
    { key: "fat", label: "脂質", angle: -18 },
    { key: "carb", label: "炭水化物", angle: 54 },
    { key: "vitamin", label: "ビタミン", angle: 126 },
    { key: "mineral", label: "ミネラル", angle: 198 }
  ];
  var RADAR_CENTER = { x: 160, y: 150 };
  var RADAR_MAX_R = 108;
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // Which of the 5 major nutrient groups each fridge item mainly contributes.
  var NUTRIENT_PROFILE = {
    "レタス": ["vitamin"],
    "ピーマン": ["vitamin"],
    "みょうが": ["vitamin", "mineral"],
    "人参": ["vitamin"],
    "干し柿": ["carb", "vitamin"],
    "ウインナー": ["protein", "fat"],
    "たこ": ["protein"],
    "わかめ": ["mineral"],
    "きざみあげ": ["protein", "fat"],
    "納豆": ["protein", "mineral"],
    "紅生姜": ["vitamin"],
    "シュークリーム": ["carb", "fat"],
    "トマト": ["vitamin", "mineral"],
    "炭酸水": [],
    "チーズ": ["protein", "fat", "mineral"],
    "しょうゆ": ["mineral"],
    "みりん": ["carb"],
    "料理酒": [],
    "砂糖": ["carb"],
    "漬け床": ["mineral"],
    "漬けの素": ["mineral"],
    "油みそだれ": ["fat", "mineral"],
    "塩こんぶ": ["mineral"],
    "そうめん": ["carb"],
    "はちみつ": ["carb"]
  };
  var NUTRIENT_SUGGESTIONS = {
    protein: "肉・魚・卵などを1品足すと改善します。",
    fat: "魚や良質な油を使ったメニューを取り入れると改善します。",
    carb: "ご飯やパンなどの主食をしっかり摂ると改善します。",
    vitamin: "緑黄色野菜や果物を1品足すと改善します。",
    mineral: "海藻・乳製品・小魚などを取り入れると改善します。"
  };

  function getConsumedThisWeek() {
    return Array.prototype.filter.call(document.querySelectorAll(".fridge-item"), function (item) {
      if (item.dataset.status !== "used" || !item.dataset.consumedAt) return false;
      return Date.now() - new Date(item.dataset.consumedAt).getTime() <= WEEK_MS;
    }).map(function (item) {
      return item.querySelector(".txt .name").textContent.trim();
    });
  }

  // 今週いちばん不足している栄養素。レシピの「おすすめ」バッジ判定にも使う。
  // 診断データが無い/どの栄養素も基準を満たしている場合はnull(=バッジ対象なし)。
  var weakestNutrientKey = null;

  function renderNutritionDiagnosis() {
    var emptyEl = document.getElementById("radarEmpty");
    var wrapEl = document.getElementById("radarWrap");
    var disclaimerEl = document.getElementById("radarDisclaimer");
    var warningEl = document.getElementById("warningBox");
    if (!emptyEl) return;

    var consumedNames = getConsumedThisWeek();
    var total = consumedNames.length;

    if (total === 0) {
      emptyEl.hidden = false;
      wrapEl.hidden = true;
      disclaimerEl.hidden = true;
      warningEl.hidden = true;
      weakestNutrientKey = null;
      return;
    }
    emptyEl.hidden = true;
    wrapEl.hidden = false;
    disclaimerEl.hidden = false;

    var counts = {};
    NUTRIENT_AXES.forEach(function (ax) {
      counts[ax.key] = 0;
    });
    consumedNames.forEach(function (name) {
      (NUTRIENT_PROFILE[name] || []).forEach(function (nutrient) {
        if (counts.hasOwnProperty(nutrient)) counts[nutrient] += 1;
      });
    });

    var values = {};
    NUTRIENT_AXES.forEach(function (ax) {
      values[ax.key] = Math.min(1, counts[ax.key] / total);
    });

    var points = NUTRIENT_AXES.map(function (ax) {
      var rad = (ax.angle * Math.PI) / 180;
      var r = RADAR_MAX_R * values[ax.key];
      var x = RADAR_CENTER.x + r * Math.cos(rad);
      var y = RADAR_CENTER.y + r * Math.sin(rad);
      var dot = document.getElementById("radarDot-" + ax.key);
      dot.setAttribute("cx", x.toFixed(1));
      dot.setAttribute("cy", y.toFixed(1));
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    document.getElementById("radarPolygon").setAttribute("points", points);

    var minKey = NUTRIENT_AXES.reduce(function (min, ax) {
      return values[ax.key] < values[min] ? ax.key : min;
    }, NUTRIENT_AXES[0].key);
    var minAxis = NUTRIENT_AXES.filter(function (ax) { return ax.key === minKey; })[0];
    var minPercent = Math.round(values[minKey] * 100);

    if (values[minKey] >= 0.8) {
      warningEl.hidden = true;
      weakestNutrientKey = null;
    } else {
      warningEl.hidden = false;
      weakestNutrientKey = minKey;
      document.getElementById("warningTitle").textContent = "今週は" + minAxis.label + "が不足しています";
      document.getElementById("warningBody").textContent =
        minAxis.label + "を含む食品の消費が基準の約" + minPercent + "%。" + NUTRIENT_SUGGESTIONS[minKey];
    }
  }
  renderNutritionDiagnosis();

  // --- nutrition screen: recipe suggestions built only from what's in the fridge ---
  // Ingredients/dishes below are built from the same real receipt (ツルヤ徳間店, 2026/08/23).
  var HERO_RECIPE = { ingredients: ["たこ", "人参", "レタス"], dishType: "マリネ" };

  var RECIPE_CATEGORIES = {
    main: {
      label: "メイン料理",
      items: [
        { name: "ウインナーとピーマンの炒め物", ingredients: ["ウインナー", "ピーマン"], dishType: "炒め物" },
        { name: "蒸しだことわかめの酢の物", ingredients: ["たこ", "わかめ"], dishType: "酢の物" },
        { name: "きざみあげとピーマンの卵とじ", ingredients: ["きざみあげ", "ピーマン"], dishType: "卵とじ" },
        { name: "人参と紅生姜のきんぴら", ingredients: ["人参", "紅生姜"], dishType: "きんぴら" }
      ]
    },
    side: {
      label: "副菜",
      items: [
        { name: "みょうがとレタスのさっぱりサラダ", ingredients: ["みょうが", "レタス"], dishType: "サラダ" },
        { name: "人参としょうがの浅漬け", ingredients: ["人参", "紅生姜"], dishType: "浅漬け" },
        { name: "わかめと塩こんぶの和え物", ingredients: ["わかめ", "塩こんぶ"], dishType: "和え物" }
      ]
    },
    soup: {
      label: "汁物",
      items: [
        { name: "中玉トマトとチーズのスープ", ingredients: ["トマト", "チーズ"], dishType: "スープ" },
        { name: "そうめんと蒸しだこのすまし汁", ingredients: ["そうめん", "たこ"], dishType: "すまし汁" },
        { name: "レタスと納豆のみそ汁", ingredients: ["レタス", "納豆"], dishType: "みそ汁" }
      ]
    }
  };

  // 表示条件: 食材が1つ以上、今の冷蔵庫(生鮮食品)にあれば表示する(全部揃っている必要はない)。
  // 「冷蔵庫にある」は、消費済み/そろそろ切れそうの状態ではなく、
  // 3日経過などで在庫表示自体から消えた(isFadedOut)＝完全に無くなった場合のみ「無い」扱いにする。
  function isFreshIngredientOnHand(name) {
    return ITEM_SOURCE.some(function (item) {
      return item.name === name && classifyItem(item.name) !== "pantry" && !isFadedOut(item);
    });
  }

  function countAvailableIngredients(ingredients) {
    return ingredients.filter(isFreshIngredientOnHand).length;
  }

  function isRecipeFeasible(ingredients) {
    return countAvailableIngredients(ingredients) > 0;
  }

  // バッジ: 今週の栄養診断でいちばん不足している栄養素を補う食材を含むものだけ「おすすめ」にする。
  function fillsWeakestNutrient(ingredients) {
    if (!weakestNutrientKey) return false;
    return ingredients.some(function (name) {
      return (NUTRIENT_PROFILE[name] || []).indexOf(weakestNutrientKey) !== -1;
    });
  }

  // 食材名だけで検索すると、汁物なのに炒め物やサラダが検索結果に出るなど
  // 料理名とリンク先が噛み合わないことがあるため、料理の種類(スープ/サラダ等)も
  // 検索語に含めて、実際の検索結果が料理名の内容と合うようにしている。
  function cookpadSearchUrl(ingredients, dishType) {
    var terms = dishType ? ingredients.concat([dishType]) : ingredients;
    return "https://cookpad.com/search/" + encodeURIComponent(terms.join(" "));
  }

  function renderRecipeCategory(key) {
    var list = document.getElementById("recipeCategoryList");
    var emptyEl = document.getElementById("recipeCategoryEmpty");
    if (!list) return;
    // 冷蔵庫にある食材を1つでも使うものだけ表示し、その中でも今ある食材をより多く使うものを上に出す。
    var items = RECIPE_CATEGORIES[key].items
      .filter(function (item) {
        return isRecipeFeasible(item.ingredients);
      })
      .sort(function (a, b) {
        return countAvailableIngredients(b.ingredients) - countAvailableIngredients(a.ingredients);
      });
    if (emptyEl) emptyEl.hidden = items.length > 0;
    list.innerHTML = items.map(function (item) {
      var isRecommended = fillsWeakestNutrient(item.ingredients);
      return (
        '<a class="recipe-item" href="' + cookpadSearchUrl(item.ingredients, item.dishType) + '" target="_blank" rel="noopener">' +
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

  function renderActiveRecipeCategory() {
    var activeBtn = document.querySelector(".cat-btn.active");
    renderRecipeCategory(activeBtn ? activeBtn.dataset.category : "main");
  }

  function renderHeroRecipe() {
    var block = document.getElementById("heroRecipeBlock");
    var emptyEl = document.getElementById("heroRecipeEmpty");
    var feasible = isRecipeFeasible(HERO_RECIPE.ingredients);
    if (block) block.hidden = !feasible;
    if (emptyEl) emptyEl.hidden = feasible;
    document.getElementById("heroRecipeLink").href = cookpadSearchUrl(HERO_RECIPE.ingredients, HERO_RECIPE.dishType);
  }

  // 在庫の状態(消費済みにする/常備品を消費にする等)が変わるたびに呼び、
  // レシピ提案(おすすめ1件+カテゴリ一覧)を今の在庫にあわせて作り直す。
  function refreshRecipes() {
    renderHeroRecipe();
    renderActiveRecipeCategory();
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
  renderHeroRecipe();

  document.getElementById("scrollHintBtn").addEventListener("click", function () {
    document.getElementById("view-nutrition").scrollBy({ top: 360, behavior: "smooth" });
  });

  // --- initial render ---
  renderHome();
})();
