(function () {
  "use strict";

  // =========================================================================
  // iOZ Cafe 3D — başlangıç sürümü
  // Eski metin-tabanlı oyunun YERİNE geçiyor. Kapsam bilinçli olarak dar:
  //   - Yürünebilir 3D oda (zemin/duvar/tavan), joystick + sabit aksiyon butonu
  //   - Kalıcı para (localStorage)
  //   - Gün sistemi: HER gün geçişi reklam ister (VIP hariç)
  //   - Hızlı reklam bonusu: +3000 ₺, günde 3 kez
  //   - VIP: gerçek Google Play satın alımı (BillingBridge.kt, native)
  //   - Online chat: Ably (eski game.js ile birebir aynı kanal/mantık)
  //   - Dükkan: masa/sandalye/bilgisayar (25₺'den) — üçü tamamlanınca bir
  //     istasyon kurulup 3D odaya yerleştiriliyor, biri eksikse kurulum
  //     başarısız oluyor (hiçbir şey harcanmaz)
  // Henüz YOK: admin paneli, sıralama, istasyonlardan gelir kazanma mantığı
  // — bunlar ayrı, sıradaki adımlarda eklenecek. "Mevcut oyunu sil"
  // talimatı üzerine tüm eski ekonomi/rebirth/istasyon kodu KALDIRILDI.
  // =========================================================================

  function $(id) { return document.getElementById(id); }

  // ---- sabitler -----------------------------------------------------------
  var ROOM_W = 12, ROOM_D = 12, ROOM_H = 4.6; // tavan yükseltildi (3.2 → 4.6), boy oranı için
  var PLAYER_MARGIN = 0.45;
  var EYE_HEIGHT = 1.7; // ortalama göz hizası — tavanla makul bir baş üstü boşluğu bırakır
  var WALK_BOB_AMOUNT = 0.045;
  var WALK_BOB_SPEED = 9;
  var MOVE_SPEED = 3.4;
  var ACCENT = 0x2fbfa8;

  var AD_PLACEMENT_ID = "Rewarded_Android";
  var AD_BONUS_QUICK_REWARD = 3000;
  var AD_BONUS_QUICK_DAILY_LIMIT = 3;
  var VIP_PRODUCT_ID = "vip_membership"; // BillingBridge.kt ile birebir aynı olmalı

  var MONEY_KEY = "netcafe3d_money";
  var DAY_KEY = "netcafe3d_day";
  var VIP_TEST_KEY = "netcafe3d_vip_local";
  var AD_QUICK_KEY = "netcafe3d_ad_quick_uses";
  var PLAYER_ID_KEY = "netcafe_player_id"; // eski oyunla AYNI anahtar — kimlik sürekliliği
  var PLAYER_NAME_KEY = "netcafe3d_player_name";
  var INVENTORY_KEY = "netcafe3d_inventory"; // {sandalye,masa,bilgisayar} — henüz istasyona dönüşmemiş envanter
  var STATIONS_KEY = "netcafe3d_stations"; // kurulmuş (masa+sandalye+bilgisayar tamamlanmış) istasyon sayısı

  // ---- dükkan --------------------------------------------------------
  // İSTENDİ: masa/sandalye/bilgisayar ayrı ayrı satın alınıyor (25₺'den),
  // ama bir istasyon SADECE üçü de envanterde varsa kurulabiliyor — biri
  // eksikse "kurulum başarısız" (bkz. buildStation()).
  var SHOP_ITEMS = [
    { id: "sandalye", name: "Sandalye", price: 25, icon: '<path d="M6 3v11M18 3v11M6 14h12M8 14v7M16 14v7"/>' },
    { id: "masa", name: "Masa", price: 25, icon: '<path d="M3 9h18M6 9v10M18 9v10"/>' },
    { id: "bilgisayar", name: "Bilgisayar", price: 25, icon: '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>' }
  ];
  var STATION_SLOTS_MAX = 6; // oda genişliğine göre arka duvara sığan slot sayısı — dolunca sıradaki adımda oda büyütülür/duvar eklenir

  var ABLY_API_KEY = "3nsRqw.wIyZEg:EOoAE5ZRsMjOqy7C1thwdwiVIGD-3AdzDfQswLx9Al8"; // eski oyunla aynı gerçek anahtar
  var CHAT_CHANNEL_NAME = "iozcafe-chat-global";
  var MODERATION_CHANNEL_NAME = "iozcafe-moderation";
  var CHAT_HISTORY_LIMIT = 20;
  var ABLY_SDK_URL = "https://cdn.ably.com/lib/ably.min-2.js";

  // ---- basit yardımcılar ----------------------------------------------
  function readNum(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : Number(v); } catch (e) { return fallback; }
  }
  function writeNum(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) {} }
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function getPlayerId() {
    var id = null;
    try { id = localStorage.getItem(PLAYER_ID_KEY); } catch (e) {}
    if (!id) {
      id = "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(PLAYER_ID_KEY, id); } catch (e) {}
    }
    return id;
  }
  function shortTag(clientId) {
    if (!clientId) return "";
    var c = String(clientId).replace(/[^a-zA-Z0-9]/g, "");
    return c ? c.slice(-4).toUpperCase() : "";
  }

  function getAdsBridge() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.UnityAdsBridge) || null;
  }
  function getBillingBridge() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BillingBridge) || null;
  }

  var adOverlay = $("ad-overlay");
  var adOverlayText = $("ad-overlay-text");

  // onDone(watchedFully) — eski game.js'teki Ads.showRewarded ile AYNI
  // sözleşme, Kotlin tarafında değişiklik gerekmiyor. Bridge yoksa (APK
  // dışında test) kısa, AÇIKÇA etiketli bir simülasyon gösterir.
  function showRewardedAd(onDone) {
    var bridge = getAdsBridge();
    if (bridge) {
      adOverlayText.textContent = "Reklam yükleniyor…";
      adOverlay.hidden = false;
      bridge.showRewarded({ placementId: AD_PLACEMENT_ID })
        .then(function () { adOverlay.hidden = true; onDone(true); })
        .catch(function () { adOverlay.hidden = true; onDone(false); });
      return;
    }
    adOverlayText.textContent = "Reklam (SİMÜLASYON — APK dışında test)";
    adOverlay.hidden = false;
    setTimeout(function () { adOverlay.hidden = true; onDone(true); }, 1200);
  }

  // ---- oyun durumu -------------------------------------------------------
  var money = readNum(MONEY_KEY, 100);
  var day = readNum(DAY_KEY, 1);
  var vip = readNum(VIP_TEST_KEY, 0) === 1;
  var adQuickLeft = AD_BONUS_QUICK_DAILY_LIMIT;
  (function initAdQuickLeft() {
    var raw = null;
    try { raw = localStorage.getItem(AD_QUICK_KEY); } catch (e) {}
    if (raw) {
      var parts = raw.split(":");
      if (parts[0] === todayStr()) adQuickLeft = Math.max(0, AD_BONUS_QUICK_DAILY_LIMIT - Number(parts[1] || 0));
    }
  })();

  function setMoney(v) { money = v; writeNum(MONEY_KEY, money); $("money-val").textContent = money; }
  function setDay(v) { day = v; writeNum(DAY_KEY, day); $("day-val").textContent = day; }
  function setVip(v) {
    vip = v; writeNum(VIP_TEST_KEY, vip ? 1 : 0);
    var btn = $("btn-vip");
    btn.textContent = vip ? "VIP" : "VIP (test)";
    btn.className = "pill " + (vip ? "vip-on" : "vip-off");
    $("btn-end-day").textContent = vip ? "Günü bitir (VIP — reklamsız)" : "Günü bitir (reklam izle)";
  }
  function setAdQuickLeft(v) {
    adQuickLeft = Math.max(0, v);
    try { localStorage.setItem(AD_QUICK_KEY, todayStr() + ":" + (AD_BONUS_QUICK_DAILY_LIMIT - adQuickLeft)); } catch (e) {}
    $("ad-quick-left").textContent = adQuickLeft;
    $("btn-ad-quick").disabled = adQuickLeft <= 0;
  }

  // ---- dükkan (envanter + istasyon kurma) --------------------------------
  var inventory = { sandalye: 0, masa: 0, bilgisayar: 0 };
  try {
    var savedInv = JSON.parse(localStorage.getItem(INVENTORY_KEY) || "null");
    if (savedInv) inventory = savedInv;
  } catch (e) {}
  var stationsBuilt = readNum(STATIONS_KEY, 0);

  function saveInventory() { try { localStorage.setItem(INVENTORY_KEY, JSON.stringify(inventory)); } catch (e) {} }

  function renderShop() {
    var wrap = $("shop-items");
    wrap.innerHTML = "";
    SHOP_ITEMS.forEach(function (item) {
      var row = document.createElement("div");
      row.className = "shop-item";
      row.innerHTML =
        '<div class="shop-item-info"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg>' +
        '<span>' + item.name + '</span><span class="shop-item-owned">(' + inventory[item.id] + ' adet)</span></div>' +
        '<button data-id="' + item.id + '">' + item.price + ' ₺</button>';
      wrap.appendChild(row);
    });
    wrap.querySelectorAll("button[data-id]").forEach(function (btn) {
      btn.addEventListener("click", function () { buyShopItem(btn.getAttribute("data-id")); });
    });
    var canBuild = inventory.sandalye >= 1 && inventory.masa >= 1 && inventory.bilgisayar >= 1;
    var buildBtn = $("btn-build-station");
    buildBtn.disabled = !canBuild || stationsBuilt >= STATION_SLOTS_MAX;
    buildBtn.textContent = stationsBuilt >= STATION_SLOTS_MAX
      ? "Oda dolu (" + stationsBuilt + "/" + STATION_SLOTS_MAX + ")"
      : "İstasyon Kur (1 Masa + 1 Sandalye + 1 Bilgisayar)";
  }

  function shopStatus(text) {
    var el = $("shop-status");
    el.textContent = text || "";
    if (text) setTimeout(function () { if (el.textContent === text) el.textContent = ""; }, 2200);
  }

  function buyShopItem(id) {
    var item = SHOP_ITEMS.filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    if (money < item.price) { shopStatus("Yetersiz bakiye."); return; }
    setMoney(money - item.price);
    inventory[id] = (inventory[id] || 0) + 1;
    saveInventory();
    renderShop();
  }

  // Bir istasyon SADECE masa+sandalye+bilgisayarın ÜÇÜ de envanterde varsa
  // kurulur — biri eksikse kurulum başarısız olur, hiçbir şey harcanmaz.
  function buildStation() {
    if (stationsBuilt >= STATION_SLOTS_MAX) { shopStatus("Oda dolu — yeni istasyon için yer yok."); return; }
    if (inventory.sandalye < 1 || inventory.masa < 1 || inventory.bilgisayar < 1) {
      shopStatus("Kurulum başarısız: masa, sandalye ve bilgisayarın hepsi gerekli.");
      return;
    }
    inventory.sandalye -= 1; inventory.masa -= 1; inventory.bilgisayar -= 1;
    saveInventory();
    placeStationInRoom(stationsBuilt);
    stationsBuilt += 1;
    writeNum(STATIONS_KEY, stationsBuilt);
    renderShop();
    shopStatus("İstasyon kuruldu!");
  }

  $("btn-build-station").addEventListener("click", buildStation);


  function showActionMsg(text) {
    var el = $("action-msg");
    el.textContent = text; el.hidden = false;
    clearTimeout(actionMsgTimer);
    actionMsgTimer = setTimeout(function () { el.hidden = true; }, 1200);
  }

  // ---- VIP restore (gerçek Google Play kaydı) ----------------------------
  (function restoreVipOnStart() {
    var bridge = getBillingBridge();
    if (bridge && bridge.restorePurchases) {
      bridge.restorePurchases().then(function (res) {
        if (res && res.isVip) setVip(true);
      }).catch(function () {});
    }
  })();

  $("btn-vip").addEventListener("click", function () {
    // Sadece tarayıcı/test amaçlı elle aç-kapa. Gerçek cihazda VIP satın
    // alma akışı burada BillingBridge.purchaseVip({productId: VIP_PRODUCT_ID})
    // ile tetiklenmeli — dükkan/VIP ekranı eklendiğinde bağlanacak.
    setVip(!vip);
  });

  // ---- gün + reklam --------------------------------------------------
  $("btn-end-day").addEventListener("click", function () {
    if (!adOverlay.hidden) return;
    if (vip) { setDay(day + 1); return; }
    showRewardedAd(function (watched) { if (watched) setDay(day + 1); });
  });

  $("btn-ad-quick").addEventListener("click", function () {
    if (adQuickLeft <= 0 || !adOverlay.hidden) return;
    showRewardedAd(function (watched) {
      if (watched) {
        setMoney(money + AD_BONUS_QUICK_REWARD);
        setAdQuickLeft(adQuickLeft - 1);
        showActionMsg("+" + AD_BONUS_QUICK_REWARD + " ₺");
      }
    });
  });

  $("btn-action").addEventListener("click", function () {
    showActionMsg("Etkileşim (yakında)");
  });

  // ---- tam ekran + yatay kilit -----------------------------------------
  $("btn-fullscreen").addEventListener("click", function () {
    var el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
    if (window.screen && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(function () {});
    }
  });

  function checkOrientation() {
    $("portrait-overlay").hidden = window.innerHeight <= window.innerWidth;
  }
  checkOrientation();
  window.addEventListener("resize", checkOrientation);

  // =========================================================================
  // Chat (Ably) — eski game.js'teki AYNI kanal isimleri ve anlık moderasyon
  // =========================================================================
  var ablyClient = null;
  var chatChannel = null;
  var chatConnectStarted = false;
  var mutedUntil = 0;
  var banned = false;
  var lastSendAt = 0;
  var playerName = "";
  try { playerName = localStorage.getItem(PLAYER_NAME_KEY) || ""; } catch (e) {}

  var ablySdkPromise = null;
  function loadAblySdk(cb) {
    if (window.Ably) { cb(); return; }
    if (!ablySdkPromise) {
      ablySdkPromise = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = ABLY_SDK_URL;
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    ablySdkPromise.then(cb).catch(function () { setChatStatus("Ably SDK yüklenemedi (internet?)"); });
  }

  function setChatStatus(text) { $("chat-status").textContent = text || ""; }

  function appendChatMessage(data, clientId) {
    var box = $("chat-messages");
    var empty = box.querySelector(".chat-empty");
    if (empty) empty.remove();
    var row = document.createElement("div");
    row.className = "chat-msg";
    var tag = shortTag(clientId);
    row.innerHTML = '<span class="name"></span><span class="tag"></span>: <span class="text"></span>';
    row.querySelector(".name").textContent = (data && data.name) || "?";
    row.querySelector(".tag").textContent = tag ? "#" + tag : "";
    row.querySelector(".text").textContent = (data && data.text) || "";
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  }

  function connectChat() {
    if (chatConnectStarted) return;
    chatConnectStarted = true;
    if (ABLY_API_KEY === "ABLY_API_KEY_BURAYA") {
      setChatStatus("Ably anahtarı henüz girilmedi (game.js'te ABLY_API_KEY_BURAYA yazan yeri değiştir)");
      return;
    }
    setChatStatus("Bağlanılıyor…");
    loadAblySdk(function () {
      try {
        ablyClient = new Ably.Realtime({ key: ABLY_API_KEY, clientId: getPlayerId() });
        chatChannel = ablyClient.channels.get(CHAT_CHANNEL_NAME);
        chatChannel.subscribe("msg", function (msg) { appendChatMessage(msg.data, msg.clientId); });

        chatChannel.history({ limit: CHAT_HISTORY_LIMIT, direction: "backwards" }).then(function (page) {
          if (!page || !page.items) return;
          page.items.slice().reverse().forEach(function (m) {
            if (m.name === "msg") appendChatMessage(m.data, m.clientId);
          });
        }).catch(function () {});

        // Moderasyon — ANINDA (canlı push), polling değil
        var modChannel = ablyClient.channels.get(MODERATION_CHANNEL_NAME);
        modChannel.subscribe("action", function (msg) {
          var data = msg.data;
          if (!data || data.target !== getPlayerId()) return;
          if (data.type === "mute") { mutedUntil = data.until || 0; setChatStatus("Susturuldun."); }
          else if (data.type === "unmute") { mutedUntil = 0; setChatStatus(""); }
          else if (data.type === "ban") { banned = true; setChatStatus("Sohbetten yasaklandın."); }
          else if (data.type === "unban") { banned = false; setChatStatus(""); }
          updateChatInputState();
        });

        setChatStatus("");
      } catch (err) {
        setChatStatus("Bağlantı hatası: " + (err && err.message ? err.message : String(err)));
      }
    });
  }

  function updateChatInputState() {
    var input = $("chat-input");
    var muted = mutedUntil > Date.now();
    input.disabled = banned || muted || !playerName;
    input.placeholder = banned ? "Sohbetten yasaklandın" : muted ? "Susturuldun" : "Mesaj yaz…";
    $("btn-chat-send").disabled = input.disabled;
  }

  $("chat-name-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && this.value.trim()) {
      playerName = this.value.trim().slice(0, 24);
      try { localStorage.setItem(PLAYER_NAME_KEY, playerName); } catch (err) {}
      $("chat-name-row").hidden = true;
      updateChatInputState();
    }
  });
  if (playerName) $("chat-name-row").hidden = true;

  function sendChatMessage() {
    var input = $("chat-input");
    var text = input.value.trim();
    if (!text || !chatChannel) return;
    if (banned) { setChatStatus("Sohbetten yasaklısın."); return; }
    if (mutedUntil > Date.now()) { setChatStatus("Susturuldun, biraz sonra tekrar dene."); return; }
    var now = Date.now();
    if (now - lastSendAt < 2000) return; // spam koruması
    lastSendAt = now;
    chatChannel.publish("msg", { text: text.slice(0, 240), name: playerName || ("Misafir#" + shortTag(getPlayerId())) });
    input.value = "";
  }
  $("btn-chat-send").addEventListener("click", sendChatMessage);
  $("chat-input").addEventListener("keydown", function (e) { if (e.key === "Enter") sendChatMessage(); });

  $("btn-chat-toggle").addEventListener("click", function () {
    $("chat-panel").hidden = false;
    $("btn-chat-toggle").hidden = true;
    connectChat();
  });
  $("btn-chat-close").addEventListener("click", function () {
    $("chat-panel").hidden = true;
    $("btn-chat-toggle").hidden = false;
  });

  // ---- dükkan (placeholder — içerik sıradaki adımda gelecek) -------------
  $("btn-shop").addEventListener("click", function () { $("shop-panel").hidden = false; renderShop(); });
  $("btn-shop-close").addEventListener("click", function () { $("shop-panel").hidden = true; });

  // =========================================================================
  // Three.js sahnesi
  // =========================================================================
  var mount = $("three-mount");
  var width = mount.clientWidth, height = mount.clientHeight;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1014);
  scene.fog = new THREE.Fog(0x0b1014, 9, 20);

  var camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.set(0, EYE_HEIGHT, 3.2);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  var ceilingLamp = new THREE.PointLight(0xfff2d6, 1.1, 16, 2);
  ceilingLamp.position.set(0, ROOM_H - 0.2, 0);
  scene.add(ceilingLamp);
  var accentLight = new THREE.PointLight(ACCENT, 0.6, 12, 2);
  accentLight.position.set(-4, 1.6, -4);
  scene.add(accentLight);

  var floorMat = new THREE.MeshStandardMaterial({ color: 0x171f24, roughness: 0.9 });
  var wallMat = new THREE.MeshStandardMaterial({ color: 0x1d262c, roughness: 0.95 });
  var ceilMat = new THREE.MeshStandardMaterial({ color: 0x11161a, roughness: 1 });
  var trimMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: 0x0c332d, roughness: 0.4 });

  var HW = ROOM_W / 2, HD = ROOM_D / 2;

  var floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  var ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  scene.add(ceiling);

  var backWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  backWall.position.set(0, ROOM_H / 2, -HD);
  scene.add(backWall);

  var frontWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  frontWall.position.set(0, ROOM_H / 2, HD);
  frontWall.rotation.y = Math.PI;
  scene.add(frontWall);

  var leftWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  leftWall.position.set(-HW, ROOM_H / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  scene.add(leftWall);

  var rightWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_D, ROOM_H), wallMat);
  rightWall.position.set(HW, ROOM_H / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  scene.add(rightWall);

  [[ROOM_W, -HD, "z"], [ROOM_W, HD, "z"], [ROOM_D, -HW, "x"], [ROOM_D, HW, "x"]].forEach(function (t) {
    var len = t[0], pos = t[1], axis = t[2];
    var trim = new THREE.Mesh(
      axis === "z" ? new THREE.BoxGeometry(len, 0.08, 0.06) : new THREE.BoxGeometry(0.06, 0.08, len),
      trimMat
    );
    if (axis === "z") trim.position.set(0, 0.04, pos + (pos < 0 ? 0.03 : -0.03));
    else trim.position.set(pos + (pos < 0 ? 0.03 : -0.03), 0.04, 0);
    scene.add(trim);
  });

  // ---- istasyon (masa + sandalye + bilgisayar) — basit low-poly gruplar --
  // Arka duvar boyunca, aralarında boşluk bırakarak diziliyor. Bilgisayar
  // ekranı odaya (oyuncuya) bakacak şekilde yerleştirildi, sandalye masanın
  // önünde (oda tarafında) duruyor — gerçek bir internet cafe düzeni gibi.
  var deskMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.8 });
  var chairMat = new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.7 });
  var monitorMat = new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.5 });
  var screenMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.6 });

  function buildStationGroup() {
    var g = new THREE.Group();

    // masa
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.55), deskMat);
    top.position.set(0, 0.75, 0);
    g.add(top);
    [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), deskMat);
      leg.position.set(p[0], 0.375, p[1]);
      g.add(leg);
    });

    // bilgisayar (masanın üstünde, ekran odaya/+Z'ye bakıyor)
    var monitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.04), monitorMat);
    monitor.position.set(0, 1.0, -0.12);
    g.add(monitor);
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), screenMat);
    screen.position.set(0, 1.0, -0.095);
    g.add(screen);
    var stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), monitorMat);
    stand.position.set(0, 0.83, -0.12);
    g.add(stand);
    var keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.12), monitorMat);
    keyboard.position.set(0, 0.78, 0.1);
    g.add(keyboard);

    // sandalye (masanın önünde, oda tarafında)
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.38), chairMat);
    seat.position.set(0, 0.45, 0.7);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.05), chairMat);
    back.position.set(0, 0.65, 0.87);
    g.add(back);
    [[-0.16, 0.55], [0.16, 0.55], [-0.16, 0.85], [0.16, 0.85]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), chairMat);
      leg.position.set(p[0], 0.225, p[1]);
      g.add(leg);
    });

    return g;
  }

  function stationSlotPosition(index) {
    // arka duvar boyunca, ortadan dışa doğru eşit aralıklı slotlar
    var spacing = 1.9;
    var offset = (index - (STATION_SLOTS_MAX - 1) / 2) * spacing;
    return { x: offset, z: -HD + 0.9 };
  }

  function placeStationInRoom(index) {
    var pos = stationSlotPosition(index);
    var g = buildStationGroup();
    g.position.set(pos.x, 0, pos.z);
    scene.add(g);
  }

  // Sayfa yeniden açıldığında daha önce kurulmuş istasyonları geri koy
  for (var si = 0; si < stationsBuilt; si++) placeStationInRoom(si);

  function handleResize() {
    width = mount.clientWidth; height = mount.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener("resize", handleResize);

  // ---- klavye (masaüstü test) ----
  var keys = {};
  window.addEventListener("keydown", function (e) { keys[e.key.toLowerCase()] = true; });
  window.addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });

  // ---- joystick ----
  var joystickBase = $("joystick-base");
  var joystickStick = $("joystick-stick");
  var joystickActive = false;
  var moveVec = { x: 0, y: 0 };
  var STICK_RADIUS = 44;

  function stickPointerDown(e) {
    joystickActive = true;
    joystickBase.classList.add("active");
    if (joystickBase.setPointerCapture) { try { joystickBase.setPointerCapture(e.pointerId); } catch (err) {} }
  }
  function stickPointerMove(e) {
    if (!joystickActive) return;
    var rect = joystickBase.getBoundingClientRect();
    var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    var dist = Math.hypot(dx, dy);
    if (dist > STICK_RADIUS) { dx = (dx / dist) * STICK_RADIUS; dy = (dy / dist) * STICK_RADIUS; }
    joystickStick.style.transform = "translate(" + dx + "px," + dy + "px)";
    moveVec.x = dx / STICK_RADIUS;
    moveVec.y = -dy / STICK_RADIUS;
  }
  function stickPointerUp() {
    joystickActive = false;
    joystickBase.classList.remove("active");
    moveVec.x = 0; moveVec.y = 0;
    joystickStick.style.transform = "translate(0px,0px)";
  }
  joystickBase.addEventListener("pointerdown", stickPointerDown);
  joystickBase.addEventListener("pointermove", stickPointerMove);
  joystickBase.addEventListener("pointerup", stickPointerUp);
  joystickBase.addEventListener("pointercancel", stickPointerUp);
  joystickBase.addEventListener("pointerleave", stickPointerUp);

  // ---- etrafa bakma (look-around) ----------------------------------------
  // Boş 3D alana (joystick/butonların ÜZERİNE değil) parmakla sürükleyerek
  // bakış yönünü değiştirir. Joystick ayrı bir elementte kendi pointer'ını
  // yakaladığı için (setPointerCapture) iki parmak aynı anda çakışmadan
  // çalışır: biri hareket, diğeri bakış.
  camera.rotation.order = "YXZ";
  var yaw = 0, pitch = 0;
  var LOOK_SENS = 0.0035;
  var PITCH_LIMIT = Math.PI / 2 - 0.05;
  var lookPointerId = null, lookLastX = 0, lookLastY = 0;

  mount.style.touchAction = "none";
  mount.addEventListener("pointerdown", function (e) {
    if (lookPointerId !== null) return;
    lookPointerId = e.pointerId;
    lookLastX = e.clientX; lookLastY = e.clientY;
    try { mount.setPointerCapture(e.pointerId); } catch (err) {}
  });
  mount.addEventListener("pointermove", function (e) {
    if (e.pointerId !== lookPointerId) return;
    var dx = e.clientX - lookLastX, dy = e.clientY - lookLastY;
    lookLastX = e.clientX; lookLastY = e.clientY;
    yaw -= dx * LOOK_SENS;
    pitch -= dy * LOOK_SENS;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  });
  function lookPointerEnd(e) { if (e.pointerId === lookPointerId) lookPointerId = null; }
  mount.addEventListener("pointerup", lookPointerEnd);
  mount.addEventListener("pointercancel", lookPointerEnd);
  mount.addEventListener("pointerleave", lookPointerEnd);

  // ---- döngü ----
  var last = performance.now();
  var walkPhase = 0;
  function tick(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    var mx = moveVec.x, my = moveVec.y;
    if (!joystickActive) {
      mx = (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0);
      my = (keys["w"] || keys["arrowup"] ? 1 : 0) - (keys["s"] || keys["arrowdown"] ? 1 : 0);
    }

    var isMoving = mx !== 0 || my !== 0;

    if (isMoving) {
      var len = Math.hypot(mx, my) || 1;
      var nx = (mx / len) * Math.min(1, len); // sağ (+) / sol (-) — kameraya göre
      var ny = (my / len) * Math.min(1, len); // ileri (+) / geri (-) — kameraya göre

      // Hareket artık SABİT dünya eksenine değil, kameranın o anki bakış
      // yönüne (yaw) göre hesaplanıyor — böylece "sağ/ileri" her zaman
      // ekranda gördüğün sağ/ileri ile eşleşiyor, bakış döndükçe de doğru
      // kalıyor. (Önceki sürümdeki sağ/sol tersliği buradan kaynaklanıyordu.)
      var fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
      var rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);

      camera.position.x += (rightX * nx + fwdX * ny) * MOVE_SPEED * dt;
      camera.position.z += (rightZ * nx + fwdZ * ny) * MOVE_SPEED * dt;

      var limX = HW - PLAYER_MARGIN, limZ = HD - PLAYER_MARGIN;
      camera.position.x = Math.max(-limX, Math.min(limX, camera.position.x));
      camera.position.z = Math.max(-limZ, Math.min(limZ, camera.position.z));

      // Yürüme animasyonu (baş sallanması) — sadece hareket ederken
      walkPhase += dt * WALK_BOB_SPEED;
    } else {
      // Duruyorsan yumuşakça göz hizasına geri dön
      walkPhase += dt * WALK_BOB_SPEED;
      if (Math.abs(Math.sin(walkPhase)) < 0.05) walkPhase = 0;
    }
    var bob = isMoving ? Math.abs(Math.sin(walkPhase)) * WALK_BOB_AMOUNT : Math.sin(walkPhase) * WALK_BOB_AMOUNT * 0.3;
    camera.position.y = EYE_HEIGHT + bob;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---- ilk render ----
  setMoney(money);
  setDay(day);
  setVip(vip);
  setAdQuickLeft(adQuickLeft);
  updateChatInputState();
  renderShop();
})();
