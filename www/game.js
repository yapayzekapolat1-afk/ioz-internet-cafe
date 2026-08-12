/* ==========================================================================
   NET://CAFE — internet cafe simulator
   Vanilla JS, no external dependencies. Designed to be dropped into a
   Capacitor/Cordova "www" folder and packaged as an Android APK.
   ========================================================================== */

(function () {
  "use strict";

  var SAVE_KEY = "netcafe_save_v2";
  var MAX_STATIONS = 10;
  var TABLE_COST = 100;
  var COMPUTER_COST = 100;
  var MAX_LEVEL = 5;
  var START_MONEY = 1000;

  // ---- in-game clock -------------------------------------------------
  // 1 real second = 2 in-game minutes, so a full 08:00 -> 24:00 business
  // day (16h = 960 game-minutes) takes 8 real minutes. Long enough that a
  // day feels like a shift, short enough to stay playable on mobile.
  var GAME_MINUTES_PER_SECOND = 2;
  var DAY_OPEN_MIN = 8 * 60;    // 08:00
  var DAY_CLOSE_MIN = 24 * 60;  // 24:00
  var TICK_MS = 250;

  // Five hardware generations, 1995 CRT to 2025 RGB gaming rig. Each step
  // roughly 1.5x's the fair hourly rate and the daily running cost, and
  // upgradeCost is what it takes to go from THIS level to the next one
  // (null on the last tier — Pro 2025 is the ceiling). Balanced so maxing
  // out all 10 stations from a 1.000 TL start takes about two real weeks
  // of play (~14-15 in-game days), tested by simulation.
  var COMPUTER_LEVELS = {
    1: { name: "İoz Old 90", defaultRate: 30, maxAcceptRate: 55, dailyCost: 25, upgradeCost: 500 },
    2: { name: "İoz Classic 90", defaultRate: 55, maxAcceptRate: 110, dailyCost: 45, upgradeCost: 1200 },
    3: { name: "İoz Classic 2010", defaultRate: 85, maxAcceptRate: 160, dailyCost: 65, upgradeCost: 2500 },
    4: { name: "İoz Classic 2020", defaultRate: 130, maxAcceptRate: 230, dailyCost: 90, upgradeCost: 5000 },
    5: { name: "İoz Pro 2025", defaultRate: 200, maxAcceptRate: 340, dailyCost: 130, upgradeCost: null }
  };

  var DEFAULT_RATE = 30;
  var MIN_RATE = 10;
  var MAX_RATE = 360;

  var DAILY_BASE_COST = 60; // rent/internet line, regardless of PC count

  // ---- customer flow --------------------------------------------------
  // Requests arrive one at a time with a gap between them, so the cafe
  // never dumps 15 people on the player at once.
  var MIN_GAP_GAME_MIN = 3;    // at peak hours
  var MAX_GAP_GAME_MIN = 55;   // at dead hours
  var MAX_PENDING_REQUESTS = 4;
  var PATIENCE_GAME_MIN = 20;  // how long a customer waits for approval

  // Hourly demand curve (index = hour 0..23). Mirrors a real internet
  // cafe: dead in the morning, busy after school, peak at night.
  var DEMAND_BY_HOUR = [
    0.15, 0.10, 0.08, 0.05, 0.05, 0.05, 0.08, 0.15, // 00-07
    0.25, 0.30, 0.35, 0.40, 0.50, 0.55, 0.60, 0.85, // 08-15
    1.00, 1.00, 0.95, 0.90, 0.95, 1.00, 0.80, 0.45  // 16-23
  ];

  var FIRST_NAMES = [
    "Emre", "Burak", "Kerem", "Deniz", "Mert", "Ali", "Yusuf", "Ece",
    "Selin", "Arda", "Baran", "Tuna", "Efe", "Cem", "Zeynep", "Kaan",
    "Onur", "Berk", "Doruk", "Melis"
  ];

  // ---------------------------------------------------------------- state
  var state = null;
  var tickHandle = null;
  var lastTickAt = 0;
  var editingStationIdx = null;

  function freshStations() {
    var stations = [];
    for (var i = 0; i < MAX_STATIONS; i++) {
      stations.push({
        hasTable: false, hasComputer: false, computerLevel: 0,
        rate: DEFAULT_RATE,
        occupied: false, customerName: "", hoursBooked: 0,
        sessionStartMin: 0, sessionEndMin: 0, payout: 0
      });
    }
    stations[0].hasTable = true;
    stations[0].hasComputer = true;
    stations[0].computerLevel = 1;
    stations[0].rate = COMPUTER_LEVELS[1].defaultRate;
    return stations;
  }

  function freshState() {
    return {
      cafeName: "",
      money: START_MONEY,
      stations: freshStations(),
      totalCustomers: 0,
      day: 1,
      clockMin: DAY_OPEN_MIN,
      dayOver: false,
      bankrupt: false,
      requests: [],
      nextRequestAtMin: DAY_OPEN_MIN + 4,
      reqSeq: 1,
      today: { served: 0, revenue: 0, lost: 0 }
    };
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.stations || parsed.stations.length !== MAX_STATIONS) return null;

      // Fill in anything a older/partial save is missing so we never crash
      // on a field that didn't exist in a previous version.
      if (typeof parsed.day !== "number") parsed.day = 1;
      if (typeof parsed.clockMin !== "number") parsed.clockMin = DAY_OPEN_MIN;
      if (typeof parsed.reqSeq !== "number") parsed.reqSeq = 1;
      if (!parsed.today) parsed.today = { served: 0, revenue: 0, lost: 0 };
      if (!Array.isArray(parsed.requests)) parsed.requests = [];
      if (typeof parsed.nextRequestAtMin !== "number") parsed.nextRequestAtMin = parsed.clockMin + 4;

      parsed.stations.forEach(function (s) {
        if (typeof s.computerLevel !== "number") s.computerLevel = s.hasComputer ? 1 : 0;
        if (typeof s.rate !== "number") {
          s.rate = s.hasComputer ? COMPUTER_LEVELS[s.computerLevel].defaultRate : DEFAULT_RATE;
        }
        // FIX: a seated customer used to be wiped on reload, silently
        // destroying money the player had already earned. The session is
        // stored in in-game clock terms, so it can simply resume.
        if (s.occupied) {
          if (typeof s.agreedRate !== "number" || !s.agreedRate) s.agreedRate = s.rate;
          if (typeof s.payout !== "number" || !s.payout) {
            s.payout = Math.round((s.hoursBooked || 1) * s.agreedRate);
          }
        } else {
          s.occupied = false; s.customerName = ""; s.hoursBooked = 0;
          s.sessionStartMin = 0; s.sessionEndMin = 0; s.payout = 0; s.agreedRate = 0;
        }
      });

      // Pending requests are stale on reload; start the day's queue clean.
      parsed.requests = [];
      return parsed;
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- dom refs
  var $ = function (id) { return document.getElementById(id); };
  var screenLoading = $("screen-loading");
  var screenSetup = $("screen-setup");
  var screenGame = $("screen-game");
  var loaderFill = $("loader-fill");
  var loaderPct = $("loader-pct");
  var nameInput = $("cafe-name-input");
  var btnStart = $("btn-start");
  var hudName = $("hud-cafe-name");
  var hudMoney = $("hud-money");
  var hudTime = $("hud-time");
  var hudDay = $("hud-day");
  var statTables = $("stat-tables");
  var statComputers = $("stat-computers");
  var statCustomers = $("stat-customers");
  var statToday = $("stat-today");
  var floor = $("floor");
  var requestsList = $("requests-list");
  var requestsEmpty = $("requests-empty");
  var requestsCount = $("requests-count");
  var btnBuyTable = $("btn-buy-table");
  var btnBuyComputer = $("btn-buy-computer");
  var toastLayer = $("toast-layer");
  var modalInfo = $("modal-info");
  var btnInfo = $("btn-info");
  var btnCloseInfo = $("btn-close-info");
  var modalPrice = $("modal-price");
  var priceModalTitle = $("price-modal-title");
  var priceModalSub = $("price-modal-sub");
  var priceValue = $("price-value");
  var priceSlider = $("price-slider");
  var priceScaleMin = $("price-scale-min");
  var priceScaleMax = $("price-scale-max");
  var priceFeedback = $("price-feedback");
  var btnSavePrice = $("btn-save-price");
  var btnClosePrice = $("btn-close-price");
  var upgradeCard = $("upgrade-card");
  var upgradePhoto = $("upgrade-photo");
  var upgradeLabel = $("upgrade-label");
  var upgradeName = $("upgrade-name");
  var upgradeCost = $("upgrade-cost");
  var btnUpgradeStation = $("btn-upgrade-station");
  var modalDay = $("modal-day");
  var dayModalTitle = $("day-modal-title");
  var dayServed = $("day-served");
  var dayRevenue = $("day-revenue");
  var dayCosts = $("day-costs");
  var dayLost = $("day-lost");
  var dayNet = $("day-net");
  var btnNextDay = $("btn-next-day");
  var modalBankrupt = $("modal-bankrupt");
  var btnBankruptRestart = $("btn-bankrupt-restart");
  var settingsStats = $("settings-stats");

  $("price-table").textContent = TABLE_COST + " ₺";
  $("price-computer").textContent = COMPUTER_COST + " ₺";

  // ---------------------------------------------------------------- helpers
  function fmtMoney(n) { return Math.round(n).toLocaleString("tr-TR"); }

  function fmtClock(totalMin) {
    var m = ((totalMin % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = Math.floor(m % 60);
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function countHasTable() { return state.stations.filter(function (s) { return s.hasTable; }).length; }
  function countHasComputer() { return state.stations.filter(function (s) { return s.hasComputer; }).length; }

  function dailyRunningCost() {
    var total = DAILY_BASE_COST;
    state.stations.forEach(function (s) {
      if (s.hasComputer) total += COMPUTER_LEVELS[s.computerLevel].dailyCost || 0;
    });
    return total;
  }

  // ---------------------------------------------------------------- loading (4s)
  (function runLoader() {
    var duration = 4000;
    var startedAt = Date.now();
    function step() {
      var elapsed = Date.now() - startedAt;
      var pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      loaderFill.style.width = pct + "%";
      loaderPct.textContent = pct + "%";
      if (elapsed < duration) requestAnimationFrame(step);
      else {
        loaderFill.style.width = "100%";
        loaderPct.textContent = "100%";
        setTimeout(afterLoad, 150);
      }
    }
    requestAnimationFrame(step);
  })();

  function afterLoad() {
    var existing = load();
    screenLoading.hidden = true;
    if (existing && existing.cafeName) {
      state = existing;
      startGameScreen();
    } else {
      screenSetup.hidden = false;
      nameInput.focus();
    }
  }

  // ---------------------------------------------------------------- setup
  nameInput.addEventListener("input", function () {
    btnStart.disabled = nameInput.value.trim().length === 0;
  });
  nameInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !btnStart.disabled) btnStart.click();
  });
  btnStart.addEventListener("click", function () {
    var name = nameInput.value.trim();
    if (!name) return;
    state = freshState();
    state.cafeName = name;
    save();
    screenSetup.hidden = true;
    startGameScreen();
  });

  // ---------------------------------------------------------------- game start
  function startGameScreen() {
    screenGame.hidden = false;
    hudName.textContent = state.cafeName;
    renderFloor();
    renderRequests();
    renderHud();
    lastTickAt = Date.now();
    if (tickHandle) clearInterval(tickHandle);
    tickHandle = setInterval(tick, TICK_MS);
    if (state.bankrupt) showBankrupt();
    else if (state.dayOver) showDaySummary();
  }

  // ---------------------------------------------------------------- rendering
  function renderHud() {
    hudMoney.textContent = fmtMoney(state.money);
    hudTime.textContent = fmtClock(state.clockMin);
    hudDay.textContent = state.day;
    statTables.textContent = countHasTable() + "/" + MAX_STATIONS;
    statComputers.textContent = countHasComputer() + "/" + MAX_STATIONS;
    statCustomers.textContent = state.totalCustomers;
    statToday.textContent = fmtMoney(state.today.revenue) + " ₺";

    var tables = countHasTable();
    var computers = countHasComputer();
    btnBuyTable.disabled = tables >= MAX_STATIONS || state.money < TABLE_COST;
    var hasBareTable = state.stations.some(function (s) { return s.hasTable && !s.hasComputer; });
    btnBuyComputer.disabled = !hasBareTable || computers >= MAX_STATIONS || state.money < COMPUTER_COST;
  }

  function stationStatusClass(s) {
    var cls = [];
    if (s.occupied) cls.push("occupied");
    else if (s.hasTable && s.hasComputer) cls.push("ready");
    else if (s.hasTable) cls.push("needs-computer");
    else cls.push("empty");
    if (s.hasComputer && s.computerLevel >= 2) cls.push("lvl" + s.computerLevel);
    return cls.join(" ");
  }

  var COMPUTER_PHOTOS = {
    1: "assets/computer-lvl1.jpg",
    2: "assets/computer-lvl2.jpg",
    3: "assets/computer-lvl3.jpg",
    4: "assets/computer-lvl4.jpg",
    5: "assets/computer-lvl5.jpg"
  };

  function stationVisualMarkup(s) {
    if (s.hasComputer) {
      var name = COMPUTER_LEVELS[s.computerLevel].name;
      return '<div class="station-photo-frame">' +
        '<img class="station-photo" src="' + COMPUTER_PHOTOS[s.computerLevel] + '" alt="' + name + '">' +
        '</div>';
    }
    return '<svg class="i-24 station-bare-desk"><use href="#icon-desk-mini"/></svg>';
  }

  function renderFloor() {
    floor.innerHTML = "";
    state.stations.forEach(function (s, idx) {
      var el = document.createElement("div");
      el.className = "station " + stationStatusClass(s);
      el.dataset.index = idx;

      if (!s.hasTable) {
        el.innerHTML =
          '<svg class="i-20 icon-plus"><use href="#icon-plus"/></svg>' +
          '<span class="station-label">Boş Alan</span>';
      } else {
        var label = s.occupied ? s.customerName
          : (s.hasComputer ? COMPUTER_LEVELS[s.computerLevel].name : "Bilgisayar yok");
        el.innerHTML =
          stationVisualMarkup(s) +
          '<span class="station-label">' + label + '</span>' +
          '<span class="station-rate">' + s.rate + ' ₺/sa</span>' +
          (s.occupied
            ? '<div class="occupant"><svg class="i-12"><use href="#icon-user"/></svg></div>' +
              '<div class="session-bar"><div class="session-fill" data-bar="' + idx + '"></div></div>'
            : "");
      }
      floor.appendChild(el);
    });
    updateSessionBars();
  }

  // Only the progress bars change every tick — repainting the whole floor
  // that often would kill the CSS animations and hurt scrolling.
  function updateSessionBars() {
    state.stations.forEach(function (s, idx) {
      if (!s.occupied) return;
      var bar = floor.querySelector('[data-bar="' + idx + '"]');
      if (!bar) return;
      var total = s.sessionEndMin - s.sessionStartMin;
      var done = state.clockMin - s.sessionStartMin;
      var pct = total > 0 ? Math.max(0, Math.min(100, (done / total) * 100)) : 0;
      bar.style.width = pct + "%";
    });
  }

  function renderRequests() {
    var list = state.requests;
    requestsCount.textContent = list.length;
    requestsCount.className = "requests-count" + (list.length === 0 ? " zero" : "");

    // remove old cards
    Array.prototype.slice.call(requestsList.querySelectorAll(".req-card"))
      .forEach(function (n) { n.remove(); });

    requestsEmpty.hidden = list.length > 0;

    list.forEach(function (r) {
      var st = state.stations[r.stationIdx];
      var total = r.hours * st.rate;
      var left = r.expiresAtMin - state.clockMin;
      var pct = Math.max(0, Math.min(100, (left / PATIENCE_GAME_MIN) * 100));

      var card = document.createElement("div");
      card.className = "req-card" + (pct < 34 ? " urgent" : "");
      card.dataset.reqId = r.id;
      card.innerHTML =
        '<div class="req-avatar"><svg><use href="#icon-user"/></svg></div>' +
        '<div class="req-info">' +
          '<div class="req-line1">' + r.name + ' — Masa ' + (r.stationIdx + 1) + '</div>' +
          '<div class="req-line2">' + r.hours + ' saat · ' + st.rate + ' ₺/sa · ' +
            '<span class="req-total">' + total + ' ₺</span></div>' +
        '</div>' +
        '<div class="req-actions">' +
          '<button class="req-btn req-no" data-act="no" data-id="' + r.id + '" aria-label="Reddet">' +
            '<svg><use href="#icon-close"/></svg></button>' +
          '<button class="req-btn req-yes" data-act="yes" data-id="' + r.id + '" aria-label="Onayla">' +
            '<svg><use href="#icon-check"/></svg></button>' +
        '</div>' +
        '<div class="req-patience" style="width:' + pct + '%"></div>';
      requestsList.appendChild(card);
    });
  }

  function updateRequestTimers() {
    state.requests.forEach(function (r) {
      var card = requestsList.querySelector('[data-req-id="' + r.id + '"]');
      if (!card) return;
      var left = r.expiresAtMin - state.clockMin;
      var pct = Math.max(0, Math.min(100, (left / PATIENCE_GAME_MIN) * 100));
      var fill = card.querySelector(".req-patience");
      if (fill) fill.style.width = pct + "%";
      card.classList.toggle("urgent", pct < 34);
    });
  }

  // ---------------------------------------------------------------- customer generation
  // Willingness to pay: a customer compares the station's hourly rate to
  // what that class of machine is worth to them. Cheap = always accepted,
  // above the ceiling = they simply never ask for that table.
  function customerWantsStation(s) {
    if (!s.hasTable || !s.hasComputer || s.occupied) return false;
    var lvl = COMPUTER_LEVELS[s.computerLevel];
    if (s.rate > lvl.maxAcceptRate) return false;
    var fair = lvl.defaultRate;
    if (s.rate <= fair) return true;
    // between fair price and the ceiling, interest fades out linearly
    var over = (s.rate - fair) / (lvl.maxAcceptRate - fair);
    return Math.random() > over * 0.85;
  }

  function scheduleNextRequest() {
    var hour = Math.floor((state.clockMin % 1440) / 60);
    var demand = DEMAND_BY_HOUR[hour] || 0.2;
    // Foot traffic scales with how big the cafe is. This used to use a
    // log curve, which capped total demand so hard that tables 6-10 earned
    // almost nothing (5 tables and 10 tables both served ~25 customers a
    // day) — the last 1000 TL of expansion paid for itself in 16 days and
    // was effectively a trap. Linear scaling makes every table worth buying.
    var ready = state.stations.filter(function (s) { return s.hasTable && s.hasComputer; }).length;
    var sizeBoost = 1 + Math.max(0, ready - 1) * 0.38;
    var gap = MAX_GAP_GAME_MIN / (demand * sizeBoost);
    gap = Math.max(MIN_GAP_GAME_MIN, Math.min(MAX_GAP_GAME_MIN, gap));
    // jitter so arrivals never feel metronomic
    gap = gap * (0.65 + Math.random() * 0.7);
    state.nextRequestAtMin = state.clockMin + gap;
  }

  function tryCreateRequest() {
    if (state.requests.length >= MAX_PENDING_REQUESTS) { scheduleNextRequest(); return; }

    // candidate tables the customer would actually accept
    var candidates = [];
    state.stations.forEach(function (s, idx) {
      if (state.requests.some(function (r) { return r.stationIdx === idx; })) return; // already requested
      if (customerWantsStation(s)) candidates.push(idx);
    });

    if (candidates.length === 0) {
      // Someone walked in and found nothing suitable — that's a lost customer,
      // but only count it if the cafe actually has working stations.
      var anyReady = state.stations.some(function (s) { return s.hasTable && s.hasComputer; });
      if (anyReady) state.today.lost += 1;
      scheduleNextRequest();
      return;
    }

    var stationIdx = randPick(candidates);
    var hours = 1 + Math.floor(Math.random() * 3); // 1-3 saat
    state.requests.push({
      id: state.reqSeq++,
      name: randPick(FIRST_NAMES),
      stationIdx: stationIdx,
      hours: hours,
      expiresAtMin: state.clockMin + PATIENCE_GAME_MIN
    });
    scheduleNextRequest();
  }

  // ---------------------------------------------------------------- request actions
  requestsList.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-act]");
    if (!btn) return;
    var id = parseInt(btn.dataset.id, 10);
    if (btn.dataset.act === "yes") approveRequest(id);
    else rejectRequest(id);
  });

  function findRequest(id) {
    for (var i = 0; i < state.requests.length; i++) {
      if (state.requests[i].id === id) return i;
    }
    return -1;
  }

  function approveRequest(id) {
    var i = findRequest(id);
    if (i < 0) return;
    var r = state.requests[i];
    var s = state.stations[r.stationIdx];

    if (s.occupied) {
      // the table filled up while this request was waiting
      state.requests.splice(i, 1);
      state.today.lost += 1;
      renderRequests();
      showToast("Masa " + (r.stationIdx + 1) + " bu arada doldu");
      return;
    }

    s.occupied = true;
    s.customerName = r.name;
    s.hoursBooked = r.hours;
    s.sessionStartMin = state.clockMin;
    s.sessionEndMin = state.clockMin + r.hours * 60;
    s.agreedRate = s.rate;              // locked in at approval time
    s.payout = r.hours * s.agreedRate;

    state.requests.splice(i, 1);
    renderRequests();
    renderFloor();
    renderHud();
    save();
  }

  function rejectRequest(id) {
    var i = findRequest(id);
    if (i < 0) return;
    state.requests.splice(i, 1);
    state.today.lost += 1;
    renderRequests();
    renderHud();
    save();
  }

  // ---------------------------------------------------------------- main tick
  // FIX: a phone that was locked/backgrounded returns one huge realDelta.
  // Advancing the clock in a single leap used to skip whole hours of demand
  // (all those customers silently never existed). We now simulate the jump
  // in bounded slices so every arrival window is actually evaluated.
  var MAX_STEP_GAME_MIN = 10;

  function tick() {
    var now = Date.now();
    var realDelta = (now - lastTickAt) / 1000;
    lastTickAt = now;
    if (state.dayOver || state.bankrupt) return; // paused

    var gameMinutes = realDelta * GAME_MINUTES_PER_SECOND;
    // Never simulate more than one full business day in one go, otherwise a
    // phone left off overnight would grind through hundreds of steps.
    if (gameMinutes > (DAY_CLOSE_MIN - DAY_OPEN_MIN)) {
      gameMinutes = DAY_CLOSE_MIN - DAY_OPEN_MIN;
    }

    var structureChanged = false;
    var requestsChanged = false;

    while (gameMinutes > 0 && !state.dayOver) {
      var step = Math.min(MAX_STEP_GAME_MIN, gameMinutes);
      gameMinutes -= step;
      state.clockMin += step;

      // finish any completed sessions
      state.stations.forEach(function (s, idx) {
        if (!s.occupied) return;
        if (state.clockMin >= s.sessionEndMin) {
          state.money += s.payout;
          state.today.revenue += s.payout;
          state.today.served += 1;
          state.totalCustomers += 1;
          spawnIncomePop(idx, s.payout);
          clearSession(s);
          structureChanged = true;
        }
      });

      // expire requests the player ignored too long
      var before = state.requests.length;
      state.requests = state.requests.filter(function (r) {
        return state.clockMin < r.expiresAtMin;
      });
      if (state.requests.length !== before) {
        state.today.lost += (before - state.requests.length);
        requestsChanged = true;
      }

      // new arrivals (only while open)
      while (state.clockMin < DAY_CLOSE_MIN && state.clockMin >= state.nextRequestAtMin) {
        tryCreateRequest();
        requestsChanged = true;
      }

      if (state.clockMin >= DAY_CLOSE_MIN) {
        endDay();
        return;
      }
    }

    if (structureChanged) renderFloor();
    else updateSessionBars();
    if (requestsChanged) renderRequests();
    else updateRequestTimers();
    renderHud();
    save();
  }

  function clearSession(s) {
    s.occupied = false;
    s.customerName = "";
    s.hoursBooked = 0;
    s.sessionStartMin = 0;
    s.sessionEndMin = 0;
    s.payout = 0;
    s.agreedRate = 0;
  }

  // ---------------------------------------------------------------- day cycle
  function endDay() {
    state.clockMin = DAY_CLOSE_MIN;
    state.dayOver = true;

    // customers still seated at closing pay for the time they actually used,
    // FIX: billed at the rate they agreed to, not whatever the price is now
    state.stations.forEach(function (s) {
      if (!s.occupied) return;
      var usedHours = Math.max(0, (DAY_CLOSE_MIN - s.sessionStartMin) / 60);
      var rate = s.agreedRate || s.rate;
      var partial = Math.round(usedHours * rate);
      state.money += partial;
      state.today.revenue += partial;
      state.today.served += 1;
      state.totalCustomers += 1;
      clearSession(s);
    });

    // people still waiting at the door go home
    state.today.lost += state.requests.length;
    state.requests = [];

    var costs = dailyRunningCost();
    state.money -= costs;
    state.todayCosts = costs;

    renderFloor();
    renderRequests();
    renderHud();
    save();

    if (isBankrupt()) { showBankrupt(); return; }
    showDaySummary();
  }

  // FIX: money could go negative with no stations left, leaving the player
  // permanently stuck with no income and nothing affordable. That's now a
  // proper game over.
  function isBankrupt() {
    if (state.money >= TABLE_COST) return false;
    var earning = state.stations.some(function (s) { return s.hasTable && s.hasComputer; });
    if (earning) return false;
    // no working station and not enough cash to build the cheapest one
    return state.money < (TABLE_COST + COMPUTER_COST);
  }

  function showBankrupt() {
    state.bankrupt = true;
    $("bankrupt-days").textContent = state.day;
    $("bankrupt-customers").textContent = state.totalCustomers;
    modalBankrupt.hidden = false;
    save();
  }

  btnBankruptRestart.addEventListener("click", function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    modalBankrupt.hidden = true;
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    state = null;
    screenGame.hidden = true;
    toastLayer.innerHTML = "";
    floor.innerHTML = "";
    nameInput.value = "";
    btnStart.disabled = true;
    screenSetup.hidden = false;
    nameInput.focus();
  });

  function showDaySummary() {
    var costs = state.todayCosts || dailyRunningCost();
    var net = state.today.revenue - costs;
    dayModalTitle.textContent = state.day + ". Gün Sonu";
    dayServed.textContent = state.today.served;
    dayRevenue.textContent = fmtMoney(state.today.revenue) + " ₺";
    dayCosts.textContent = "-" + fmtMoney(costs) + " ₺";
    dayLost.textContent = state.today.lost;
    dayNet.textContent = (net >= 0 ? "+" : "") + fmtMoney(net) + " ₺";
    dayNet.style.color = net >= 0 ? "var(--gold)" : "var(--danger)";
    modalDay.hidden = false;
  }

  // ---------------------------------------------------------------- ads
  // Real ad playback happens natively (Unity Ads has no web SDK). In the
  // APK, a small custom Capacitor plugin named "UnityAdsBridge" is
  // registered and does the actual UnityAds.load()/show() calls — see
  // android-plugin/UnityAdsBridge.kt in the project package. Here we only
  // detect whether that bridge exists and call it; if it's missing (e.g.
  // this page opened directly in a browser for testing) we fall back to a
  // short simulated ad so the day-transition flow can still be tested.
  var AD_PLACEMENT_ID = "Rewarded_Android";
  var adOverlay = $("ad-overlay");
  var adOverlayText = $("ad-overlay-text");
  var adOverlaySub = $("ad-overlay-sub");

  var Ads = {
    nativeBridge: function () {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) || null;
    },

    // onDone is always called exactly once — on success, failure, or "no
    // fill" — so the caller never has to special-case a broken ad network.
    showRewarded: function (onDone) {
      var bridge = this.nativeBridge();
      if (bridge) {
        adOverlayText.textContent = "Reklam yükleniyor…";
        adOverlaySub.textContent = "Lütfen bekleyin";
        adOverlay.hidden = false;
        bridge.showRewarded({ placementId: AD_PLACEMENT_ID })
          .then(function () { adOverlay.hidden = true; onDone(true); })
          .catch(function (err) {
            // no fill / network error / user closed early — continue anyway,
            // but surface WHY so it can be diagnosed without a computer.
            adOverlay.hidden = true;
            var raw = (err && (err.message || err.errorMessage || err)) || "bilinmiyor";
            var reasons = {
              no_fill: "Reklam envanteri yok (no fill) — Unity Ads şu an bu yerleşim için reklam bulamadı.",
              init_timeout: "Reklam sistemi zamanında başlatılamadı (bağlantı ya da Unity Ads tarafı yavaş).",
              show_failed: "Reklam gösterimi başarısız oldu.",
              skipped: "Reklam tamamlanmadan kapatıldı."
            };
            var msg = reasons[raw] || ("Reklam hatası: " + raw);
            showToast(msg);
            onDone(false);
          });
        return;
      }
      // ---- browser preview fallback: simulated 4-second rewarded ad ----
      adOverlay.hidden = false;
      adOverlayText.textContent = "Reklam oynatılıyor (önizleme)";
      var left = 4;
      adOverlaySub.textContent = left + " sn";
      var iv = setInterval(function () {
        left -= 1;
        if (left <= 0) {
          clearInterval(iv);
          adOverlay.hidden = true;
          onDone(true);
        } else {
          adOverlaySub.textContent = left + " sn";
        }
      }, 1000);
    }
  };

  var AD_BONUS = 100;

  btnNextDay.addEventListener("click", function () {
    btnNextDay.disabled = true;
    Ads.showRewarded(function (watchedFully) {
      // Runs whether the ad completed, failed, or had no fill — the day
      // must never get stuck behind an ad the network couldn't serve.
      btnNextDay.disabled = false;
      modalDay.hidden = true;
      if (watchedFully) {
        state.money += AD_BONUS;
        showToast("Reklam bonusu: +" + AD_BONUS + " ₺");
      }
      state.day += 1;
      state.clockMin = DAY_OPEN_MIN;
      state.dayOver = false;
      state.today = { served: 0, revenue: 0, lost: 0 };
      state.todayCosts = 0;
      state.requests = [];
      state.nextRequestAtMin = DAY_OPEN_MIN + 4;
      lastTickAt = Date.now();
      renderFloor();
      renderRequests();
      renderHud();
      save();
    });
  });

  // ---------------------------------------------------------------- price editing
  floor.addEventListener("click", function (e) {
    var card = e.target.closest(".station");
    if (!card) return;
    var idx = parseInt(card.dataset.index, 10);
    var s = state.stations[idx];
    if (!s || !s.hasTable) return;
    openPriceModal(idx);
  });

  function applySliderRange(s) {
    var lvl = s.hasComputer ? COMPUTER_LEVELS[s.computerLevel] : COMPUTER_LEVELS[1];
    // headroom above the ceiling so the "too expensive" zone is reachable,
    // but the slider stays precise for the range that actually matters
    var max = Math.ceil((lvl.maxAcceptRate * 1.15) / 10) * 10;
    priceSlider.min = MIN_RATE;
    priceSlider.max = max;
    priceScaleMin.textContent = MIN_RATE + " ₺";
    priceScaleMax.textContent = max + " ₺";
    if (parseInt(priceSlider.value, 10) > max) priceSlider.value = max;
  }

  function openPriceModal(idx) {
    editingStationIdx = idx;
    var s = state.stations[idx];
    priceModalTitle.textContent = "Masa " + (idx + 1) + " Ücreti";
    priceModalSub.textContent = s.hasComputer
      ? COMPUTER_LEVELS[s.computerLevel].name + " · saatlik ücreti belirle."
      : "Bu masada henüz bilgisayar yok, ama ücretini şimdiden ayarlayabilirsin.";
    applySliderRange(s);
    priceSlider.value = s.rate;
    priceValue.textContent = s.rate;
    updatePriceFeedback();
    renderUpgradeCard(idx);
    modalPrice.hidden = false;
  }

  function renderUpgradeCard(idx) {
    var s = state.stations[idx];
    if (!s.hasComputer) { upgradeCard.hidden = true; return; }

    var cur = COMPUTER_LEVELS[s.computerLevel];
    upgradeCard.hidden = false;

    if (!cur.upgradeCost) {
      upgradeCard.classList.add("maxed");
      upgradePhoto.src = COMPUTER_PHOTOS[s.computerLevel];
      upgradeLabel.textContent = "En üst seviye";
      upgradeName.textContent = cur.name;
      btnUpgradeStation.hidden = true;
      return;
    }

    var next = COMPUTER_LEVELS[s.computerLevel + 1];
    upgradeCard.classList.remove("maxed");
    upgradePhoto.src = COMPUTER_PHOTOS[s.computerLevel + 1];
    upgradeLabel.textContent = "Sonraki Seviye";
    upgradeName.textContent = next.name;
    btnUpgradeStation.hidden = false;
    upgradeCost.textContent = fmtMoney(cur.upgradeCost) + " ₺";
    btnUpgradeStation.disabled = state.money < cur.upgradeCost;
  }

  btnUpgradeStation.addEventListener("click", function () {
    if (editingStationIdx === null) return;
    upgradeStation(editingStationIdx);
    renderUpgradeCard(editingStationIdx);
    // the station's default rate may have bumped up with the new tier —
    // reflect that in the open slider so Kaydet doesn't undo it
    var s = state.stations[editingStationIdx];
    applySliderRange(s);
    priceSlider.value = s.rate;
    priceModalSub.textContent = COMPUTER_LEVELS[s.computerLevel].name + " · saatlik ücreti belirle.";
    updatePriceFeedback();
  });

  function updatePriceFeedback() {
    var rate = parseInt(priceSlider.value, 10);
    priceValue.textContent = rate;
    var s = state.stations[editingStationIdx];
    var lvl = s && s.hasComputer ? COMPUTER_LEVELS[s.computerLevel] : COMPUTER_LEVELS[1];
    var cls = "", msg = "";

    if (rate > lvl.maxAcceptRate) {
      cls = "pricey";
      msg = "<strong>Çok pahalı.</strong> Bu fiyata " + lvl.name +
            " için kimse oturmaz, masa boş kalır.";
    } else if (rate > lvl.defaultRate * 1.35) {
      cls = "pricey";
      msg = "<strong>Yüksek fiyat.</strong> Kazanç saati başına iyi ama müşteri az gelir.";
    } else if (rate < lvl.defaultRate * 0.7) {
      cls = "cheap";
      msg = "<strong>Ucuz.</strong> Masa sürekli dolar ama saat başı kazancın düşük olur.";
    } else {
      msg = "<strong>Dengeli fiyat.</strong> " + lvl.name +
            " için piyasa değerine yakın.";
    }
    priceFeedback.className = "price-feedback " + cls;
    priceFeedback.innerHTML = msg;
  }

  priceSlider.addEventListener("input", updatePriceFeedback);

  btnSavePrice.addEventListener("click", function () {
    if (editingStationIdx === null) return;
    var s = state.stations[editingStationIdx];
    var newRate = parseInt(priceSlider.value, 10);
    s.rate = newRate;

    // NOTE: s.payout / s.agreedRate are deliberately left untouched. A
    // customer who already sat down keeps the price agreed at approval
    // time, so repricing mid-session can't change their bill.

    // FIX: pending requests used to be deleted (and counted as lost
    // customers) whenever the owner touched the price — punishing the
    // player for using a core mechanic. The waiting customer now just sees
    // the re-quoted total and stays, walking out only if the new price went
    // above what that class of machine is worth to them.
    var walkedOut = 0;
    if (s.hasComputer) {
      var ceiling = COMPUTER_LEVELS[s.computerLevel].maxAcceptRate;
      state.requests = state.requests.filter(function (r) {
        if (r.stationIdx !== editingStationIdx) return true;
        if (newRate <= ceiling) return true;
        walkedOut++;
        return false;
      });
    }
    if (walkedOut > 0) {
      state.today.lost += walkedOut;
      showToast("Fiyat çok yüksek, bekleyen müşteri gitti");
    }

    modalPrice.hidden = true;
    editingStationIdx = null;
    renderFloor();
    renderRequests();
    renderHud();
    save();
  });

  btnClosePrice.addEventListener("click", function () {
    modalPrice.hidden = true;
    editingStationIdx = null;
  });
  modalPrice.addEventListener("click", function (e) {
    if (e.target === modalPrice) { modalPrice.hidden = true; editingStationIdx = null; }
  });

  // ---------------------------------------------------------------- shop
  btnBuyTable.addEventListener("click", function () {
    if (countHasTable() >= MAX_STATIONS) return showToast("Maksimum masa sayısına ulaşıldı");
    if (state.money < TABLE_COST) return showToast("Yetersiz bütçe");
    var slot = state.stations.find(function (s) { return !s.hasTable; });
    if (!slot) return;
    slot.hasTable = true;
    state.money -= TABLE_COST;
    renderFloor(); renderHud(); save();
  });

  btnBuyComputer.addEventListener("click", function () {
    var slot = state.stations.find(function (s) { return s.hasTable && !s.hasComputer; });
    if (!slot) return showToast("Önce boş bir masa ekle");
    if (countHasComputer() >= MAX_STATIONS) return showToast("Maksimum bilgisayar sayısına ulaşıldı");
    if (state.money < COMPUTER_COST) return showToast("Yetersiz bütçe");
    slot.hasComputer = true;
    slot.computerLevel = 1;
    slot.rate = COMPUTER_LEVELS[1].defaultRate;
    state.money -= COMPUTER_COST;
    renderFloor(); renderHud(); save();
  });

  // Per-station upgrade — called from the price modal's "Yükselt" button
  // (each station has its own hardware tier now, so a single global
  // upgrade button no longer makes sense with 5 levels).
  function upgradeStation(idx) {
    var s = state.stations[idx];
    if (!s || !s.hasComputer) return;
    var cur = COMPUTER_LEVELS[s.computerLevel];
    if (!cur.upgradeCost) return showToast("Bu masa zaten en üst seviyede");
    if (state.money < cur.upgradeCost) return showToast("Yetersiz bütçe");
    state.money -= cur.upgradeCost;
    s.computerLevel += 1;
    // bump the price toward the new machine's market rate, but never
    // below what the owner already had it set to
    s.rate = Math.max(s.rate, COMPUTER_LEVELS[s.computerLevel].defaultRate);
    renderFloor(); renderHud(); save();
    showToast(COMPUTER_LEVELS[s.computerLevel].name + "'a yükseltildi · " + s.rate + " ₺/sa");
  }

  // ---------------------------------------------------------------- fx
  function spawnIncomePop(stationIdx, amount) {
    var el = floor.children[stationIdx];
    if (!el) return;
    var rect = el.getBoundingClientRect();
    var layerRect = toastLayer.getBoundingClientRect();
    var pop = document.createElement("div");
    pop.className = "income-pop";
    pop.textContent = "+" + amount + " ₺";
    pop.style.left = (rect.left - layerRect.left + rect.width / 2 - 14) + "px";
    pop.style.top = (rect.top - layerRect.top + 4) + "px";
    toastLayer.appendChild(pop);
    setTimeout(function () { pop.remove(); }, 1150);
  }

  function showToast(msg) {
    var t = document.createElement("div");
    t.className = "toast-msg";
    t.textContent = msg;
    toastLayer.appendChild(t);
    setTimeout(function () { t.remove(); }, 1900);
  }

  // ---------------------------------------------------------------- info modal + reset
  var btnReset = $("btn-reset");
  var resetConfirm = $("reset-confirm");
  var btnResetCancel = $("btn-reset-cancel");
  var btnResetConfirm = $("btn-reset-confirm");

  btnInfo.addEventListener("click", function () {
    renderSettingsStats();
    modalInfo.hidden = false;
  });

  // settings tab switching
  Array.prototype.slice.call(document.querySelectorAll(".settings-tab")).forEach(function (tab) {
    tab.addEventListener("click", function () {
      var target = tab.dataset.tab;
      document.querySelectorAll(".settings-tab").forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
      });
      document.querySelectorAll(".settings-panel").forEach(function (p) {
        p.classList.toggle("is-active", p.dataset.panel === target);
      });
    });
  });

  function renderSettingsStats() {
    if (!state) return;
    var rows = [
      ["İşletme", state.cafeName],
      ["Gün", String(state.day)],
      ["Kasa", fmtMoney(state.money) + " ₺"],
      ["Toplam müşteri", String(state.totalCustomers)],
      ["Masa / Bilgisayar", countHasTable() + " / " + countHasComputer()],
      ["Günlük gider", fmtMoney(dailyRunningCost()) + " ₺"]
    ];
    settingsStats.innerHTML = rows.map(function (r) {
      return '<div class="settings-stat"><span>' + r[0] + '</span><strong>' + r[1] + '</strong></div>';
    }).join("");
  }

  btnCloseInfo.addEventListener("click", closeInfoModal);
  modalInfo.addEventListener("click", function (e) { if (e.target === modalInfo) closeInfoModal(); });

  function closeInfoModal() {
    modalInfo.hidden = true;
    resetConfirm.hidden = true;
    btnReset.hidden = false;
  }

  btnReset.addEventListener("click", function () {
    resetConfirm.hidden = false;
    btnReset.hidden = true;
  });
  btnResetCancel.addEventListener("click", function () {
    resetConfirm.hidden = true;
    btnReset.hidden = false;
  });
  btnResetConfirm.addEventListener("click", function () {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    state = null;
    resetConfirm.hidden = true;
    btnReset.hidden = false;
    modalInfo.hidden = true;
    modalDay.hidden = true;
    modalBankrupt.hidden = true;
    modalPrice.hidden = true;
    screenGame.hidden = true;
    toastLayer.innerHTML = "";
    floor.innerHTML = "";
    nameInput.value = "";
    btnStart.disabled = true;
    screenSetup.hidden = false;
    nameInput.focus();
  });

})();
