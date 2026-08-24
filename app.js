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
    addStoreForm.hidden = true;
    addStoreBtn.hidden = false;
    showToast("お店を追加しました");
  });

  // --- store picker on the receipt scan result screen ---
  var storeSelect = document.getElementById("storeSelect");
  var currentReceiptStoreKey = "A";

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
      return h.date === "2026/07/02";
    });
    var entry;
    if (idx !== -1) {
      entry = STORE_META[oldKey].history.splice(idx, 1)[0];
      STORE_META[oldKey].visits -= 1;
      STORE_META[oldKey].total -= entry.total;
    } else {
      entry = { date: "2026/07/02", total: 2010 };
    }
    STORE_META[newKey].history.push(entry);
    STORE_META[newKey].visits += 1;
    STORE_META[newKey].total += entry.total;
    renderStores();
    renderPriceTrend();
    renderMonthSummary();
    updateHomeSpend();
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
        showToast("お店を追加しました");
      } else {
        storeSelect.value = currentReceiptStoreKey;
      }
    } else {
      reassignReceiptStore(storeSelect.value, currentReceiptStoreKey);
      currentReceiptStoreKey = storeSelect.value;
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

  // --- fridge item status (残っている / 消費済み) ---
  var fridgeRemaining = document.getElementById("fridgeRemaining");
  var fridgeUsed = document.getElementById("fridgeUsed");
  var fridgeCount = document.getElementById("fridgeCount");
  var usedEmptyMsg = document.getElementById("usedEmptyMsg");

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
  updateFridgeCount();

  function updateUsedEmptyState() {
    usedEmptyMsg.hidden = fridgeUsed.children.length > 0;
  }

  document.querySelectorAll("[data-status-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var item = btn.closest(".fridge-item");
      var nowUsed = item.dataset.status !== "used";
      item.dataset.status = nowUsed ? "used" : "remaining";
      if (nowUsed) {
        item.dataset.consumedAt = new Date().toISOString();
      } else {
        delete item.dataset.consumedAt;
      }
      item.classList.toggle("is-used", nowUsed);
      btn.classList.toggle("st-used", nowUsed);
      btn.classList.toggle("st-remaining", !nowUsed);
      btn.querySelector(".icon-remaining").hidden = nowUsed;
      btn.querySelector(".icon-used").hidden = !nowUsed;
      btn.querySelector(".label").textContent = nowUsed ? "消費済み" : "残っている";
      (nowUsed ? fridgeUsed : fridgeRemaining).appendChild(item);
      updateFridgeCount();
      updateUsedEmptyState();
      renderNutritionDiagnosis();
    });
  });

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
    "サーモン刺身": ["protein", "fat"],
    "ほうれん草": ["vitamin", "mineral"],
    "キノア 250g": ["carb", "protein"],
    "牛乳・卵・トマト": ["protein", "fat", "vitamin", "mineral"]
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
    } else {
      warningEl.hidden = false;
      document.getElementById("warningTitle").textContent = "今週は" + minAxis.label + "が不足しています";
      document.getElementById("warningBody").textContent =
        minAxis.label + "を含む食品の消費が基準の約" + minPercent + "%。" + NUTRIENT_SUGGESTIONS[minKey];
    }
  }
  renderNutritionDiagnosis();

  // --- pantry staples (在庫あり / そろそろ切れそう) — no purchase-date tracking, unlike fresh food ---
  document.querySelectorAll("[data-pantry-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var nowLow = !btn.classList.contains("st-low");
      btn.classList.toggle("st-low", nowLow);
      btn.classList.toggle("st-ok", !nowLow);
      btn.querySelector(".icon-ok").hidden = nowLow;
      btn.querySelector(".icon-low").hidden = !nowLow;
      btn.querySelector(".label").textContent = nowLow ? "そろそろ切れそう" : "在庫あり";
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
