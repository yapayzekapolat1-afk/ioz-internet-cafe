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
  //   - Dükkan: masa/sandalye/bilgisayar (25₺'den) — HER ürün ayrı satın
  //     alınıp ANINDA yerleştirme moduna giriyor (yürüyüp bakarak konumla,
  //     döndür, onayla ya da iptal et — iptalde parası iade edilir)
  //   - Kapı + neon "Kafe Açık/Kapalı" tabelası (ön duvarda)
  //   - Sabit, neon/modernist tasarımlı KASA — sol ön köşede, girişe bakar
  // Henüz YOK: admin paneli, sıralama, istasyonlardan gelir kazanma mantığı,
  // gerçek çok oyunculu 3D avatar sistemi (chat var ama diğer oyuncuları 3D
  // sahnede göremiyorsun — kasadan "girenleri görme" şu an sadece görsel
  // konumlandırma, canlı oyuncu tespiti değil). "Mevcut oyunu sil" talimatı
  // üzerine tüm eski ekonomi/rebirth/istasyon kodu KALDIRILDI.
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
  var NEON_BLUE = 0x2fd6ff;

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
  var PLACED_ITEMS_KEY = "netcafe3d_placed_items"; // [{type,x,z,rotY}, ...] — tek tek yerleştirilmiş her parça
  var CAFE_OPEN_KEY = "netcafe3d_cafe_open";

  // ---- dükkan --------------------------------------------------------
  // DÜZELTME: önceki sürümde masa/sandalye/bilgisayar bir "envantere"
  // gidiyordu ve hiçbir şey yerleşmiyordu — kafa karıştırıyordu. Artık her
  // ürün TEK BAŞINA satın alınıp ANINDA yerleştirme moduna giriyor; iptal
  // edersen parası tam olarak iade ediliyor.
  var SHOP_ITEMS = [
    { id: "sandalye", name: "iOZ Old Sandalye", price: 25, rating: 0.5, seat: false, tier: 1, icon: '<path d="M6 3v11M18 3v11M6 14h12M8 14v7M16 14v7"/>', build: function () { return buildChairMesh(); } },
    { id: "masa", name: "iOZ Old Masa", price: 25, rating: 0.5, seat: true, tier: 1, icon: '<path d="M3 9h18M6 9v10M18 9v10"/>', build: function () { return buildTableMesh(); } },
    { id: "bilgisayar", name: "iOZ Old 1980", price: 25, rating: 0.5, seat: false, tier: 1, computer: true, icon: '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>', build: function (onTable) { return buildComputerMesh(onTable); } },
    { id: "sandalye90", name: "iOZ Old 90 Sandalye", price: 200, rating: 1.5, seat: false, tier: 2, icon: '<path d="M6 3v11M18 3v11M6 14h12M8 14v7M16 14v7"/>', build: function () { return build90ChairMesh(); } },
    { id: "masa90", name: "iOZ Old 90 Masa", price: 200, rating: 1.5, seat: true, tier: 2, icon: '<path d="M3 9h18M6 9v10M18 9v10"/>', build: function () { return build90TableMesh(); } },
    { id: "bilgisayar90", name: "iOZ Old 90", price: 500, rating: 1.5, seat: false, tier: 2, computer: true, icon: '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>', build: function (onTable) { return build90ComputerMesh(onTable); } }
  ];
  // "seat: true" olan parçalar (masalar) — otomatik müşteriler oturacak yer
  // olarak bunları kullanıyor. tier, müşterinin ne kadar ödeyeceğini belirler
  // (bkz. NPC_PAYOUT_BY_TIER) — bu ödeme miktarları HENÜZ senden net bir sayı
  // gelmediği için varsayım, birlikte ayarlayabiliriz.
  var NPC_PAYOUT_BY_TIER = { 1: 20, 2: 60 };
  var PLACED_ITEMS_MAX = 24; // odadaki toplam parça üst sınırı (kalabalık olmasın diye) — istenirse artırılabilir

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

  // ---- dükkan (her ürün tek başına satın alınır → anında yerleştirme) ----
  var placedItems = [];
  try {
    var savedPlaced = JSON.parse(localStorage.getItem(PLACED_ITEMS_KEY) || "null");
    if (Array.isArray(savedPlaced)) placedItems = savedPlaced;
  } catch (e) {}

  function savePlacedItems() { try { localStorage.setItem(PLACED_ITEMS_KEY, JSON.stringify(placedItems)); } catch (e) {} }

  var STAR_PATH = "M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9-6.2 3.9 1.6-7L1 9.2l7.1-.6L12 2z";
  function starSvg(fill, uniqueSeed) {
    if (fill <= 0) return '<svg class="star" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="' + STAR_PATH + '"/></svg>';
    if (fill >= 1) return '<svg class="star star-full" viewBox="0 0 24 24" fill="currentColor"><path d="' + STAR_PATH + '"/></svg>';
    var clipId = "starclip" + uniqueSeed;
    return '<svg class="star" viewBox="0 0 24 24">' +
      '<defs><clipPath id="' + clipId + '"><rect x="0" y="0" width="' + (24 * fill).toFixed(1) + '" height="24"/></clipPath></defs>' +
      '<path d="' + STAR_PATH + '" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="' + STAR_PATH + '" fill="currentColor" clip-path="url(#' + clipId + ')"/>' +
      '</svg>';
  }
  function starsHtml(rating, seedPrefix) {
    var html = '<span class="stars">';
    for (var i = 0; i < 5; i++) {
      html += starSvg(Math.max(0, Math.min(1, rating - i)), seedPrefix + "_" + i);
    }
    return html + '</span>';
  }

  function renderShop() {
    var wrap = $("shop-items");
    wrap.innerHTML = "";
    var tiers = [
      { label: "iOZ Old — 1980 Serisi", items: SHOP_ITEMS.filter(function (i) { return i.tier === 1; }) },
      { label: "iOZ Old 90 — 90'lı Yıllar Serisi", items: SHOP_ITEMS.filter(function (i) { return i.tier === 2; }) }
    ];
    tiers.forEach(function (tier) {
      var section = document.createElement("div");
      section.className = "shop-section";
      var heading = document.createElement("div");
      heading.className = "shop-section-title";
      heading.textContent = tier.label;
      section.appendChild(heading);
      var grid = document.createElement("div");
      grid.className = "shop-grid";
      tier.items.forEach(function (item) {
        var card = document.createElement("div");
        card.className = "shop-card";
        card.innerHTML =
          '<div class="shop-card-icon"><svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg></div>' +
          '<div class="shop-card-name">' + item.name + '</div>' +
          starsHtml(item.rating || 0, item.id) +
          '<button data-id="' + item.id + '">' + item.price + ' ₺</button>';
        grid.appendChild(card);
      });
      section.appendChild(grid);
      wrap.appendChild(section);
    });
    var full = placedItems.length >= PLACED_ITEMS_MAX;
    wrap.querySelectorAll("button[data-id]").forEach(function (btn) {
      btn.disabled = placementMode || full;
      btn.addEventListener("click", function () { buyShopItem(btn.getAttribute("data-id")); });
    });
    $("shop-status").textContent = full ? "Oda dolu (" + placedItems.length + "/" + PLACED_ITEMS_MAX + ")" : (placementMode ? "Önce elindekini yerleştir/iptal et." : "");
  }

  function shopStatus(text) {
    var el = $("shop-status");
    el.textContent = text || "";
    if (text) setTimeout(function () { if (el.textContent === text) el.textContent = ""; }, 2200);
  }

  // Satın alma ANINDA yerleştirme moduna girer — envanterde beklemez.
  // "Yerleştir"e basana kadar para zaten harcanmış olur, ama "İptal"
  // edersen tam fiyatı iade edilir (bkz. enterPlacementMode, aşağıda).
  function buyShopItem(id) {
    var item = SHOP_ITEMS.filter(function (i) { return i.id === id; })[0];
    if (!item) return;
    if (placementMode) { shopStatus("Önce elindekini yerleştir ya da iptal et."); return; }
    if (placedItems.length >= PLACED_ITEMS_MAX) { shopStatus("Oda dolu — yeni parça için yer yok."); return; }
    if (money < item.price) { shopStatus("Yetersiz bakiye."); return; }
    setMoney(money - item.price);
    $("shop-panel").hidden = true;
    enterPlacementMode(item);
  }



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

  // İSTENDİ: manuel "tam ekran" ve sağ alttaki genel "aksiyon" butonu
  // kaldırıldı — tam ekran zaten native tarafta (MainActivity.java) otomatik
  // uygulanıyor, ayrı bir butona gerek yoktu.

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

        // Aktif sayaç — kaç kişi şu an sohbete bağlı (Ably presence)
        function refreshPresenceCount() {
          chatChannel.presence.get(function (err, members) {
            if (err) return;
            $("chat-active-count").textContent = "(Aktif: " + members.length + ")";
          });
        }
        chatChannel.presence.enter({ name: playerName || "Misafir" }).catch(function () {});
        chatChannel.presence.subscribe(function () { refreshPresenceCount(); });
        refreshPresenceCount();

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
      this.blur(); // klavyeyi kapat
      if (chatChannel) chatChannel.presence.update({ name: playerName }).catch(function () {});
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
  $("btn-chat-send").addEventListener("click", function () {
    sendChatMessage();
    $("chat-input").blur(); // klavye takılı kalmasın diye kapatıyoruz
  });
  $("chat-input").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      sendChatMessage();
      this.blur(); // klavye takılı kalmasın diye kapatıyoruz
    }
  });

  $("btn-chat-toggle").addEventListener("click", function () {
    $("chat-panel").hidden = false;
    connectChat();
  });
  $("btn-chat-close").addEventListener("click", function () {
    $("chat-panel").hidden = true;
    $("chat-input").blur();
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

  // ---- etkileşim sistemi — ekran ortasındaki beyaz nokta neyi gösteriyorsa
  // (ışık düğmesi, kafe tabelası düğmesi vb.) ona bakıp dokununca tetiklenir.
  var raycaster = new THREE.Raycaster();
  var interactables = []; // {mesh, range, action}
  function registerInteractable(mesh, range, action) { interactables.push({ mesh: mesh, range: range, action: action }); }
  function tryInteract() {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    for (var i = 0; i < interactables.length; i++) {
      var it = interactables[i];
      var hit = raycaster.intersectObject(it.mesh, true);
      if (hit.length && hit[0].distance <= it.range) { it.action(); return; }
    }
  }

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  var AMBIENT_ON = 0.62, AMBIENT_OFF = 0.12; // biraz artırıldı — ışık açıkken oda daha net aydınlık olsun
  var ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_ON);
  scene.add(ambientLight);
  var ceilingLamp = new THREE.PointLight(0xfff2d6, 1.1, 16, 2);
  ceilingLamp.position.set(0, ROOM_H - 0.2, 0);
  scene.add(ceilingLamp);
  // NOT: köşedeki turkuaz "accentLight" kaldırıldı — "her şey mavi/neon
  // olmuş" şikayetinin büyük kısmı buradan geliyordu, oda artık sadece
  // sıcak tavan lambasıyla aydınlanıyor. Neon renk sadece ekranlar ve
  // (istenen) açık/kapalı tabelasında kalıyor.

  // ---- ampul (tavan lambası, açıp kapatabildiğimiz gerçek bir 3D nesne) --
  var bulbOnMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2b0, emissiveIntensity: 1.4 });
  var bulbOffMat = new THREE.MeshStandardMaterial({ color: 0x555049, emissive: 0x000000 });
  var bulbFixture = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }));
  bulbFixture.position.set(0, ROOM_H - 0.02, 0);
  scene.add(bulbFixture);
  var bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), bulbOnMat);
  bulb.position.set(0, ROOM_H - 0.28, 0);
  scene.add(bulb);

  var lightOn = true;
  function setLightOn(on) {
    lightOn = on;
    ceilingLamp.visible = on;
    ambientLight.intensity = on ? AMBIENT_ON : AMBIENT_OFF;
    bulb.material = on ? bulbOnMat : bulbOffMat;
  }
  // NOT: ışık artık HUD butonuyla değil, duvardaki fiziksel düğmeye
  // (nişangahla bakıp dokunarak) açılıp kapanıyor — bkz. lightSwitch/
  // registerInteractable, aşağıda kapı/tabela bölümünde.

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

  // ---- mobilya parçaları — masa/sandalye/bilgisayar AYRI AYRI, kendi -----
  // başlarına yerleştirilebilir low-poly gruplar.
  var deskMat = new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.8 });
  var chairMat = new THREE.MeshStandardMaterial({ color: 0x2a2f34, roughness: 0.7 });
  var monitorMat = new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.5 });
  var screenMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.6 });

  function buildTableMesh() {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.55), deskMat);
    top.position.set(0, 0.75, 0);
    g.add(top);
    [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), deskMat);
      leg.position.set(p[0], 0.375, p[1]);
      g.add(leg);
    });
    // Masanın ARKASINI ayırt etmek için düz, marka renginde ince bir panel —
    // yerleştirirken/döndürürken "ön/arka"yı bir bakışta ayırt edelim diye.
    var backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.28, 0.03), trimMat);
    backPlate.position.set(0, 0.6, -0.28);
    g.add(backPlate);
    return g;
  }

  function buildChairMesh() {
    var g = new THREE.Group();
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.05, 0.38), chairMat);
    seat.position.set(0, 0.45, 0);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.4, 0.05), chairMat);
    back.position.set(0, 0.65, -0.17);
    g.add(back);
    [[-0.16, -0.15], [0.16, -0.15], [-0.16, 0.15], [0.16, 0.15]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), chairMat);
      leg.position.set(p[0], 0.225, p[1]);
      g.add(leg);
    });
    return g;
  }

  // Bağımsız (masasız) koyulursa ayaklı bir "kiosk terminal" gibi durur.
  // Bir masaya YAKIN koyarsan (bkz. tryTableSnap) otomatik olarak masanın
  // ÜSTÜNE oturur — o zaman ayak/kaide çizilmez, direkt masa yüksekliğinde
  // bir masaüstü bilgisayar gibi görünür. DÜZELTME: önceki sürümde bilgisayar
  // her zaman kiosk şeklindeydi, masaya hiç "oturmuyordu" — buydu şikayet.
  function buildComputerMesh(onTable) {
    var g = new THREE.Group();
    if (!onTable) {
      var base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), monitorMat);
      base.position.set(0, 0.025, 0);
      g.add(base);
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), monitorMat);
      pole.position.set(0, 0.4, 0);
      g.add(pole);
      var shelf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.18), monitorMat);
      shelf.position.set(0, 0.6, 0.08);
      g.add(shelf);
    }
    var monY = onTable ? 0.2 : 0.9;
    var monitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.04), monitorMat);
    monitor.position.set(0, monY, onTable ? -0.08 : 0);
    g.add(monitor);
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), screenMat);
    screen.position.set(0, monY, (onTable ? -0.08 : 0) + 0.025);
    g.add(screen);
    if (onTable) {
      var keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.13), monitorMat);
      keyboard.position.set(0, 0.02, 0.14);
      g.add(keyboard);
    }
    return g;
  }

  // ---- "90'lı yıllar" serisi — 80'lere göre daha kaliteli/modern görünüm --
  var mat90Frame = new THREE.MeshStandardMaterial({ color: 0xd8d3c9, roughness: 0.55, metalness: 0.15 }); // krem/bej gövde
  var mat90Chrome = new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.2, metalness: 0.85 }); // krom detaylar
  var mat90GlassTop = new THREE.MeshStandardMaterial({ color: 0x8fd8e0, roughness: 0.15, transparent: true, opacity: 0.55 }); // cam masa üstü
  var mat90Screen = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.7 });
  var mat90Accent = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.9 });

  // Modern, dönebilir ofis koltuğu hissi — krom tekerlekli taban, yuvarlak
  // dolgulu koltuk, kavisli sırt desteği.
  function build90ChairMesh() {
    var g = new THREE.Group();
    var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 16), mat90Frame);
    seat.position.set(0, 0.46, 0);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 16, 1, false, 0, Math.PI), mat90Frame);
    back.rotation.z = Math.PI / 2;
    back.rotation.y = Math.PI / 2;
    back.position.set(0, 0.72, -0.19);
    g.add(back);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), mat90Chrome);
    pole.position.set(0, 0.24, 0);
    g.add(pole);
    var wheelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), mat90Chrome);
    wheelBase.position.set(0, 0.03, 0);
    g.add(wheelBase);
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2;
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), mat90Chrome);
      leg.position.set(Math.cos(ang) * 0.14, 0.05, Math.sin(ang) * 0.14);
      leg.rotation.z = Math.PI / 2.4 * Math.sin(ang);
      leg.rotation.x = Math.PI / 2.4 * -Math.cos(ang);
      g.add(leg);
    }
    return g;
  }

  // Cam üstlü, krom bacaklı modern masa — arkasında yine ayırt edici bir
  // panel var, bu sefer neon mavi.
  function build90TableMesh() {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 0.6), mat90GlassTop);
    top.position.set(0, 0.76, 0);
    g.add(top);
    var rim = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 0.6), mat90Chrome);
    rim.position.set(0, 0.735, 0);
    g.add(rim);
    [[-0.48, -0.24], [0.48, -0.24], [-0.48, 0.24], [0.48, 0.24]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8), mat90Chrome);
      leg.position.set(p[0], 0.36, p[1]);
      g.add(leg);
    });
    var backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.03), mat90Accent);
    backPlate.position.set(0, 0.6, -0.3);
    g.add(backPlate);
    return g;
  }

  // 90'lara özel: bej kasa + CRT tarz şişkin monitör — 1980 kiosk'undan
  // TAMAMEN farklı bir silüet. onTable=true ise kule/ayak çizilmez, direkt
  // masa üstünde duran bir CRT bilgisayar gibi görünür.
  function build90ComputerMesh(onTable) {
    var g = new THREE.Group();
    var baseY = onTable ? 0 : 0.46;
    if (!onTable) {
      var tower = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, 0.42), mat90Frame);
      tower.position.set(0.28, 0.25, 0);
      g.add(tower);
      var towerAccent = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.42), mat90Accent);
      towerAccent.position.set(0.28, 0.42, 0);
      g.add(towerAccent);
    }
    var monY = onTable ? 0.22 : 0.68;
    var monitorBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.38), mat90Frame); // CRT şişkinliği
    monitorBack.position.set(-0.12, monY, -0.05);
    g.add(monitorBack);
    var monitorFront = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.03), mat90Frame);
    monitorFront.position.set(-0.12, monY, 0.15);
    g.add(monitorFront);
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.24), mat90Screen);
    screen.position.set(-0.12, monY, 0.17);
    g.add(screen);
    var monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.2), mat90Frame);
    monitorStand.position.set(-0.12, baseY, 0);
    g.add(monitorStand);
    var keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.13), mat90Frame);
    keyboard.position.set(-0.12, baseY - 0.04, 0.24);
    g.add(keyboard);
    return g;
  }

  var PLACED_GROUPS = []; // sahnedeki kalıcı parçalar — placedItems ile aynı sırada
  var TABLE_TOP_Y = 0.75; // her iki masa tipinin de üst yüzey yüksekliği
  var COMPUTER_SNAP_RADIUS = 1.0; // bilgisayarı bu mesafede bir masa varsa üstüne oturt

  function placeItemInRoom(p) {
    var item = SHOP_ITEMS.filter(function (i) { return i.id === p.type; })[0];
    if (!item) return;
    var g = item.build(!!p.onTable);
    g.position.set(p.x, p.y || 0, p.z);
    g.rotation.y = p.rotY || 0;
    scene.add(g);
    PLACED_GROUPS.push(g);
  }

  // Bir bilgisayarı yakındaki bir masanın TAM ÜSTÜNE oturtmaya çalışır —
  // bulursa masanın konumu/açısıyla hizalanmış {x,y,z,rotY,onTable:true}
  // döner, yoksa null (o zaman bilgisayar yere, ayaklı kiosk olarak konur).
  // DÜZELTME: önceki sürümde bilgisayar HİÇBİR ZAMAN masaya oturmuyordu.
  function findTableSnap(x, z) {
    var best = null, bestDist = COMPUTER_SNAP_RADIUS;
    placedItems.forEach(function (p) {
      if (p.type !== "masa" && p.type !== "masa90") return;
      var dist = Math.hypot(p.x - x, p.z - z);
      if (dist < bestDist) { bestDist = dist; best = p; }
    });
    if (!best) return null;
    return { x: best.x, y: TABLE_TOP_Y, z: best.z, rotY: best.rotY, onTable: true };
  }

  // Sayfa yeniden açıldığında daha önce yerleştirilmiş parçaları geri koy
  placedItems.forEach(function (p) { placeItemInRoom(p); });

  // ---- yerleştirme modu — her parçayı tek tek, istediğimiz yere/açıyla ---
  // yürüyüp bakarak konumlandırıyoruz, "Döndür" 45° çeviriyor, "Yerleştir"
  // kalıcı yapıyor, "İptal" o parçanın parasını tam olarak iade ediyor.
  var PLACEMENT_DIST = 1.5;
  var placementMode = false;
  var placementItem = null; // SHOP_ITEMS'tan seçili öğe — iptal iadesi için
  var placementGroup = null;
  var placementRotOffset = 0;
  var ghostMat = new THREE.MeshStandardMaterial({ color: ACCENT, transparent: true, opacity: 0.45 });

  function enterPlacementMode(item) {
    placementMode = true;
    placementItem = item;
    placementRotOffset = 0;
    placementGroup = item.build(false); // yerleştirirken her zaman genel (kiosk) hali önizlenir, onaylayınca masaya oturup oturmayacağı hesaplanır
    placementGroup.traverse(function (obj) { if (obj.isMesh) obj.material = ghostMat; });
    scene.add(placementGroup);
    $("placement-toolbar").hidden = false;
  }

  function exitPlacementMode() {
    placementMode = false;
    placementItem = null;
    if (placementGroup) { scene.remove(placementGroup); placementGroup = null; }
    $("placement-toolbar").hidden = true;
  }

  $("btn-place-rotate").addEventListener("click", function () {
    placementRotOffset += Math.PI / 4;
  });
  $("btn-place-confirm").addEventListener("click", function () {
    if (!placementGroup) return;
    var x = placementGroup.position.x, z = placementGroup.position.z, rotY = placementGroup.rotation.y;
    var type = placementItem.id, name = placementItem.name;
    var finalData = { type: type, x: x, y: 0, z: z, rotY: rotY, onTable: false };
    if (placementItem.computer) {
      var snap = findTableSnap(x, z);
      if (snap) finalData = { type: type, x: snap.x, y: snap.y, z: snap.z, rotY: snap.rotY, onTable: true };
    }
    placedItems.push(finalData);
    savePlacedItems();
    placeItemInRoom(finalData);
    exitPlacementMode();
    renderShop();
    shopStatus(name + " yerleştirildi!");
  });
  $("btn-place-cancel").addEventListener("click", function () {
    // vazgeçilirse ürünün parası TAM olarak iade edilir
    if (placementItem) setMoney(money + placementItem.price);
    exitPlacementMode();
    renderShop();
  });

  // =========================================================================
  // Kapı + neon "Kafe Açık/Kapalı" tabelası — ön duvarda (giriş)
  // =========================================================================
  var doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x0d1114, roughness: 0.4 });
  var doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x1c2a2e, roughness: 0.5, metalness: 0.3 });

  var doorGroup = new THREE.Group();
  var doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.08), doorFrameMat);
  doorFrame.position.set(0, 1.15, 0);
  doorGroup.add(doorFrame);
  var doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.1, 0.05), doorPanelMat);
  doorPanel.position.set(0, 1.08, 0.02);
  doorGroup.add(doorPanel);
  var doorWindow = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), new THREE.MeshStandardMaterial({ color: 0x0a1a1c, roughness: 0.1, metalness: 0.2 }));
  doorWindow.position.set(0, 1.55, 0.05);
  doorGroup.add(doorWindow);
  var doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.7, roughness: 0.25 }));
  doorHandle.position.set(0.4, 1.0, 0.05);
  doorGroup.add(doorHandle);
  doorGroup.position.set(0, 0, HD - 0.03);
  doorGroup.rotation.y = Math.PI;
  scene.add(doorGroup);

  // ---- gerçek yazılı neon tabela (canvas doku) — önceden sadece renkli bir
  // dikdörtgendi, hiç yazı yoktu. Şimdi "AÇIK" / "KAPALI" gerçekten yazıyor.
  function makeSignTexture(text, color) {
    var canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 128;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#08100f"; ctx.fillRect(0, 0, 256, 128);
    ctx.font = "bold 46px sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = color; ctx.shadowBlur = 22;
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 66);
    return new THREE.CanvasTexture(canvas);
  }
  var signOpenTex = makeSignTexture("AÇIK", "#22ff88");
  var signClosedTex = makeSignTexture("KAPALI", "#ff2f4d");
  var signFrameMat = new THREE.MeshStandardMaterial({ color: 0x111417, roughness: 0.5 });
  var signGroup = new THREE.Group();
  var signFrame = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.42, 0.04), signFrameMat);
  signGroup.add(signFrame);
  var signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32), new THREE.MeshBasicMaterial({ map: signOpenTex }));
  signFace.position.set(0, 0, 0.03);
  signGroup.add(signFace);
  signGroup.position.set(1.15, 2.0, HD - 0.05);
  signGroup.rotation.y = Math.PI;
  scene.add(signGroup);

  // ---- duvar düğmeleri — gerçek 3D nesneler, ekran ortasındaki beyaz
  // noktayla nişan alıp dokunarak açıp kapatıyoruz. HUD butonu YOK artık.
  var switchPlateMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.45, metalness: 0.1 });
  var switchNubOnMat = new THREE.MeshStandardMaterial({ color: 0x22ff88, emissive: 0x22ff88, emissiveIntensity: 0.9 });
  var switchNubOffMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a });

  function buildWallSwitch() {
    var g = new THREE.Group();
    var plate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.025), switchPlateMat);
    g.add(plate);
    var nub = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.02), switchNubOnMat);
    nub.position.set(0, 0, 0.02);
    g.add(nub);
    g.userData.nub = nub;
    return g;
  }

  var cafeSwitch = buildWallSwitch();
  cafeSwitch.position.set(1.15, 1.55, HD - 0.04);
  cafeSwitch.rotation.y = Math.PI;
  scene.add(cafeSwitch);

  var lightSwitch = buildWallSwitch();
  lightSwitch.position.set(-0.95, 1.55, HD - 0.04);
  lightSwitch.rotation.y = Math.PI;
  scene.add(lightSwitch);

  var cafeOpen = readNum(CAFE_OPEN_KEY, 1) === 1;
  function setCafeOpen(on) {
    cafeOpen = on;
    writeNum(CAFE_OPEN_KEY, on ? 1 : 0);
    signFace.material.map = on ? signOpenTex : signClosedTex;
    signFace.material.needsUpdate = true;
    cafeSwitch.userData.nub.material = on ? switchNubOnMat : switchNubOffMat;
  }
  registerInteractable(cafeSwitch, 2.6, function () { setCafeOpen(!cafeOpen); });
  registerInteractable(lightSwitch, 2.6, function () { setLightOn(!lightOn); });


  // =========================================================================
  // Kasa — modern resepsiyon masası, arka duvara yaslı, kapıya bakıyor.
  // NOT: şu an gerçek oyuncuların 3D sahnede görünmesini sağlayan bir sistem
  // yok (chat var ama ortak avatarlar henüz yok) — kasa "girenleri görme"
  // burada şimdilik sadece fiziksel konum/bakış açısı anlamına geliyor.
  // =========================================================================
  var kasaDeskMat = new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.35, metalness: 0.4 });
  var kasaTrimMat = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.8 });
  var kasaScreenMat = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 1.1 });

  // Grup +Z'ye (kapıya) bakacak şekilde tasarlandı: masa gövdesi ortada,
  // MÜŞTERİ tarafı +Z (kapı/oda yönü), GÖREVLİ sandalyesi -Z (duvar yönü).
  var kasaGroup = new THREE.Group();
  var kasaBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.5), kasaDeskMat);
  kasaBody.position.set(0, 0.375, 0);
  kasaGroup.add(kasaBody);
  var kasaTop = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.56), kasaDeskMat);
  kasaTop.position.set(0, 0.775, 0);
  kasaGroup.add(kasaTop);
  // ince, TEK bir aydınlık şerit — sadece ön-üst kenarda (yan yüzeyle
  // çakışmıyor, önceki sürümdeki "tuhaf pembe panel" hatası buradan
  // kaynaklanıyordu)
  var kasaTrim = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 0.02), kasaTrimMat);
  kasaTrim.position.set(0, 0.74, 0.26);
  kasaGroup.add(kasaTrim);
  // monitör — masanın arkasında (görevli tarafında), ekran görevliye (-Z) bakıyor
  var kasaMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.04), kasaDeskMat);
  kasaMonitor.position.set(0, 1.0, -0.05);
  kasaGroup.add(kasaMonitor);
  var kasaScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), kasaScreenMat);
  kasaScreen.position.set(0, 1.0, -0.07);
  kasaScreen.rotation.y = Math.PI;
  kasaGroup.add(kasaScreen);
  // görevli sandalyesi — duvar tarafında (-Z), masanın arkasında
  var kasaChairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.4), kasaDeskMat);
  kasaChairSeat.position.set(0, 0.45, -0.55);
  kasaGroup.add(kasaChairSeat);
  var kasaChairBack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.05), kasaDeskMat);
  kasaChairBack.position.set(0, 0.68, -0.72);
  kasaGroup.add(kasaChairBack);

  // sol arka köşe, duvara yaslı, kapıya (+Z) düz bakıyor
  kasaGroup.position.set(-HW + 1.3, 0, -HD + 0.85);
  kasaGroup.rotation.y = 0;
  scene.add(kasaGroup);

  // =========================================================================
  // Otomatik müşteriler — kapıdan girip boş bir masaya oturur, bir süre
  // "kullanır", sonra kasaya gelip öder ve çıkar. Kafe kapalıysa (neon
  // tabela kırmızıysa) YENİ müşteri gelmez — mevcut olanlar işini bitirip
  // gider. BASİTLEŞTİRME: şu an sadece boş bir "masa" arıyor, o masanın
  // yanında gerçekten sandalye/bilgisayar olup olmadığını doğrulamıyor —
  // istersen bir sonraki adımda bunu da (yakınlık kontrolü ile) sıkılaştırırız.
  // =========================================================================
  var DOOR_POS = { x: 0, z: HD - 0.6 };
  var NPC_MAX = 4;
  var NPC_SPEED = 1.6;
  var NPC_SPAWN_INTERVAL = 12; // saniye
  var NPC_SIT_MIN = 5, NPC_SIT_MAX = 10;
  var NPC_COLORS = [0xe07a5f, 0x81b29a, 0xf2cc8f, 0x3d5a80, 0xbc6c25];
  var npcs = [];
  var occupiedTables = {}; // placedItems index -> true
  var npcSpawnTimer = 0;

  function buildNpcMesh() {
    var color = NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)];
    var mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.7 });
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.75, 10), mat);
    body.position.set(0, 0.55, 0);
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), mat);
    head.position.set(0, 1.02, 0);
    g.add(head);
    return g;
  }

  function seatWorldPos(item) {
    // masanın "ön" (oturulan) tarafı — buildTableMesh'te arka panel -Z'de,
    // yani oturma tarafı +Z; item.rotY ile world'e çeviriyoruz.
    var lx = 0, lz = 0.6;
    return { x: item.x + lx * Math.cos(item.rotY) + lz * Math.sin(item.rotY), z: item.z - lx * Math.sin(item.rotY) + lz * Math.cos(item.rotY) };
  }

  function kasaWorldFrontPos() {
    var lx = 0, lz = 0.9;
    return { x: kasaGroup.position.x + lx * Math.cos(kasaGroup.rotation.y) + lz * Math.sin(kasaGroup.rotation.y), z: kasaGroup.position.z - lx * Math.sin(kasaGroup.rotation.y) + lz * Math.cos(kasaGroup.rotation.y) };
  }

  function trySpawnNpc() {
    if (!cafeOpen || npcs.length >= NPC_MAX) return;
    var freeIdx = -1;
    for (var i = 0; i < placedItems.length; i++) {
      var it = placedItems[i];
      var def = SHOP_ITEMS.filter(function (s) { return s.id === it.type; })[0];
      if (def && def.seat && !occupiedTables[i]) { freeIdx = i; break; }
    }
    if (freeIdx === -1) return;
    occupiedTables[freeIdx] = true;
    var seat = seatWorldPos(placedItems[freeIdx]);
    var tier = (SHOP_ITEMS.filter(function (s) { return s.id === placedItems[freeIdx].type; })[0] || {}).tier || 1;
    var mesh = buildNpcMesh();
    mesh.position.set(DOOR_POS.x, 0, DOOR_POS.z);
    scene.add(mesh);
    npcs.push({ mesh: mesh, state: "toTable", tableIdx: freeIdx, tier: tier, tx: seat.x, tz: seat.z, timer: 0 });
  }

  function moveNpcToward(npc, tx, tz, dt) {
    var dx = tx - npc.mesh.position.x, dz = tz - npc.mesh.position.z;
    var dist = Math.hypot(dx, dz);
    if (dist < 0.12) return true; // vardı
    npc.mesh.position.x += (dx / dist) * NPC_SPEED * dt;
    npc.mesh.position.z += (dz / dist) * NPC_SPEED * dt;
    npc.mesh.rotation.y = Math.atan2(dx, dz);
    return false;
  }

  function updateNpcs(dt) {
    npcSpawnTimer += dt;
    if (npcSpawnTimer >= NPC_SPAWN_INTERVAL) { npcSpawnTimer = 0; trySpawnNpc(); }

    for (var i = npcs.length - 1; i >= 0; i--) {
      var npc = npcs[i];
      if (npc.state === "toTable") {
        if (moveNpcToward(npc, npc.tx, npc.tz, dt)) { npc.state = "sitting"; npc.timer = NPC_SIT_MIN + Math.random() * (NPC_SIT_MAX - NPC_SIT_MIN); }
      } else if (npc.state === "sitting") {
        npc.timer -= dt;
        if (npc.timer <= 0) {
          var kf = kasaWorldFrontPos();
          npc.state = "toKasa"; npc.tx = kf.x; npc.tz = kf.z;
        }
      } else if (npc.state === "toKasa") {
        if (moveNpcToward(npc, npc.tx, npc.tz, dt)) {
          var amount = NPC_PAYOUT_BY_TIER[npc.tier] || 20;
          setMoney(money + amount);
          showActionMsg("+" + amount + " ₺ (müşteri ödedi)");
          npc.state = "paying"; npc.timer = 0.8;
        }
      } else if (npc.state === "paying") {
        npc.timer -= dt;
        if (npc.timer <= 0) { npc.state = "leaving"; npc.tx = DOOR_POS.x; npc.tz = DOOR_POS.z; }
      } else if (npc.state === "leaving") {
        if (moveNpcToward(npc, npc.tx, npc.tz, dt)) {
          delete occupiedTables[npc.tableIdx];
          scene.remove(npc.mesh);
          npcs.splice(i, 1);
        }
      }
    }
  }

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
  var lookStartX = 0, lookStartY = 0, lookStartTime = 0, lookTotalMove = 0;

  mount.style.touchAction = "none";
  mount.addEventListener("pointerdown", function (e) {
    if (lookPointerId !== null) return;
    lookPointerId = e.pointerId;
    lookLastX = e.clientX; lookLastY = e.clientY;
    lookStartX = e.clientX; lookStartY = e.clientY;
    lookStartTime = Date.now(); lookTotalMove = 0;
    try { mount.setPointerCapture(e.pointerId); } catch (err) {}
  });
  mount.addEventListener("pointermove", function (e) {
    if (e.pointerId !== lookPointerId) return;
    var dx = e.clientX - lookLastX, dy = e.clientY - lookLastY;
    lookLastX = e.clientX; lookLastY = e.clientY;
    lookTotalMove += Math.abs(dx) + Math.abs(dy);
    yaw -= dx * LOOK_SENS;
    pitch -= dy * LOOK_SENS;
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  });
  function lookPointerEnd(e) {
    if (e.pointerId !== lookPointerId) return;
    // Kısa/hareketsiz bir dokunuş = "tap" — ekran ortasındaki nişangahla
    // etkileşim dener (duvar düğmesi vb). Sürükleme (bakış döndürme) ise
    // etkileşimi TETİKLEMEZ, sadece uzun/az hareketli dokunuşlar sayılır.
    if (lookTotalMove < 10 && (Date.now() - lookStartTime) < 350) tryInteract();
    lookPointerId = null;
  }
  mount.addEventListener("pointerup", lookPointerEnd);
  mount.addEventListener("pointercancel", lookPointerEnd);
  mount.addEventListener("pointerleave", lookPointerEnd);

  // ---- döngü ----
  var last = performance.now();
  var walkPhase = 0;
  function tick(now) {
    try {
      tickInner(now);
    } catch (e) {
      console.error("[iOZ Cafe 3D] tick hatası, bu kare atlanıyor ama oyun devam ediyor:", e);
    }
    requestAnimationFrame(tick);
  }

  function tickInner(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    var mx = moveVec.x, my = moveVec.y;
    if (!joystickActive) {
      mx = (keys["d"] || keys["arrowright"] ? 1 : 0) - (keys["a"] || keys["arrowleft"] ? 1 : 0);
      my = (keys["w"] || keys["arrowup"] ? 1 : 0) - (keys["s"] || keys["arrowdown"] ? 1 : 0);
    }

    var isMoving = mx !== 0 || my !== 0;

    // Kameranın o anki bakış yönüne (yaw) göre ileri/sağ vektörleri — hem
    // hareket hem yerleştirme modundaki hayalet istasyon için kullanılıyor.
    var fwdX = -Math.sin(yaw), fwdZ = -Math.cos(yaw);
    var rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);

    if (isMoving) {
      var len = Math.hypot(mx, my) || 1;
      var nx = (mx / len) * Math.min(1, len); // sağ (+) / sol (-) — kameraya göre
      var ny = (my / len) * Math.min(1, len); // ileri (+) / geri (-) — kameraya göre

      // Hareket artık SABİT dünya eksenine değil, kameranın o anki bakış
      // yönüne (yaw) göre hesaplanıyor — böylece "sağ/ileri" her zaman
      // ekranda gördüğün sağ/ileri ile eşleşiyor, bakış döndükçe de doğru
      // kalıyor. (Önceki sürümdeki sağ/sol tersliği buradan kaynaklanıyordu.)
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

    // Yerleştirme modu: hayalet istasyon her zaman oyuncunun PLACEMENT_DIST
    // kadar önünde durur — yürüyüp bakış yönünü değiştirerek konumlandırıyoruz.
    if (placementMode && placementGroup) {
      var gx = camera.position.x + fwdX * PLACEMENT_DIST;
      var gz = camera.position.z + fwdZ * PLACEMENT_DIST;
      var pLimX = HW - 0.3, pLimZ = HD - 0.3;
      placementGroup.position.x = Math.max(-pLimX, Math.min(pLimX, gx));
      placementGroup.position.z = Math.max(-pLimZ, Math.min(pLimZ, gz));
      placementGroup.rotation.y = yaw + placementRotOffset;
    }

    // NPC güncellemesi try/catch içinde — beklenmedik bir hata artık TÜM
    // render döngüsünü durduramaz (önceki donma şikayeti buradan olabilirdi;
    // kesin kök nedeni benim ortamımda tekrar üretemedim ama bu, kökeni ne
    // olursa olsun oyunun donmasını engelleyen kalıcı bir güvence).
    try { updateNpcs(dt); } catch (e) { console.error("[iOZ Cafe 3D] updateNpcs hata verdi, atlanıyor:", e); }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);

  // ---- ilk render ----
  setMoney(money);
  setDay(day);
  setVip(vip);
  setAdQuickLeft(adQuickLeft);
  setCafeOpen(cafeOpen);
  updateChatInputState();
  renderShop();
})();
