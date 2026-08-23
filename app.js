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

  // --- nutrition screen ---
  document.getElementById("recipeBtn").addEventListener("click", function () {
    showToast("レシート詳細は開発中です");
  });

  document.getElementById("scrollHintBtn").addEventListener("click", function () {
    document.getElementById("view-nutrition").scrollBy({ top: 360, behavior: "smooth" });
  });

  // --- initial render ---
  renderHome();
})();
