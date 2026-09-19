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
  var CAFE_NAME_KEY = "netcafe3d_cafe_name";
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
    { id: "bilgisayar90", name: "iOZ Old 90", price: 500, rating: 1.5, seat: false, tier: 2, computer: true, icon: '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>', build: function (onTable) { return build90ComputerMesh(onTable); } },
    // 3. SEVİYE — fiyatlar belirtilmedi, tier 2'den (200/200/500) mantıklı
    // bir artışla VARSAYILDI, birlikte ayarlayabiliriz.
    { id: "sandalye2000", name: "iOZ Classic 2000 Sandalye", price: 800, rating: 2, seat: false, tier: 3, icon: '<path d="M6 3v11M18 3v11M6 14h12M8 14v7M16 14v7"/>', build: function () { return build2000ChairMesh(); } },
    { id: "masa2000", name: "iOZ Classic 2000 Masa", price: 800, rating: 2, seat: true, tier: 3, icon: '<path d="M3 9h18M6 9v10M18 9v10"/>', build: function () { return build2000TableMesh(); } },
    { id: "bilgisayar2000", name: "iOZ Classic 2000 Bilgisayar", price: 1500, rating: 2, seat: false, tier: 3, computer: true, icon: '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>', build: function (onTable) { return build2000ComputerMesh(onTable); } },
    // 4. SEVİYE — fiyatlar yine belirtilmedi, tier 3'ten (800/800/1500) mantıklı
    // bir artışla VARSAYILDI, birlikte ayarlayabiliriz.
    { id: "sandalye2010", name: "iOZ 2010 Sandalye", price: 3000, rating: 3, seat: false, tier: 4, icon: '<path d="M6 3v11M18 3v11M6 14h12M8 14v7M16 14v7"/>', build: function () { return build2010ChairMesh(); } },
    { id: "masa2010", name: "iOZ 2010 Masa", price: 3000, rating: 3, seat: true, tier: 4, icon: '<path d="M3 9h18M6 9v10M18 9v10"/>', build: function () { return build2010TableMesh(); } },
    { id: "bilgisayar2010", name: "iOZ 2010 Bilgisayar", price: 6000, rating: 3, seat: false, tier: 4, computer: true, icon: '<path d="M3 4h18v12H3z"/><path d="M8 20h8M12 16v4"/>', build: function (onTable) { return build2010ComputerMesh(onTable); } }
  ];
  // "seat: true" olan parçalar (masalar) — otomatik müşteriler oturacak yer
  // olarak bunları kullanıyor. tier, müşterinin ne kadar ödeyeceğini belirler
  // (bkz. NPC_PAYOUT_BY_TIER) — bu ödeme miktarları HENÜZ senden net bir sayı
  // gelmediği için varsayım, birlikte ayarlayabiliriz.
  var NPC_PAYOUT_BY_TIER = { 1: 20, 2: 60, 3: 130, 4: 260 }; // 3-4. seviyeler için varsayım, birlikte ayarlanabilir
  var PLACED_ITEMS_MAX = 60; // oyun/dekor eklenince mobilya ile yer paylaşmasınlar diye 24'ten yükseltildi

  // ---- Oyunlar (dükkan puanını yükseltir) — TELİFSİZ, uydurma isimler -----
  // Tek bir "arcade dolabı" modeli, her oyun için sadece renk/isim değişiyor
  // (18 farklı 3D model çizmek yerine — görsel çeşitlilik renkle sağlanıyor).
  var GAMES_LIST = [
    ["Uzay Avcısı", 150, 0x4fd1c5], ["Hız Krallığı", 190, 0xf6ad55], ["Ejder Vadisi", 230, 0x9f7aea],
    ["Piksel Savaşları", 270, 0x68d391], ["Ay Işığı Yarışı", 310, 0x63b3ed], ["Gölge Ninja", 350, 0x718096],
    ["Robot Arena", 400, 0xfc8181], ["Yıldız Tozu", 450, 0xf6e05e], ["Kaptan Fırtına", 500, 0x4299e1],
    ["Zombi Kaçışı", 550, 0x38a169], ["Renk Patlaması", 600, 0xed64a6], ["Kutu Kahraman", 650, 0xed8936],
    ["Gizemli Orman", 700, 0x48bb78], ["Turbo Sürücü", 750, 0xe53e3e], ["Kristal Avcısı", 800, 0x805ad5],
    ["Demir Yumruk", 850, 0xa0aec0], ["Bulut Koşucusu", 900, 0x4fd1c5], ["Sonsuz Labirent", 950, 0x2b6cb0]
  ];
  GAMES_LIST.forEach(function (g, idx) {
    SHOP_ITEMS.push({
      id: "game" + idx, name: g[0], price: g[1], rating: null, seat: false, tier: 0, game: true,
      icon: '<rect x="4" y="5" width="16" height="12" rx="1"/><path d="M9 20h6M12 17v3"/>',
      build: function () { return buildArcadeCabinetMesh(g[2], g[0]); }
    });
  });

  // ---- Duvar kağıtları / çerçeveler / neon ışıklar (dekor — puanı yükseltir) ----
  var WALLPAPER_LIST = [["Mercan Duvar Kağıdı", 120, 0xff8a65], ["Okyanus Duvar Kağıdı", 120, 0x4fc3f7], ["Orman Duvar Kağıdı", 120, 0x81c784]];
  WALLPAPER_LIST.forEach(function (w, idx) {
    SHOP_ITEMS.push({
      id: "wallpaper" + idx, name: w[0], price: w[1], rating: null, seat: false, tier: 0, decor: true,
      icon: '<rect x="3" y="4" width="18" height="16" rx="1"/>',
      build: function () { return buildWallpaperMesh(w[2]); }
    });
  });
  var FRAME_LIST = [["Turkuaz Çerçeve", 180, ACCENT], ["Kırmızı Çerçeve", 180, 0xff4d6d], ["Sarı Çerçeve", 180, 0xffd23f]];
  FRAME_LIST.forEach(function (fr, idx) {
    SHOP_ITEMS.push({
      id: "frame" + idx, name: fr[0], price: fr[1], rating: null, seat: false, tier: 0, decor: true,
      icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="7" y="7" width="10" height="10"/>',
      build: function () { return buildFrameMesh(fr[2]); }
    });
  });
  var NEON_LIST = [["Neon Şerit — Mavi", 250, NEON_BLUE], ["Neon Şerit — Pembe", 250, 0xff2fd6]];
  NEON_LIST.forEach(function (nl, idx) {
    SHOP_ITEMS.push({
      id: "neonlight" + idx, name: nl[0], price: nl[1], rating: null, seat: false, tier: 0, decor: true,
      icon: '<path d="M4 12h16" stroke-width="3"/>',
      build: function () { return buildNeonStripMesh(nl[2]); }
    });
  });
  // ---- Oto temizlik robotu — kirliliği kendiliğinden temizler ------------
  SHOP_ITEMS.push({
    id: "cleanrobot", name: "Oto Temizlik Robotu", price: 1200, rating: null, seat: false, tier: 0, robot: true,
    icon: '<circle cx="12" cy="13" r="7"/><path d="M9 13h6M12 6v2"/>',
    build: function () { return buildCleanRobotMesh(); }
  });

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
  var money = readNum(MONEY_KEY, 1000000); // TEST AMAÇLI: 100 → 1.000.000. Cihazında zaten kayıt varsa bu yeni varsayılan uygulanmaz — uygulamanın verisini temizlemen (Android Ayarlar → Uygulamalar → Depolama → Verileri Temizle) ya da kaldırıp tekrar kurman gerekir.
  var day = readNum(DAY_KEY, 1);
  var vip = readNum(VIP_TEST_KEY, 1) === 1; // TEST AMAÇLI: varsayılan artık açık (VIP)
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

    // Dükkan puanı — mobilya kalitesi + oyun/dekor sayısı + kirlilik (bkz.
    // computeShopRating). Bu formül ilk taslak, birlikte ince ayar yapabiliriz.
    $("shop-rating").innerHTML = starsHtml(computeShopRating(), "shoprating") + '<span class="shop-rating-num">' + computeShopRating().toFixed(1) + '/5</span>';

    var tiers = [
      { label: "iOZ Old — 1980 Serisi", items: SHOP_ITEMS.filter(function (i) { return i.tier === 1; }) },
      { label: "iOZ Old 90 — 90'lı Yıllar Serisi", items: SHOP_ITEMS.filter(function (i) { return i.tier === 2; }) },
      { label: "iOZ Classic 2000 Serisi", items: SHOP_ITEMS.filter(function (i) { return i.tier === 3; }) },
      { label: "iOZ 2010 Serisi", items: SHOP_ITEMS.filter(function (i) { return i.tier === 4; }) },
      { label: "Duvar Kağıtları & Çerçeveler & Neon", items: SHOP_ITEMS.filter(function (i) { return i.decor; }) },
      { label: "Ekipman", items: SHOP_ITEMS.filter(function (i) { return i.robot; }) },
      { label: "Oyunlar (dükkan puanını yükseltir)", items: SHOP_ITEMS.filter(function (i) { return i.game; }) }
    ];
    tiers.forEach(function (tier) {
      if (!tier.items.length) return;
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
          '<div class="shop-card-icon">' + (item.thumb ? '<img src="' + item.thumb + '" alt="" />' : ('<svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + item.icon + '</svg>')) + '</div>' +
          '<div class="shop-card-name">' + item.name + '</div>' +
          (item.rating != null ? starsHtml(item.rating, item.id) : '') +
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
  var actionMsgTimer = null;

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

  // K/M kısaltmalı para formatı — sohbette birinin profiline basınca kaç
  // parası olduğunu bu formatta gösteriyoruz.
  function formatMoneyShort(n) {
    n = n || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }
  function showProfilePopup(name, moneyRaw) {
    $("profile-name").textContent = name;
    $("profile-money").textContent = formatMoneyShort(moneyRaw) + " ₺";
    $("profile-popup").hidden = false;
  }
  $("btn-profile-close").addEventListener("click", function () { $("profile-popup").hidden = true; });

  function appendChatMessage(data, clientId) {
    var box = $("chat-messages");
    var empty = box.querySelector(".chat-empty");
    if (empty) empty.remove();
    var row = document.createElement("div");
    row.className = "chat-msg";
    var tag = shortTag(clientId);
    row.innerHTML = '<span class="name clickable"></span><span class="tag"></span>: <span class="text"></span>';
    var nameEl = row.querySelector(".name");
    nameEl.textContent = (data && data.name) || "?";
    row.querySelector(".tag").textContent = tag ? "#" + tag : "";
    row.querySelector(".text").textContent = (data && data.text) || "";
    nameEl.addEventListener("click", function () {
      showProfilePopup((data && data.name) || "?", data && data.money);
    });
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
        chatChannel.presence.enter({ name: playerName || "Misafir", money: money }).catch(function () {});
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
      if (chatChannel) chatChannel.presence.update({ name: playerName, money: money }).catch(function () {});
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
    chatChannel.publish("msg", { text: text.slice(0, 240), name: playerName || ("Misafir#" + shortTag(getPlayerId())), money: money });
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
  scene.background = new THREE.Color(0x161c20);
  scene.fog = new THREE.Fog(0x161c20, 11, 24);

  var camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 100);
  camera.position.set(0, EYE_HEIGHT, 3.2);

  // ---- etkileşim sistemi — ekran ortasındaki beyaz nokta neyi gösteriyorsa
  // (ışık düğmesi, kafe tabelası düğmesi vb.) ona bakıp dokununca tetiklenir.
  // DÜZELTME: önceki sürüm küçük düğme mesh'lerine piksel-hassasiyetinde
  // raycast atıyordu — mobilde küçük bir nesneye tam nişan almak çok zordu,
  // o yüzden düğmeler "çalışmıyor" gibi görünüyordu. Artık daha toleranslı:
  // kabaca o yöne bakıyorsan (dar bir koni içinde) ve yeterince yakınsan
  // tetikleniyor.
  var interactables = []; // {mesh, range, action}
  function registerInteractable(mesh, range, action) { interactables.push({ mesh: mesh, range: range, action: action }); }
  function unregisterInteractable(mesh) {
    for (var i = interactables.length - 1; i >= 0; i--) { if (interactables[i].mesh === mesh) interactables.splice(i, 1); }
  }
  function tryInteract() {
    var dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    var best = null, bestDot = 0.55; // ~55°'lik geniş bir koni — nişan almayı kolaylaştırmak için
    interactables.forEach(function (it) {
      var toObj = new THREE.Vector3(it.mesh.position.x - camera.position.x, it.mesh.position.y - camera.position.y, it.mesh.position.z - camera.position.z);
      var dist = toObj.length();
      if (dist > it.range || dist < 0.0001) return;
      toObj.multiplyScalar(1 / dist);
      var dot = dir.x * toObj.x + dir.y * toObj.y + dir.z * toObj.z;
      if (dot > bestDot) { bestDot = dot; best = it; }
    });
    // DÜZELTME: önceki sürümde hiçbir geri bildirim yoktu — dokunuş algılanıp
    // algılanmadığını, bir şeye isabet edip etmediğini anlamanın yolu yoktu.
    // Artık HER dokunuşta bir mesaj çıkıyor (ya "ne yaptığını" ya da "hiçbir
    // şeye dokunmadığını" söylüyor).
    if (best) { best.action(); }
    else { showActionMsg("Etkileşecek bir şey yok (daha yakına git / doğrudan bak)"); }
  }

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // performans için düşürüldü ("hafif kasıyor" şikayeti üzerine)
  mount.appendChild(renderer.domElement);

  // İSTENDİ: oda çok karanlıktı, aydınlattık — ama sonra "hafif kasıyor" +
  // zemin neredeyse beyaza yanıyor şikayeti geldi. 5 nokta ışığı (her biri
  // gerçek zamanlı gölgesiz de olsa pahalı) performansı düşürüyordu VE
  // ambient 0.95 ile zemin/rengi yıkıyordu. Denge için: 3 lambaya indirildi,
  // ambient biraz düşürüldü — hâlâ eskisinden çok daha aydınlık ama renkler
  // artık yıkanmıyor, performans da daha iyi.
  var AMBIENT_ON = 0.78, AMBIENT_OFF = 0.16;
  var ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_ON);
  scene.add(ambientLight);
  var ceilingLamps = [];
  [[0, 0], [-3.4, -2.6], [3.4, 2.6]].forEach(function (p) {
    var lamp = new THREE.PointLight(0xfff2d6, 0.85, 13, 2);
    lamp.position.set(p[0], ROOM_H - 0.2, p[1]);
    scene.add(lamp);
    ceilingLamps.push(lamp);
  });
  // NOT: köşedeki turkuaz "accentLight" kaldırıldı — "her şey mavi/neon
  // olmuş" şikayetinin büyük kısmı buradan geliyordu, oda artık sadece
  // sıcak tavan lambalarıyla aydınlanıyor. Neon renk sadece ekranlar ve
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
    ceilingLamps.forEach(function (l) { l.visible = on; });
    ambientLight.intensity = on ? AMBIENT_ON : AMBIENT_OFF;
    bulb.material = on ? bulbOnMat : bulbOffMat;
  }
  // NOT: ışık artık HUD butonuyla değil, duvardaki fiziksel düğmeye
  // (nişangahla bakıp dokunarak) açılıp kapanıyor — bkz. lightSwitch/
  // registerInteractable, aşağıda kapı/tabela bölümünde.

  // İSTENDİ: zemin açık mavi, duvarlar ve tavan koyu/kapalı mavimsi tonlarda
  var floorMat = new THREE.MeshStandardMaterial({ color: 0x6fb3dc, roughness: 0.8 }); // biraz koyultuldu — parlak ışıkla neredeyse beyaza yanıyordu
  var wallMat = new THREE.MeshStandardMaterial({ color: 0x2b3a4a, roughness: 0.9 });
  var ceilMat = new THREE.MeshStandardMaterial({ color: 0x212d3a, roughness: 1 });
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
  var monitorMat = new THREE.MeshStandardMaterial({ color: 0x23282d, roughness: 0.5 });
  var screenMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.6, side: THREE.DoubleSide });

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
  var mat90Screen = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.7, side: THREE.DoubleSide });
  var mat90Accent = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.9 });

  // Modern, dönebilir ofis koltuğu hissi — krom tekerlekli taban, yuvarlak
  // dolgulu koltuk, kavisli sırt desteği.
  // Düzgün bir ofis/oyuncu koltuğu — önceki sürümdeki çift döndürülmüş yarım
  // silindir sırt tuhaf/bozuk görünüyordu, düz kutulara çevrildi: net bir
  // sırt, kolçaklar, tekerlekli krom taban.
  function build90ChairMesh() {
    var g = new THREE.Group();
    var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 16), mat90Frame);
    seat.position.set(0, 0.46, 0);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.08), mat90Frame);
    back.position.set(0, 0.72, -0.2);
    back.rotation.x = -0.08;
    g.add(back);
    [-1, 1].forEach(function (side) {
      var armrest = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.32), mat90Chrome);
      armrest.position.set(side * 0.24, 0.58, 0.02);
      g.add(armrest);
      var armPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.04), mat90Chrome);
      armPost.position.set(side * 0.24, 0.51, 0.02);
      g.add(armPost);
    });
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), mat90Chrome);
    pole.position.set(0, 0.24, 0);
    g.add(pole);
    var wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), mat90Chrome);
    wheelHub.position.set(0, 0.05, 0);
    g.add(wheelHub);
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2;
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.16), mat90Chrome);
      leg.position.set(Math.cos(ang) * 0.1, 0.035, Math.sin(ang) * 0.1);
      leg.rotation.y = -ang;
      g.add(leg);
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), mat90Chrome);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(Math.cos(ang) * 0.16, 0.025, Math.sin(ang) * 0.16);
      g.add(wheel);
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

  // ---- "iOZ Classic 2000" serisi — en üst kalite, en modern görünüm -------
  var mat2000Body = new THREE.MeshStandardMaterial({ color: 0xe9ecef, roughness: 0.35, metalness: 0.12 }); // beyaz/gümüş plastik
  var mat2000Dark = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.4, metalness: 0.2 });
  var mat2000Accent = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5 });
  var mat2000Screen = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x9fe8ff, emissiveIntensity: 0.9, side: THREE.DoubleSide });

  // Modern, alçak profilli bir ofis koltuğu — file kumaş sırt hissi için
  // ince yatay şeritler, düz çizgili kollar.
  function build2000ChairMesh() {
    var g = new THREE.Group();
    var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.07, 20), mat2000Dark);
    seat.position.set(0, 0.46, 0);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.07), mat2000Dark);
    back.position.set(0, 0.76, -0.21);
    back.rotation.x = -0.1;
    g.add(back);
    var backAccent = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.075), mat2000Accent);
    backAccent.position.set(0, 0.9, -0.205);
    backAccent.rotation.x = -0.1;
    g.add(backAccent);
    [-1, 1].forEach(function (side) {
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.3), mat2000Body);
      arm.position.set(side * 0.25, 0.58, 0.02);
      g.add(arm);
      var armPost = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.035), mat2000Body);
      armPost.position.set(side * 0.25, 0.51, 0.02);
      g.add(armPost);
    });
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), mat2000Body);
    pole.position.set(0, 0.24, 0);
    g.add(pole);
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2;
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.17), mat2000Body);
      leg.position.set(Math.cos(ang) * 0.1, 0.035, Math.sin(ang) * 0.1);
      leg.rotation.y = -ang;
      g.add(leg);
    }
    return g;
  }

  // Beyaz/gümüş, düz kenarlı modern masa — camsız, temiz çizgiler, ince
  // turkuaz aydınlık kenar.
  function build2000TableMesh() {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.04, 0.62), mat2000Body);
    top.position.set(0, 0.76, 0);
    g.add(top);
    var edge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.015, 0.02), mat2000Accent);
    edge.position.set(0, 0.74, 0.3);
    g.add(edge);
    [[-0.5, -0.27], [0.5, -0.27], [-0.5, 0.27], [0.5, 0.27]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.73, 0.05), mat2000Dark);
      leg.position.set(p[0], 0.365, p[1]);
      g.add(leg);
    });
    var backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.03), mat2000Accent);
    backPlate.position.set(0, 0.6, -0.3);
    g.add(backPlate);
    return g;
  }

  // "Diğer bilgisayarlardan daha iyi görünsün" istendi: düz panel LCD monitör
  // (CRT şişkinliği yok), ince kasa, temiz 2000'ler sonrası PC tasarımı —
  // üçünün arasında en modern/kaliteli siluet bu.
  function build2000ComputerMesh(onTable) {
    var g = new THREE.Group();
    var baseY = onTable ? 0 : 0.42;
    if (!onTable) {
      var tower = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.4), mat2000Body);
      tower.position.set(0.26, 0.23, 0);
      g.add(tower);
      var towerAccent = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.4), mat2000Accent);
      towerAccent.position.set(0.26, 0.46, 0);
      g.add(towerAccent);
    }
    var monY = onTable ? 0.28 : 0.7;
    var screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.025), mat2000Dark);
    screenFrame.position.set(0, monY, -0.02);
    g.add(screenFrame);
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.28), mat2000Screen);
    screen.position.set(0, monY, -0.006);
    g.add(screen);
    var neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.03), mat2000Body);
    neck.position.set(0, monY - 0.22, -0.02);
    g.add(neck);
    var standBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.14), mat2000Body);
    standBase.position.set(0, baseY, -0.02);
    g.add(standBase);
    var keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.13), mat2000Body);
    keyboard.position.set(0, baseY + (onTable ? 0.02 : 0), 0.2);
    g.add(keyboard);
    return g;
  }

  // ---- "iOZ 2010" serisi — siyaha yakın, 2010'ların "gaming" ruhu ---------
  var mat2010Body = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.3 }); // neredeyse siyah
  var mat2010Dark = new THREE.MeshStandardMaterial({ color: 0x0a0b0d, roughness: 0.3, metalness: 0.4 });
  var mat2010Accent = new THREE.MeshStandardMaterial({ color: 0xff2f4d, emissive: 0xff2f4d, emissiveIntensity: 0.9 }); // 2010'lar "gaming" kırmızısı
  var mat2010Screen = new THREE.MeshStandardMaterial({ color: 0x5fe0ff, emissive: 0x5fe0ff, emissiveIntensity: 1.0, side: THREE.DoubleSide });

  function build2010ChairMesh() {
    var g = new THREE.Group();
    var seat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.08, 20), mat2010Dark);
    seat.position.set(0, 0.46, 0);
    g.add(seat);
    var back = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.08), mat2010Dark);
    back.position.set(0, 0.78, -0.22);
    back.rotation.x = -0.1;
    g.add(back);
    var backAccent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.085), mat2010Accent);
    backAccent.position.set(0, 0.78, -0.215);
    backAccent.rotation.x = -0.1;
    g.add(backAccent);
    [-1, 1].forEach(function (side) {
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.32), mat2010Body);
      arm.position.set(side * 0.26, 0.59, 0.02);
      g.add(arm);
      var armPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), mat2010Body);
      armPost.position.set(side * 0.26, 0.52, 0.02);
      g.add(armPost);
    });
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), mat2010Body);
    pole.position.set(0, 0.24, 0);
    g.add(pole);
    for (var i = 0; i < 5; i++) {
      var ang = (i / 5) * Math.PI * 2;
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.18), mat2010Body);
      leg.position.set(Math.cos(ang) * 0.1, 0.035, Math.sin(ang) * 0.1);
      leg.rotation.y = -ang;
      g.add(leg);
    }
    return g;
  }

  function build2010TableMesh() {
    var g = new THREE.Group();
    var top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.64), mat2010Dark);
    top.position.set(0, 0.76, 0);
    g.add(top);
    var edge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.015, 0.02), mat2010Accent);
    edge.position.set(0, 0.74, 0.31);
    g.add(edge);
    [[-0.52, -0.28], [0.52, -0.28], [-0.52, 0.28], [0.52, 0.28]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.73, 0.05), mat2010Body);
      leg.position.set(p[0], 0.365, p[1]);
      g.add(leg);
    });
    var backPlate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.28, 0.03), mat2010Accent);
    backPlate.position.set(0, 0.6, -0.31);
    g.add(backPlate);
    return g;
  }

  function build2010ComputerMesh(onTable) {
    var g = new THREE.Group();
    var baseY = onTable ? 0 : 0.42;
    if (!onTable) {
      var tower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.42), mat2010Body);
      tower.position.set(0.28, 0.25, 0);
      g.add(tower);
      var towerAccent = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.42), mat2010Accent);
      towerAccent.position.set(0.19, 0.25, 0);
      g.add(towerAccent);
    }
    var monY = onTable ? 0.3 : 0.72;
    var screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.025), mat2010Dark);
    screenFrame.position.set(0, monY, -0.02);
    g.add(screenFrame);
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), mat2010Screen);
    screen.position.set(0, monY, -0.006);
    g.add(screen);
    var neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.03), mat2010Body);
    neck.position.set(0, monY - 0.24, -0.02);
    g.add(neck);
    var standBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.15), mat2010Body);
    standBase.position.set(0, baseY, -0.02);
    g.add(standBase);
    var keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.13), mat2010Body);
    keyboard.position.set(0, baseY + (onTable ? 0.02 : 0), 0.2);
    g.add(keyboard);
    var kbAccent = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.005, 0.01), mat2010Accent);
    kbAccent.position.set(0, baseY + (onTable ? 0.031 : 0.011), 0.14);
    g.add(kbAccent);
    return g;
  }

  // ---- Oyun dolabı (arcade cabinet) — 18 farklı oyun için tek model, renk
  // ve isim değişiyor. Metin çizemediğimiz için isim, ekranın rengiyle
  // birlikte bir "tabela" şeridinde görünüyor (dükkan kartındaki isimle
  // eşleşir).
  var arcadeBodyMat = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.55 });
  function buildArcadeCabinetMesh(color, label) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.55), arcadeBodyMat);
    body.position.set(0, 0.75, 0);
    g.add(body);
    var marquee = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.1), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.8 }));
    marquee.position.set(0, 1.42, 0.24);
    g.add(marquee);
    var screen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.3), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.6, side: THREE.DoubleSide }));
    screen.position.set(0, 1.0, 0.276);
    g.add(screen);
    var panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.62), arcadeBodyMat);
    panel.position.set(0, 0.68, 0.05);
    panel.rotation.x = -0.35;
    g.add(panel);
    g.userData.label = label;
    return g;
  }

  // ---- Duvar kağıdı / çerçeve / neon şerit — hepsi basit, SVG-ruhlu düz -----
  // renkli paneller. Yerleştirme sistemimiz zemine göre çalıştığı için bunlar
  // da (mobilyalar gibi) zeminde duruyor, tam duvara yapışan bir "duvar
  // kaplama" modu şimdilik yok — istersen sıradaki adımda ekleriz.
  function buildWallpaperMesh(color) {
    var g = new THREE.Group();
    var panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.04), new THREE.MeshStandardMaterial({ color: color, roughness: 0.6 }));
    panel.position.set(0, 1.1, 0);
    g.add(panel);
    var stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.2), arcadeBodyMat);
    stand.position.set(0, 0.42, 0.08);
    g.add(stand);
    return g;
  }
  function buildFrameMesh(color) {
    var g = new THREE.Group();
    var border = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.03), new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.4 }));
    border.position.set(0, 1.3, 0);
    g.add(border);
    var inner = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.46), new THREE.MeshStandardMaterial({ color: 0x0d1114 }));
    inner.position.set(0, 1.3, 0.02);
    g.add(inner);
    var stand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.06), arcadeBodyMat);
    stand.position.set(0, 0.5, 0);
    g.add(stand);
    return g;
  }
  function buildNeonStripMesh(color) {
    var g = new THREE.Group();
    var neonMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.2 });
    var strip = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), neonMat);
    strip.position.set(0, 1.6, 0);
    g.add(strip);
    var post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.04), arcadeBodyMat);
    post.position.set(0, 0.8, 0);
    g.add(post);
    return g;
  }

  // ---- Oto temizlik robotu — yuvarlak gövde, dönen üst kapak hissi -------
  function buildCleanRobotMesh() {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.14, 20), new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.4, metalness: 0.2 }));
    body.position.set(0, 0.09, 0);
    g.add(body);
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.02, 20), new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.7 }));
    ring.position.set(0, 0.16, 0);
    g.add(ring);
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
      // "masa2000" eklenince burada unutulmuştu — artık sabit isim listesi
      // yerine SHOP_ITEMS'taki seat:true bayrağına bakıyor, yeni bir masa
      // türü eklenirse burayı güncellemeyi unutsak bile otomatik çalışır.
      var def = SHOP_ITEMS.filter(function (s) { return s.id === p.type; })[0];
      if (!def || !def.seat) return;
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
    var plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.03), switchPlateMat);
    g.add(plate);
    var nub = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.025), switchNubOnMat);
    nub.position.set(0, 0, 0.025);
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
    showActionMsg(on ? "Kafe açıldı ✓" : "Kafe kapandı ✓");
  }
  function toggleCafeOpen() { setCafeOpen(!cafeOpen); }
  // Hem küçük düğmeye HEM tabelanın kendisine dokununca çalışsın diye ikisi
  // de aynı aksiyona kayıtlı — tabela daha büyük/kolay nişan alınan bir
  // hedef, düğmeyi tam bulamayanlar için yedek.
  registerInteractable(cafeSwitch, 2.8, toggleCafeOpen);
  registerInteractable(signGroup, 2.8, toggleCafeOpen);
  registerInteractable(lightSwitch, 2.8, function () {
    setLightOn(!lightOn);
    showActionMsg(lightOn ? "Işık açıldı ✓" : "Işık kapandı ✓");
  });


  // =========================================================================
  // Kasa — modern resepsiyon masası, arka duvara yaslı, kapıya bakıyor.
  // NOT: şu an gerçek oyuncuların 3D sahnede görünmesini sağlayan bir sistem
  // yok (chat var ama ortak avatarlar henüz yok) — kasa "girenleri görme"
  // burada şimdilik sadece fiziksel konum/bakış açısı anlamına geliyor.
  // =========================================================================
  var kasaDeskMat = new THREE.MeshStandardMaterial({ color: 0x4a5157, roughness: 0.65, metalness: 0.08 });
  var kasaChairMat = new THREE.MeshStandardMaterial({ color: 0x30363c, roughness: 0.6, metalness: 0.05 });
  var kasaTrimMat = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 0.8 });
  var kasaScreenMat = new THREE.MeshStandardMaterial({ color: NEON_BLUE, emissive: NEON_BLUE, emissiveIntensity: 1.1, side: THREE.DoubleSide });

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
  var kasaMonitor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.04), kasaChairMat);
  kasaMonitor.position.set(0, 1.0, -0.05);
  kasaGroup.add(kasaMonitor);
  var kasaScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.24), kasaScreenMat);
  kasaScreen.position.set(0, 1.0, -0.07);
  kasaScreen.rotation.y = Math.PI;
  kasaGroup.add(kasaScreen);
  // görevli sandalyesi — duvar tarafında (-Z), masanın arkasında
  // Görevli sandalyesi — düz iOZ Old sandalyeyle KARIŞMASIN diye kendine
  // özgü bir "yönetici koltuğu" görünümü: tekerlekli krom taban + kolçaklar.
  var kasaChairSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.07, 16), kasaChairMat);
  kasaChairSeat.position.set(0, 0.46, -0.6);
  kasaGroup.add(kasaChairSeat);
  var kasaChairBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.07), kasaChairMat);
  kasaChairBack.position.set(0, 0.75, -0.82);
  kasaGroup.add(kasaChairBack);
  [-1, 1].forEach(function (side) {
    var arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), kasaTrimMat);
    arm.position.set(side * 0.24, 0.58, -0.58);
    kasaGroup.add(arm);
  });
  var kasaChairPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 10), kasaTrimMat);
  kasaChairPole.position.set(0, 0.24, -0.6);
  kasaGroup.add(kasaChairPole);

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
  var NPC_SHIRT_COLORS = [0xe07a5f, 0x4d8b6f, 0xd9a441, 0x3d5a80, 0xb5484f, 0x6b5b95];
  var npcs = [];
  var occupiedTables = {}; // placedItems index -> true

  // ---- kirlilik (dükkan puanını düşürür) ----------------------------------
  // Her müşterinin masadan kasaya doğru yola çıkışında (5-10 müşteriden 1'i,
  // ortalama 1/7) yere bir kirlilik lekesi bırakma ihtimali var. Fırçayla
  // (aynı bak+dokun etkileşim sistemiyle) temizleniyor; "Oto Temizlik
  // Robotu" alınmışsa periyodik olarak kendiliğinden de temizleniyor.
  var DIRT_CHANCE = 1 / 7;
  var dirtSpots = []; // {mesh, group}
  var dirtMat = new THREE.MeshStandardMaterial({ color: 0x2e2a20, roughness: 1 });
  function spawnDirt(x, z) {
    if (dirtSpots.length >= 10) return; // aşırı kalabalık olmasın
    var g = new THREE.Group();
    var blob = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.015, 10), dirtMat);
    g.add(blob);
    g.position.set(x + (Math.random() - 0.5) * 0.6, 0.01, z + (Math.random() - 0.5) * 0.6);
    scene.add(g);
    var spot = { group: g };
    dirtSpots.push(spot);
    registerInteractable(g, 2.2, function () { cleanDirt(spot); });
  }
  function cleanDirt(spot) {
    var idx = dirtSpots.indexOf(spot);
    if (idx === -1) return;
    scene.remove(spot.group);
    dirtSpots.splice(idx, 1);
    unregisterInteractable(spot.group);
    showActionMsg("Temizlendi ✓");
  }
  var robotCleanTimer = 0;
  var ROBOT_CLEAN_INTERVAL = 18; // saniye
  function updateCleanRobot(dt) {
    var hasRobot = placedItems.some(function (p) { return p.type === "cleanrobot"; });
    if (!hasRobot || dirtSpots.length === 0) return;
    robotCleanTimer += dt;
    if (robotCleanTimer >= ROBOT_CLEAN_INTERVAL) {
      robotCleanTimer = 0;
      cleanDirt(dirtSpots[0]);
    }
  }

  // Dükkan puanı (0-5) — mobilya kalitesi ortalaması + oyun/dekor sayısı
  // bonusu - kirlilik cezası. İlk taslak bir formül, birlikte ince ayar
  // yapılabilir.
  function computeShopRating() {
    var furnitureRatings = placedItems.map(function (p) {
      var def = SHOP_ITEMS.filter(function (s) { return s.id === p.type; })[0];
      return def && def.rating != null ? def.rating : null;
    }).filter(function (r) { return r != null; });
    var furnitureAvg = furnitureRatings.length ? (furnitureRatings.reduce(function (a, b) { return a + b; }, 0) / furnitureRatings.length) : 0;
    var gamesOwned = placedItems.filter(function (p) { var d = SHOP_ITEMS.filter(function (s) { return s.id === p.type; })[0]; return d && d.game; }).length;
    var decorOwned = placedItems.filter(function (p) { var d = SHOP_ITEMS.filter(function (s) { return s.id === p.type; })[0]; return d && d.decor; }).length;
    var gamesBonus = Math.min(1, gamesOwned * 0.08);
    var decorBonus = Math.min(1, decorOwned * 0.15);
    var cleanlinessPenalty = Math.min(2, dirtSpots.length * 0.35);
    return Math.max(0, Math.min(5, furnitureAvg + gamesBonus + decorBonus - cleanlinessPenalty));
  }

  var npcSpawnTimer = 0;

  // ---- Minecraft/Roblox tarzı bloklu müşteri karakteri --------------------
  // Önceki sürümde silindir+küreden oluşan soyut bir figürdü, tanınmaz
  // ("neye benzediği belli değil") bulundu. Şimdi kutulardan oluşan, basit
  // bir yüzü olan bloklu bir karakter — Minecraft'ın "Steve" tarzına yakın,
  // bizim ortamımızda (düz BoxGeometry'lerle) en sağlam/net inşa edilebilecek
  // stil bu olduğu için bunu seçtim.
  var npcSkinMat = new THREE.MeshStandardMaterial({ color: 0xe0b48c, roughness: 0.8 });
  var npcPantsMat = new THREE.MeshStandardMaterial({ color: 0x35404a, roughness: 0.8 });
  var npcFaceTexture = (function () {
    var canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#e0b48c"; ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(14, 24, 10, 10);
    ctx.fillRect(40, 24, 10, 10);
    ctx.fillRect(22, 44, 20, 5);
    return new THREE.CanvasTexture(canvas);
  })();
  var npcFaceMat = new THREE.MeshStandardMaterial({ map: npcFaceTexture, roughness: 0.9 });

  function buildNpcMesh() {
    var shirtColor = NPC_SHIRT_COLORS[Math.floor(Math.random() * NPC_SHIRT_COLORS.length)];
    var shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.75 });
    var g = new THREE.Group();

    var headMats = [npcSkinMat, npcSkinMat, npcSkinMat, npcSkinMat, npcFaceMat, npcSkinMat];
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), headMats);
    head.position.set(0, 1.52, 0);
    g.add(head);

    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.38, 0.16), shirtMat);
    torso.position.set(0, 1.18, 0);
    g.add(torso);

    // Kollar/bacaklar artık PIVOT grupları üzerinden — yürüme/oturma
    // animasyonu için kalçadan/omuzdan doğru şekilde dönebilsinler diye.
    var limbs = {};
    [-1, 1].forEach(function (side) {
      var key = side < 0 ? "left" : "right";
      var armPivot = new THREE.Group();
      armPivot.position.set(side * 0.19, 1.37, 0);
      var arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.38, 0.1), shirtMat);
      arm.position.set(0, -0.19, 0);
      armPivot.add(arm);
      g.add(armPivot);
      limbs[key + "Arm"] = armPivot;

      var legPivot = new THREE.Group();
      legPivot.position.set(side * 0.07, 0.42, 0);
      var leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.1), npcPantsMat);
      leg.position.set(0, -0.21, 0);
      legPivot.add(leg);
      g.add(legPivot);
      limbs[key + "Leg"] = legPivot;
    });

    g.userData.head = head;
    g.userData.leftArm = limbs.leftArm;
    g.userData.rightArm = limbs.rightArm;
    g.userData.leftLeg = limbs.leftLeg;
    g.userData.rightLeg = limbs.rightLeg;
    g.userData.animPhase = Math.random() * 10; // hepsi aynı fazda yürümesin diye rastgele başlangıç
    g.userData.baseHeadY = 1.52;
    return g;
  }

  // Minecraft tarzı yürüme (bacak/kol sallama), otururken düzgün bir oturma
  // pozu (bacaklar öne bükülü, gövde alçalmış) ve boşta hafif kafa sallama.
  function animateNpc(npc, dt, moving, sitting) {
    var ud = npc.mesh.userData;
    if (!ud.head) return;
    if (sitting) {
      ud.animPhase += dt * 1.8;
      ud.leftLeg.rotation.x = -1.3;
      ud.rightLeg.rotation.x = -1.3;
      ud.leftArm.rotation.x = 0.15;
      ud.rightArm.rotation.x = 0.15;
      ud.head.position.y = ud.baseHeadY - 0.26 + Math.sin(ud.animPhase) * 0.01;
      npc.mesh.position.y = -0.26;
    } else if (moving) {
      ud.animPhase += dt * 7;
      var swing = Math.sin(ud.animPhase) * 0.55;
      ud.leftLeg.rotation.x = swing;
      ud.rightLeg.rotation.x = -swing;
      ud.leftArm.rotation.x = -swing * 0.7;
      ud.rightArm.rotation.x = swing * 0.7;
      ud.head.position.y = ud.baseHeadY + Math.abs(Math.sin(ud.animPhase * 2)) * 0.015;
      npc.mesh.position.y = 0;
    } else {
      ud.animPhase += dt * 1.5;
      ud.leftLeg.rotation.x *= 0.85; ud.rightLeg.rotation.x *= 0.85;
      ud.leftArm.rotation.x *= 0.85; ud.rightArm.rotation.x *= 0.85;
      ud.head.position.y = ud.baseHeadY + Math.sin(ud.animPhase) * 0.012;
      npc.mesh.position.y = 0;
    }
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
    updateCleanRobot(dt);

    for (var i = npcs.length - 1; i >= 0; i--) {
      var npc = npcs[i];
      var moving = false, sitting = false;
      if (npc.state === "toTable") {
        moving = true;
        if (moveNpcToward(npc, npc.tx, npc.tz, dt)) { npc.state = "sitting"; npc.timer = NPC_SIT_MIN + Math.random() * (NPC_SIT_MAX - NPC_SIT_MIN); }
      } else if (npc.state === "sitting") {
        sitting = true;
        npc.timer -= dt;
        if (npc.timer <= 0) {
          if (Math.random() < DIRT_CHANCE) spawnDirt(npc.mesh.position.x, npc.mesh.position.z);
          var kf = kasaWorldFrontPos();
          npc.state = "toKasa"; npc.tx = kf.x; npc.tz = kf.z;
        }
      } else if (npc.state === "toKasa") {
        moving = true;
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
        moving = true;
        if (moveNpcToward(npc, npc.tx, npc.tz, dt)) {
          delete occupiedTables[npc.tableIdx];
          scene.remove(npc.mesh);
          npcs.splice(i, 1);
          continue;
        }
      }
      animateNpc(npc, dt, moving, sitting);
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
    if (lookTotalMove < 22 && (Date.now() - lookStartTime) < 500) tryInteract();
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

  // ---- dükkan görselleri — soyut çizgi ikon yerine ürünün GERÇEK 3D
  // modelinden küçük bir anlık görüntü alıyoruz (ayrı, ekrana hiç
  // eklenmeyen bir mini sahnede tek seferlik render). Bir sorun olursa
  // (ör. eski bir tarayıcı) sessizce eski çizgi ikona geri düşer.
  function generateShopThumbnails() {
    try {
      var size = 160;
      var tScene = new THREE.Scene();
      var tCamera = new THREE.PerspectiveCamera(35, 1, 0.05, 20);
      var tRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      tRenderer.setSize(size, size);
      tScene.add(new THREE.AmbientLight(0xffffff, 1.2));
      var tLight = new THREE.DirectionalLight(0xffffff, 0.7);
      tLight.position.set(2, 3, 2);
      tScene.add(tLight);

      SHOP_ITEMS.forEach(function (item) {
        var mesh = item.build(false);
        tScene.add(mesh);
        var box = new THREE.Box3().setFromObject(mesh);
        var center = box.getCenter(new THREE.Vector3());
        var sizeVec = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z, 0.2);
        var dist = maxDim * 2.1;
        tCamera.position.set(center.x + dist * 0.55, center.y + dist * 0.55, center.z + dist * 0.7);
        tCamera.lookAt(center);
        tRenderer.render(tScene, tCamera);
        item.thumb = tRenderer.domElement.toDataURL("image/png");
        tScene.remove(mesh);
      });
      tRenderer.dispose();
    } catch (e) {
      console.error("[iOZ Cafe 3D] Dükkan görselleri oluşturulamadı, çizgi ikon kullanılacak:", e);
    }
  }
  generateShopThumbnails();

  // ---- cafe ismi (oyun girişinde bir kez sorulur) ------------------------
  var cafeName = "";
  try { cafeName = localStorage.getItem(CAFE_NAME_KEY) || ""; } catch (e) {}
  function applyCafeName(name) {
    cafeName = name;
    try { document.title = name; } catch (e) {}
    // Sohbet ismi henüz girilmediyse cafe ismini varsayılan yap — girişte
    // bir kez isim sorup sohbette tekrar sormaya gerek kalmasın diye.
    if (!playerName) {
      playerName = name.slice(0, 24);
      try { localStorage.setItem(PLAYER_NAME_KEY, playerName); } catch (e) {}
      $("chat-name-row").hidden = true;
      updateChatInputState();
    }
  }
  if (cafeName) {
    $("cafename-overlay").hidden = true;
    applyCafeName(cafeName);
  }
  $("btn-cafename-confirm").addEventListener("click", function () {
    var v = $("cafename-input").value.trim() || "iOZ Cafe";
    v = v.slice(0, 24);
    try { localStorage.setItem(CAFE_NAME_KEY, v); } catch (e) {}
    applyCafeName(v);
    $("cafename-overlay").hidden = true;
  });

  // ---- ilk render ----
  setMoney(money);
  setDay(day);
  setVip(vip);
  setAdQuickLeft(adQuickLeft);
  setCafeOpen(cafeOpen);
  updateChatInputState();
  renderShop();
})();
