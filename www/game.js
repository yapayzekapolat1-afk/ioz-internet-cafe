/* ==========================================================================
   NET://CAFE — internet cafe simulator
   Vanilla JS, no external dependencies. Designed to be dropped into a
   Capacitor/Cordova "www" folder and packaged as an Android APK.
   ========================================================================== */

(function () {
  "use strict";

  // ======================================================================
  // i18n — Turkish (default) + English. Static HTML text is marked with
  // data-i18n="key" attributes and painted by applyStaticI18n() below.
  // Anything generated dynamically in JS (achievements, shop items, toasts)
  // calls t("key", {vars}) instead of hardcoding a Turkish literal.
  // Language choice lives in localStorage, outside the save file — it's an
  // app-level preference, not cafe progress.
  // ======================================================================
  var LANG_KEY = "netcafe_lang";
  var LANG = "tr";
  try { LANG = localStorage.getItem(LANG_KEY) || "tr"; } catch (e) {}

  var TRANSLATIONS = {
    tr: {
      "boot.subtitle": "İşletme Simülasyonu",
      "update.title": "Güncelleme Gerekli",
      "update.subtitle": "Oyunu oynamaya devam etmek için yeni sürümü indir.",
      "update.button": "Şimdi Güncelle",
      "setup.title": "Cafene bir isim ver",
      "setup.hint": "İşletmenin adı ekranın sol üstünde görünecek.",
      "setup.placeholder": "ör. Cyber Point",
      "setup.startMoney": "Başlangıç bütçesi",
      "setup.readyAtOpen": "Açılışta hazır",
      "setup.readyAtOpenValue": "1 masa · 1 bilgisayar",
      "setup.hours": "Çalışma saatleri",
      "setup.start": "İşletmeyi Aç",

      "achv.unlockedHead": "Başarım Kazandın!",

      "changelog.title": "Yenilikler — Sürüm 5.0",
      "changelog.intro": "Cafeni açtığından beri epey şey değişti, hepsi burada:",
      "changelog.1.b": "Playstion, Araba Sim ve Atari'ye +40 seviye", "changelog.1.t": "— artık çok daha uzun bir yükseltme yolu var.",
      "changelog.2.b": "Donanım Parça Yükseltmeleri", "changelog.2.t": "— bilgisayarların son seviyeye ulaşınca RAM, SSD, ekran kartı ve soğutma sistemiyle daha da güçlensin.",
      "changelog.3.b": "Rebirth bonusu 3 katına çıktı", "changelog.3.t": "— her yeniden doğuş artık çok daha değerli.",
      "changelog.4.b": "10 adet VIP Bilgisayar", "changelog.4.t": "— reklam izleyerek ücretsiz kazanılıyor.",
      "changelog.5.b": "Dükkana 2 yeni ürün", "changelog.5.t": "— Güvenlik Kamera Sistemi ve Online Rezervasyon Sistemi.",
      "changelog.6.b": "Instagram kanalımıza katıl", "changelog.6.t": "— yeni içerikler ve kampanyalardan haberdar ol.",
      "changelog.close": "Kapat",
      "changelog.closeWithCount": "Kapat ({n})",

      "hud.day": "Gün",
      "requests.title": "Gelen İstekler",
      "requests.empty": "Şu an bekleyen müşteri yok",
      "shopbar.addTable": "Masa Ekle",
      "shopbar.addComputer": "Bilgisayar Ekle",
      "shopbar.store": "Dükkan",

      "price.perHour": "₺ / saat",
      "price.nextLevel": "Sonraki Seviye",
      "price.topLevel": "En üst seviye",
      "parts.head": "Donanım Parça Yükseltmeleri",
      "parts.sub": "En üst seviyeye ulaştı. Şimdi tek tek parçalarını yükselterek gelirini daha da artırabilirsin.",
      "parts.installed": "Takıldı ✓",
      "price.save": "Kaydet",
      "price.psTitle": "Playstion",
      "price.carTitle": "Simulator",
      "price.carTitle": "Simülatör",
      "price.arcadeTitle": "Atari",
      "price.tableTitle": "Masa",
      "price.feeSuffix": "Ücreti",
      "price.setHourlyRate": "saatlik ücreti belirle.",
      "price.noConsoleYet": "Bu masada henüz konsol yok, ama ücretini şimdiden ayarlayabilirsin.",
      "price.noCarYet": "Bu kabinde henüz simülatör yok, ama ücretini şimdiden ayarlayabilirsin.",
      "price.noArcadeYet": "Bu dolapta henüz atari yok, ama ücretini şimdiden ayarlayabilirsin.",
      "price.noComputerYet": "Bu masada henüz bilgisayar yok, ama ücretini şimdiden ayarlayabilirsin.",
      "price.fb.tooExpensive": "Çok pahalı.",
      "price.fb.tooExpensiveDesc": "Bu fiyata {name} için kimse oturmaz, masa boş kalır.",
      "price.fb.high": "Yüksek fiyat.",
      "price.fb.highDesc": "Kazanç saati başına iyi ama müşteri az gelir.",
      "price.fb.cheap": "Ucuz.",
      "price.fb.cheapDesc": "Masa sürekli dolar ama saat başı kazancın düşük olur.",
      "price.fb.balanced": "Dengeli fiyat.",
      "price.fb.balancedDesc": "{name} için piyasa değerine yakın.",
      "price.investment": "Yatırım",
      "price.amount": "Tutar",
      "price.table": "Masa",
      "price.computerOld90": "Bilgisayar · İoz Old 90",
      "price.hwUpgrade": "Donanım Yükseltmesi",
      "price.cost": "Maliyet",
      "price.dailyCost": "Günlük gider",
      "price.rentInternet": "Kira + internet hattı",
      "price.ceiling": "Müşteri fiyat tavanı",
      "price.ceilingLimit": "Üst sınır",
      "price.ceilingNote": "Bu tavanın üstünde fiyat verirsen o masaya kimse oturmaz.",
      "price.psTable": "PS Masası",
      "price.psConsole": "İoz Playstion 4 (ilk konsol)",
      "price.carTable": "Simülatör Kabini",
      "price.carConsole": "İoz Racer Basic (ilk simülatör)",
      "price.arcadeTable": "Atari Dolabı",
      "price.arcadeConsole": "İoz Atari Mini (ilk atari)",

      "day.title": "Gün Sonu",
      "day.titleWithNum": "{day}. Gün Sonu",
      "day.sub": "Cafe kapandı. Günün özeti:",
      "day.served": "Hizmet verilen müşteri",
      "day.revenue": "Günlük ciro",
      "day.costs": "Elektrik + internet gideri",
      "day.lost": "Reddedilen / kaçan müşteri",
      "day.net": "Net kâr",
      "day.watchAd": "Reklam İzle ve Devam Et",
      "day.adHint": "Kısa bir reklam sonrası ertesi güne geçersin.",
      "day.adBlocked": "Reklam gösterilemedi, muhtemelen internet bağlantın yok. Ertesi güne geçmek için reklamın gösterilmesi gerekiyor — bağlantını kontrol edip tekrar dene.",

      "ad.pleaseWait": "Lütfen bekleyin",
      "ad.loading": "Reklam yükleniyor…",
      "ad.previewPlaying": "Reklam oynatılıyor (önizleme)",
      "ad.secondsLeft": "{n} sn",
      "ad.unknown": "bilinmiyor",
      "ad.dailyLimitReached": "Bugünlük doldu",
      "ad.reason.noFill": "Reklam envanteri yok (no fill) — Unity Ads şu an bu yerleşim için reklam bulamadı.",
      "ad.reason.initTimeout": "Reklam sistemi hiç yanıt vermedi (25sn) — internet bağlantını kontrol et.",
      "ad.reason.showFailed": "Reklam gösterimi başarısız oldu.",
      "ad.reason.skipped": "Reklam tamamlanmadan kapatıldı.",
      "ad.reason.initFailed": "Unity Ads başlatma hatası — {detail}",
      "ad.reason.generic": "Reklam hatası: {raw}",

      "bankrupt.title": "İşletme İflas Etti",
      "bankrupt.text": "Bütçen tükendi ve ayakta kalacak bir masan kalmadı. Cafe kapandı.",
      "bankrupt.days": "Dayandığın gün",
      "bankrupt.customers": "Toplam müşteri",
      "bankrupt.restart": "Yeniden Başla",

      "store.title": "Dükkan",
      "store.intro": "Kalıcı yükseltmeler satın al, işletmeni büyüt.",
      "store.sectionPs": "İOZ Playstion",
      "store.sectionCar": "İOZ Araba Simülasyonu",
      "store.sectionArcade": "İOZ Oyun Atarisi",
      "store.tabPc": "Bilgisayar",
      "store.tabPs": "Playstion",
      "store.tabCar": "Araba Sim",
      "store.tabArcade": "Oyun Atarisi",
      "store.tabVending": "Otomatlar",
      "store.tabStaff": "Personel",
      "store.tabRebirth": "Rebirth",
      "store.tabUpgrade": "Dükkan Geliştir",
      "store.sectionVending": "Otomatlar",
      "store.sectionStaff": "Personel",
      "store.owned": "Alındı",
      "store.installed": "Kuruldu",

      "rating.title": "Dükkan Puanı",
      "rating.note": "Puan; kaçırdığın müşteri oranına ve temizlikçi tutup tutmadığına göre her gün sonunda yavaşça güncellenir.",
      "rating.cleaner": "Temizlikçi",
      "rating.cleanerYes": "Var · puanı yükseltiyor",
      "rating.cleanerNo": "Yok · puanı düşürüyor",
      "rating.lostToday": "Bugün kaçırılan müşteri",
      "rating.servedToday": "Bugün ağırlanan müşteri",
      "rating.airCon": "Klima",
      "rating.airConYes": "Var · puanı yükseltiyor",
      "rating.airConNo": "Yok",

      "floor.psTableEmpty": "PS Masası",
      "floor.carTableEmpty": "Simülatör Kabini",
      "floor.arcadeTableEmpty": "Atari Dolabı",
      "floor.emptySpot": "Boş Alan",
      "floor.adPcEmpty": "İzle ve Kazan",
      "floor.noConsole": "Konsol yok",
      "floor.noCar": "Simülatör yok",
      "floor.noArcade": "Atari yok",
      "floor.noComputer": "Bilgisayar yok",

      "shop.fiberInternet.name": "Fiber İnternet Altyapısı",
      "shop.fiberInternet.desc": "Tüm masaların fiyat tavanını kalıcı olarak +%25 yükseltir.",
      "shop.airCon.name": "Klima Sistemi",
      "shop.airCon.desc": "Konfor artışı — dükkan puanına kalıcı +1.0 taban bonus ekler.",
      "shop.vipProgram.name": "VIP Üyelik Programı",
      "shop.vipProgram.desc": "Müşterilerin %15'i VIP gelir — fiyat tavanını umursamaz, daha uzun oturur.",
      "shop.loyaltyCard.name": "Sadakat Kart Sistemi",
      "shop.loyaltyCard.desc": "Müşterilerin ortalama kalış süresini uzatır (1-3 saat yerine 2-4 saat).",
      "shop.generator.name": "Jeneratör / Enerji Verimliliği",
      "shop.generator.desc": "Tüm günlük gideri kalıcı olarak %25 azaltır.",
      "shop.adCampaign.name": "Sosyal Medya Reklam Kampanyası",
      "shop.adCampaign.desc": "Müşteri sabrını ve aynı anda bekleyebilecek istek sayısını artırır.",
      "shop.security.name": "Güvenlik Kamera Sistemi",
      "shop.security.desc": "Müşteriler kendini güvende hisseder — dükkan puanına kalıcı +0.5 taban bonus ekler.",
      "shop.onlineReservation.name": "Online Rezervasyon Sistemi",
      "shop.onlineReservation.desc": "Müşteriler önceden yer ayırtır — cafene gelen trafiği kalıcı olarak +%25 daha artırır.",

      "rebirth.title": "Yeniden Doğuş",
      "rebirth.intro": "İşletmeni sıfırlayıp kalıcı bir bonusla yeniden başla. Bonus, yapılan her yeniden doğuşla birikir.",
      "rebirth.currentBonus": "Mevcut kalıcı bonus",
      "rebirth.count": "Yeniden doğuş sayısı",
      "rebirth.locked": "Kilitli — {req}",
      "rebirth.lockedReq": "Tüm masa/bilgisayarları kur ve {day}. güne ulaş",
      "rebirth.button": "Yeniden Doğ",
      "rebirth.confirmTitle": "Emin misin?",
      "rebirth.confirmText": "Kasan, masaların, bilgisayarların, dükkan yükseltmelerin ve gün sayacın sıfırlanacak. Karşılığında kalıcı olarak +%{pct} gelir bonusu kazanacaksın. Başarımların, seviyen ve toplam müşteri sayın korunur. Bu işlem geri alınamaz.",
      "rebirth.confirmYes": "Evet, Yeniden Doğ",
      "rebirth.confirmCancel": "Vazgeç",
      "rebirth.done": "Yeniden doğdun! Kalıcı bonus: +%{pct}",
      "upgrade.intro": "İşletmeni sıfırlayıp sıfırdan, çok daha büyük bir dükkan olarak yeniden aç. Tüm maliyetler ve tüm kazançların kalıcı olarak x{mult} büyür — aynı düzen, çok daha zorlu ve çok daha kazançlı. Başarımların, seviyen, toplam müşteri sayın ve rebirth ilerlemen korunur.",
      "upgrade.introDone": "Dükkanın zaten geliştirildi — tüm maliyetler ve kazançların kalıcı olarak büyütülmüş durumda.",
      "upgrade.multiplier": "Aktif çarpan",
      "upgrade.cost": "Geliştirme bedeli",
      "upgrade.button": "Dükkanı Geliştir",
      "upgrade.confirmText": "Kasan, masaların, bilgisayarların ve dükkan yükseltmelerin sıfırlanacak; {cost} ₺ ödeyip tüm maliyet ve kazançlarını kalıcı olarak x{mult} büyüteceksin. Başarımların, seviyen, toplam müşteri sayın ve rebirth ilerlemen korunur. Bu işlem geri alınamaz.",
      "upgrade.done": "Dükkanın geliştirildi! Artık tüm maliyetler ve kazançların x{mult}.",
      "upgrade.confirmYes": "Evet, Geliştir",

      "settings.version": "Sürüm 2.0",
      "settings.versionPrefix": "Sürüm",
      "settings.tab.how": "Nasıl Oynanır",
      "settings.tab.prices": "Fiyat Tablosu",
      "settings.tab.achievements": "Başarımlar",
      "settings.tab.social": "Sosyal",
      "settings.tab.app": "Uygulama",

      "how.1.title": "İstekleri karşıla", "how.1.desc": "Müşteriler belirli bir masa için istek gönderir. Onaylarsan oturur, reddedersen gider.",
      "how.2.title": "Fiyatı sen belirle", "how.2.desc": "Masaya dokunup saatlik ücreti ayarla. Pahalı masaya müşteri az gelir, ucuz masa hep dolar.",
      "how.3.title": "Günü kârla kapat", "how.3.desc": "Cafe 08:00–24:00 arası açık. Gün sonunda elektrik ve internet gideri bütçenden düşer.",
      "how.4.title": "Büyü", "how.4.desc": "En fazla 60 masa ve 60 bilgisayar. Boş duran masa gider yazdırır, dengeyi koru.",

      "level.label": "Seviye",
      "level.maxReached": "en üst seviye",

      "instagram.title": "Bizi Instagram'da Takip Et",
      "instagram.sub": "Yeni güncellemeler, kampanyalar ve kamera arkası içerikler için kanalımıza katıl.",
      "instagram.open": "Kanala Katıl",
      "instagram.notNow": "Şimdi Değil",
      "social.tiktok.title": "TikTok'ta Bizi Takip Et",
      "social.tiktok.open": "TikTok'ta Aç",
      "social.tiktok.note": "Bizi takip et, uygulamaya geri dön ve ödülünü buradan al.",
      "social.followFirst": "Önce TikTok'ta Takip Et",
      "social.rateFirst": "Önce Play Store'da Değerlendir",
      "social.rateus.title": "Bizi Play Store'da Değerlendir",
      "social.rateus.handle": "Beğendiysen 5 yıldız bırak ⭐",
      "social.rateus.open": "Play Store'da Değerlendir",
      "social.rateus.note": "Değerlendir, uygulamaya geri dön ve ödülünü buradan al.",
      "social.rewardClaimed": "Ödül Alındı ✓",
      "social.claimReward": "{amount} ₺ Ödülünü Al",

      "app.legalNote": "Gizlilik Politikası ve Kullanım Şartları uygulama paketinin legal/ klasöründedir.",
      "app.dangerZone": "Tehlikeli Bölge",
      "app.resetBtn": "İşletmeyi Sıfırla",
      "app.resetHint": "Bütçen, masaların, bilgisayarların ve gün sayacın silinir. Baştan başlarsın.",
      "app.resetConfirmText": "Emin misin? Bu işlem geri alınamaz.",
      "app.resetCancel": "Vazgeç",
      "app.resetConfirm": "Evet, Sıfırla",

      "stats.business": "İşletme", "stats.day": "Gün", "stats.cash": "Kasa",
      "stats.totalCustomers": "Toplam müşteri", "stats.tablesComputers": "Masa / Bilgisayar",
      "stats.dailyCost": "Günlük gider",

      "ps.tableName": "Playstion Masası {n}",
      "ps.tableDesc": "Konsol köşesi için masa/koltuk kur.",
      "ps.consoleSetupName": "İoz Playstion 4 Kur",
      "ps.consoleSetupDesc": "Masa {n} için ilk konsolu satın al.",
      "ps.upgradeDesc": "Masa {n} konsolunu yükselt.",
      "ps.maxedDesc": "Masa {n} · en üst seviye.",
      "ps.ready": "Hazır",

      "car.tableName": "Simülatör Kabini {n}",
      "car.tableDesc": "Araba simülasyonu köşesi için kabin kur.",
      "car.consoleSetupName": "İoz Racer Basic Kur",
      "car.consoleSetupDesc": "Kabin {n} için ilk simülatörü satın al.",
      "car.upgradeDesc": "Kabin {n} simülatörünü yükselt.",
      "car.maxedDesc": "Kabin {n} · en üst seviye.",
      "car.ready": "Hazır",
      "arcade.tableName": "Atari Dolabı {n}",
      "arcade.tableDesc": "Oyun atarisi köşesi için dolap kur.",
      "arcade.consoleSetupName": "İoz Atari Mini Kur",
      "arcade.consoleSetupDesc": "Dolap {n} için ilk atariyi satın al.",
      "arcade.upgradeDesc": "Dolap {n} atarisini yükselt.",
      "arcade.maxedDesc": "Dolap {n} · en üst seviye.",
      "arcade.ready": "Hazır",

      "vending.drink.name": "İçecek Otomatı",
      "vending.drink.desc": "Saatte {rate} ₺ pasif gelir.",
      "vending.food.name": "Yiyecek Otomatı",
      "vending.food.desc": "Saatte {rate} ₺ pasif gelir.",
      "vending.candy.name": "Tatlı Otomatı",
      "vending.candy.desc": "Saatte {rate} ₺ pasif gelir.",

      "staff.cleaner.name": "Temizlikçi",
      "staff.cleaner.descHired": "Günlük {wage} ₺ maaş · dükkan puanını yükseltir.",
      "staff.cleaner.descToHire": "İşe alım {hire} ₺ + günlük {wage} ₺ maaş. Dükkan puanını yükseltir.",
      "staff.fire": "Kovla",

      "vip.title": "VIP Üyelik",
      "vip.heroTitle": "İşletmeni VIP Yap",
      "vip.benefit1": "Tüm kazançların 2 katına çıkar",
      "vip.benefit2": "Gün sonu reklamları tamamen kalkar",
      "vip.benefit3": "Diğer tüm reklamlar da kaldırılır",
      "vip.benefit4": "Adının yanında altın VIP rozeti",
      "vip.buyBtn": "VIP OL",
      "vip.alreadyOwned": "Zaten VIP üyesin, teşekkürler!",
      "vip.note": "Tek seferlik satın alma. Google Play hesabına bağlıdır, uygulamayı silsen bile korunur.",
      "vip.purchased": "VIP üyeliğin aktif! Kazançların artık 2 katı 👑",
      "vip.purchaseFailed": "Satın alma tamamlanamadı, tekrar dene.",
      "vip.adFreeHint": "VIP üyesin, reklamsız devam ediyorsun 👑",
      "day.continueVip": "Sonraki Güne Geç",
      "day.continueFree": "Sonraki Güne Geç (Reklamsız)",
      "day.freeDayHint": "Bugün reklam yok, direkt devam edebilirsin 🎉",

      "daily.title": "Günlük Giriş Ödülü",
      "daily.dayLabel": "{day}. Gün",
      "daily.subtitle": "Her gün gir, ödülün büyüsün!",
      "daily.claimBtn": "Ödülü Al",
      "daily.claimed": "+{amount} ₺ günlük ödül alındı!",

      "bulk.title": "Fiyatlar",
      "bulk.subtitle": "Bir markadan kaç tane varsa, hepsinin fiyatını tek seferde değiştir.",
      "bulk.empty": "Henüz fiyatlandırılabilecek bir bilgisayar/konsol/simülatör yok.",
      "bulk.unitSuffix": "adet",
      "bulk.apply": "Uygula",
      "bulk.applied": "{name} ({count} adet) fiyatı güncellendi",
      "shopbar.prices": "Fiyatlar",

      "toast.notEnoughMoney": "Yetersiz bütçe",
      "toast.stationFilledMeanwhile": "Masa {n} bu arada doldu",
      "toast.adBonusQuick": "+{amount} ₺ reklam bonusu!",
      "toast.adPcClaimed": "Yeni bir VIP bilgisayar kazandın!",
      "toast.adBonusDay": "Reklam bonusu: +{amount} ₺",
      "toast.priceTooHighCustomerLeft": "Fiyat çok yüksek, bekleyen müşteri gitti",
      "toast.maxTablesReached": "Maksimum masa sayısına ulaşıldı",
      "toast.addTableFirst": "Önce boş bir masa ekle",
      "toast.maxComputersReached": "Maksimum bilgisayar sayısına ulaşıldı",
      "toast.alreadyMaxLevel": "Bu masa zaten en üst seviyede",
      "toast.purchasedSuffix": " satın alındı!",
      "toast.installedSuffix": " kuruldu!",
      "toast.psTableBuilt": "Playstion masası kuruldu",
      "toast.psConsoleInstalled": "İoz Playstion 4 kuruldu!",
      "toast.carTableBuilt": "Simülatör kabini kuruldu",
      "toast.carConsoleInstalled": "İoz Racer Basic kuruldu!",
      "toast.arcadeTableBuilt": "Atari dolabı kuruldu",
      "toast.arcadeConsoleInstalled": "İoz Atari Mini kuruldu!",
      "toast.cleanerHired": "Temizlikçi işe alındı!",
      "toast.cleanerFired": "Temizlikçiyle yollar ayrıldı",
      "toast.tiktokThanks": "+{amount} ₺ — takip ettiğin için teşekkürler!",
      "toast.whatsappThanks": "+{amount} ₺ — kanala katıldığın için teşekkürler!",
      "toast.rateUsThanks": "+{amount} ₺ — değerlendirmen için teşekkürler!",
      "toast.levelUp": "Seviye {level}'e ulaştın! +{bonus} ₺ bonus",
      "toast.upgraded": "{name}'a yükseltildi · {rate} ₺/sa",

      "shop.fastServe.name": "Hızlı Servis",
      "shop.fastServe.desc": "Masalardaki oturma süresini %50 kısaltır. Aynı ücret, çok daha hızlı müşteri devri.",
      "shop.revenueBoost.name": "Gelir Artışı",
      "shop.revenueBoost.desc": "Tüm masa gelirlerine kalıcı olarak +%20 ekler.",
      "shop.customerBoost.name": "Müşteri Verimliliği",
      "shop.customerBoost.desc": "Cafene gelen müşteri trafiğini +%50 artırır.",
      "shop.autoAccept.name": "Otomatik Kabul",
      "shop.autoAccept.desc": "Gelen masa isteklerini elle onaylamana gerek kalmaz, otomatik kabul edilir.",

      "achv.first_customer.name": "İlk Müşteri", "achv.first_customer.desc": "İlk müşterine hizmet ver.",
      "achv.customers_50.name": "Emekleme Dönemi", "achv.customers_50.desc": "Toplam 50 müşteriye hizmet ver.",
      "achv.customers_100.name": "Yüz Müşteri", "achv.customers_100.desc": "Toplam 100 müşteriye hizmet ver.",
      "achv.customers_500.name": "Mahalle Efsanesi", "achv.customers_500.desc": "Toplam 500 müşteriye hizmet ver.",
      "achv.customers_1000.name": "Bin Müşteri", "achv.customers_1000.desc": "Toplam 1.000 müşteriye hizmet ver.",
      "achv.customers_5000.name": "Kitle Hareketi", "achv.customers_5000.desc": "Toplam 5.000 müşteriye hizmet ver.",
      "achv.customers_10000.name": "Şehir Efsanesi", "achv.customers_10000.desc": "Toplam 10.000 müşteriye hizmet ver.",
      "achv.money_1000.name": "İlk Bin", "achv.money_1000.desc": "Kasanda 1.000 ₺'ye ulaş.",
      "achv.money_10000.name": "On Bin Sermaye", "achv.money_10000.desc": "Kasanda 10.000 ₺'ye ulaş.",
      "achv.money_100000.name": "Yüz Bin Sermaye", "achv.money_100000.desc": "Kasanda 100.000 ₺'ye ulaş.",
      "achv.money_1000000.name": "Milyoner Patron", "achv.money_1000000.desc": "Kasanda 1.000.000 ₺'ye ulaş.",
      "achv.day_7.name": "İlk Hafta", "achv.day_7.desc": "7. güne ulaş.",
      "achv.day_30.name": "Bir Ay Devam", "achv.day_30.desc": "30. güne ulaş.",
      "achv.day_100.name": "Yüz Gün Ayakta", "achv.day_100.desc": "100. güne ulaş.",
      "achv.full_capacity.name": "Tam Kapasite", "achv.full_capacity.desc": "40/40 masa ve bilgisayara ulaş.",
      "achv.top_tier_pc.name": "Donanım Ustası", "achv.top_tier_pc.desc": "Herhangi bir masayı İoz X 2030 seviyesine yükselt.",
      "achv.all_lvl3plus.name": "Filo Yenilendi", "achv.all_lvl3plus.desc": "Tüm bilgisayarların en az 3. seviyede olsun.",
      "achv.shop_first.name": "İlk Yatırım", "achv.shop_first.desc": "Dükkandan herhangi bir ürün satın al.",
      "achv.shop_all.name": "Dükkan Koleksiyoncusu", "achv.shop_all.desc": "Dükkandaki 10 ürünü de satın al.",
      "achv.tiktok_follow.name": "TikTok Dostu", "achv.tiktok_follow.desc": "TikTok ödülünü talep et.",
      "achv.whatsapp_join.name": "Kanal Üyesi", "achv.whatsapp_join.desc": "WhatsApp kanalı ödülünü talep et.",
      "achv.ps_first.name": "Konsol Zamanı", "achv.ps_first.desc": "İlk İoz Playstion ünitesini kur.",
      "achv.ps_both.name": "Playstion Salonu", "achv.ps_both.desc": "10 Playstion ünitesinin hepsini kur.",
      "achv.ps_maxed.name": "Playstion Ustası", "achv.ps_maxed.desc": "Herhangi bir Playstion ünitesini 6. seriye yükselt.",
      "achv.flawless_day.name": "Kusursuz Gün", "achv.flawless_day.desc": "Hiç müşteri kaçırmadan bir günü kapat.",
      "achv.vending_first.name": "Otomat Sahibi", "achv.vending_first.desc": "Bir içecek veya yiyecek otomatı kur.",
      "achv.vending_both.name": "Tam Donanım", "achv.vending_both.desc": "Hem içecek hem yiyecek otomatını kur.",
      "achv.cleaner_hired.name": "Pırıl Pırıl", "achv.cleaner_hired.desc": "Bir temizlikçi işe al.",
      "achv.rating_9.name": "Beğenilen Mekan", "achv.rating_9.desc": "Dükkan puanını 9.0'a çıkar.",
      "achv.rebirth_first.name": "Küllerinden Doğan", "achv.rebirth_first.desc": "İlk yeniden doğuşunu yap.",
      "achv.rebirth_5.name": "Efsane İşletmeci", "achv.rebirth_5.desc": "5 kez yeniden doğ.",

      "notif.comebackTitle": "İşletmen seni bekliyor!",
      "notif.comebackBody": "{name} bir süredir kapalı. Gel bak, yeni müşteriler seni bekliyor 🎮"
    },
    en: {
      "boot.subtitle": "Business Simulation",
      "update.title": "Update Required",
      "update.subtitle": "Download the new version to keep playing.",
      "update.button": "Update Now",
      "setup.title": "Give your cafe a name",
      "setup.hint": "Your business name will show up in the top-left corner.",
      "setup.placeholder": "e.g. Cyber Point",
      "setup.startMoney": "Starting budget",
      "setup.readyAtOpen": "Ready at launch",
      "setup.readyAtOpenValue": "1 table · 1 computer",
      "setup.hours": "Open hours",
      "setup.start": "Open For Business",

      "achv.unlockedHead": "Achievement Unlocked!",

      "changelog.title": "What's New — Version 5.0",
      "changelog.intro": "A lot has changed since you last opened your cafe — here's everything:",
      "changelog.1.b": "+40 levels for Playstion, Car Sim and Arcade", "changelog.1.t": "— a much longer upgrade path now.",
      "changelog.2.b": "Hardware Part Upgrades", "changelog.2.t": "— once a computer hits max level, push it further with RAM, SSD, GPU and cooling upgrades.",
      "changelog.3.b": "Rebirth bonus tripled", "changelog.3.t": "— every rebirth is now worth a lot more.",
      "changelog.4.b": "10 VIP Computers", "changelog.4.t": "— earned for free by watching an ad.",
      "changelog.5.b": "2 new store items", "changelog.5.t": "— Security Camera System and Online Reservation System.",
      "changelog.6.b": "Join our Instagram channel", "changelog.6.t": "— stay up to date on new content and promos.",
      "changelog.close": "Close",
      "changelog.closeWithCount": "Close ({n})",

      "hud.day": "Day",
      "requests.title": "Incoming Requests",
      "requests.empty": "No customers waiting right now",
      "shopbar.addTable": "Add Table",
      "shopbar.addComputer": "Add Computer",
      "shopbar.store": "Store",

      "price.perHour": "₺ / hour",
      "price.nextLevel": "Next Level",
      "price.topLevel": "Top tier",
      "parts.head": "Hardware Part Upgrades",
      "parts.sub": "Reached the top tier. Upgrade individual parts one by one to push its income even further.",
      "parts.installed": "Installed ✓",
      "price.save": "Save",
      "price.psTitle": "Playstion",
      "price.tableTitle": "Table",
      "price.carTitle": "Simulator",
      "price.arcadeTitle": "Arcade",
      "price.feeSuffix": "Rate",
      "price.setHourlyRate": "set the hourly rate.",
      "price.noConsoleYet": "This table doesn't have a console yet, but you can set its price in advance.",
      "price.noCarYet": "This cabin doesn't have a simulator yet, but you can set its price in advance.",
      "price.noArcadeYet": "This cabinet doesn't have an arcade machine yet, but you can set its price in advance.",
      "price.noComputerYet": "This table doesn't have a computer yet, but you can set its price in advance.",
      "price.fb.tooExpensive": "Too expensive.",
      "price.fb.tooExpensiveDesc": "Nobody will sit at a {name} for this price — the table stays empty.",
      "price.fb.high": "High price.",
      "price.fb.highDesc": "Good earnings per hour, but fewer customers will come.",
      "price.fb.cheap": "Cheap.",
      "price.fb.cheapDesc": "The table stays full, but you earn less per hour.",
      "price.fb.balanced": "Balanced price.",
      "price.fb.balancedDesc": "Close to the market rate for a {name}.",
      "price.investment": "Investment",
      "price.amount": "Amount",
      "price.table": "Table",
      "price.computerOld90": "Computer · İoz Old 90",
      "price.hwUpgrade": "Hardware Upgrade",
      "price.cost": "Cost",
      "price.dailyCost": "Daily cost",
      "price.rentInternet": "Rent + internet line",
      "price.ceiling": "Customer price ceiling",
      "price.ceilingLimit": "Upper limit",
      "price.ceilingNote": "Price above this ceiling and nobody will sit at that table.",
      "price.psTable": "PS Table",
      "price.psConsole": "İoz Playstion 4 (first console)",
      "price.carTable": "Sim Cabin",
      "price.carConsole": "İoz Racer Basic (first simulator)",
      "price.arcadeTable": "Arcade Cabinet",
      "price.arcadeConsole": "İoz Atari Mini (first arcade machine)",

      "day.title": "End of Day",
      "day.titleWithNum": "End of Day {day}",
      "day.sub": "The cafe has closed. Today's summary:",
      "day.served": "Customers served",
      "day.revenue": "Today's revenue",
      "day.costs": "Electricity + internet cost",
      "day.lost": "Turned away / left customers",
      "day.net": "Net profit",
      "day.watchAd": "Watch Ad and Continue",
      "day.adHint": "You'll move to the next day after a short ad.",
      "day.adBlocked": "The ad couldn't be shown, likely because you have no internet connection. The ad must actually play for the next day to start — check your connection and try again.",

      "ad.pleaseWait": "Please wait",
      "ad.loading": "Loading ad…",
      "ad.previewPlaying": "Playing ad (preview)",
      "ad.secondsLeft": "{n}s",
      "ad.unknown": "unknown",
      "ad.dailyLimitReached": "Done for today",
      "ad.reason.noFill": "No ad inventory (no fill) — Unity Ads couldn't find an ad for this placement right now.",
      "ad.reason.initTimeout": "The ad system never responded (25s) — check your internet connection.",
      "ad.reason.showFailed": "The ad failed to display.",
      "ad.reason.skipped": "The ad was closed before it finished.",
      "ad.reason.initFailed": "Unity Ads init error — {detail}",
      "ad.reason.generic": "Ad error: {raw}",

      "bankrupt.title": "Business Went Bankrupt",
      "bankrupt.text": "Your budget ran out and there's no table left standing. The cafe has closed.",
      "bankrupt.days": "Days survived",
      "bankrupt.customers": "Total customers",
      "bankrupt.restart": "Start Over",

      "store.title": "Store",
      "store.intro": "Buy permanent upgrades and grow your business.",
      "store.sectionPs": "İOZ Playstion",
      "store.sectionCar": "İOZ Araba Simülasyonu",
      "store.sectionArcade": "İOZ Oyun Atarisi",
      "store.tabPc": "Computers",
      "store.tabPs": "Playstion",
      "store.tabCar": "Car Sim",
      "store.tabArcade": "Game Arcade",
      "store.tabVending": "Vending",
      "store.tabStaff": "Staff",
      "store.tabRebirth": "Rebirth",
      "store.tabUpgrade": "Upgrade Shop",
      "store.sectionVending": "Vending Machines",
      "store.sectionStaff": "Staff",
      "store.owned": "Owned",
      "store.installed": "Installed",

      "rating.title": "Cafe Rating",
      "rating.note": "Your rating slowly updates at the end of each day, based on how many customers you turn away and whether you employ a cleaner.",
      "rating.cleaner": "Cleaner",
      "rating.cleanerYes": "Employed · boosting your rating",
      "rating.cleanerNo": "Not employed · hurting your rating",
      "rating.lostToday": "Customers turned away today",
      "rating.servedToday": "Customers served today",
      "rating.airCon": "Air Conditioning",
      "rating.airConYes": "Installed · boosting your rating",
      "rating.airConNo": "Not installed",

      "floor.psTableEmpty": "PS Table",
      "floor.carTableEmpty": "Sim Cabin",
      "floor.arcadeTableEmpty": "Arcade Cabinet",
      "floor.emptySpot": "Empty Spot",
      "floor.adPcEmpty": "Watch & Earn",
      "floor.noConsole": "No console",
      "floor.noCar": "No simulator",
      "floor.noArcade": "No arcade machine",
      "floor.noComputer": "No computer",

      "shop.fiberInternet.name": "Fiber Internet Infrastructure",
      "shop.fiberInternet.desc": "Permanently raises every table's price ceiling by +25%.",
      "shop.airCon.name": "Air Conditioning",
      "shop.airCon.desc": "A comfort upgrade — adds a permanent +1.0 baseline bonus to your cafe rating.",
      "shop.vipProgram.name": "VIP Membership Program",
      "shop.vipProgram.desc": "15% of customers arrive as VIPs — they ignore the price ceiling and stay longer.",
      "shop.loyaltyCard.name": "Loyalty Card System",
      "shop.loyaltyCard.desc": "Extends average customer stays (2-4 hours instead of 1-3).",
      "shop.generator.name": "Generator / Energy Efficiency",
      "shop.generator.desc": "Permanently cuts all daily running costs by 25%.",
      "shop.adCampaign.name": "Social Media Ad Campaign",
      "shop.adCampaign.desc": "Increases customer patience and how many requests can queue at once.",
      "shop.security.name": "Security Camera System",
      "shop.security.desc": "Customers feel safer — adds a permanent +0.5 baseline bonus to your cafe rating.",
      "shop.onlineReservation.name": "Online Reservation System",
      "shop.onlineReservation.desc": "Customers book ahead — permanently increases your incoming customer traffic by another +25%.",

      "rebirth.title": "Rebirth",
      "rebirth.intro": "Reset your business for a permanent bonus. The bonus stacks with every rebirth.",
      "rebirth.currentBonus": "Current permanent bonus",
      "rebirth.count": "Rebirths",
      "rebirth.locked": "Locked — {req}",
      "rebirth.lockedReq": "Build every table/computer and reach day {day}",
      "rebirth.button": "Rebirth",
      "rebirth.confirmTitle": "Are you sure?",
      "rebirth.confirmText": "Your cash, tables, computers, store upgrades and day counter will all reset. In exchange you'll permanently gain +{pct}% revenue. Your achievements, level and total customer count are kept. This cannot be undone.",
      "rebirth.confirmYes": "Yes, Rebirth",
      "rebirth.confirmCancel": "Cancel",
      "rebirth.done": "You've been reborn! Permanent bonus: +{pct}%",
      "upgrade.intro": "Reset your business and reopen it as a much bigger shop. All costs and all earnings permanently scale by x{mult} — same layout, much tougher, much more lucrative. Your achievements, level, total customer count and rebirth progress are kept.",
      "upgrade.introDone": "Your shop is already upgraded — all costs and earnings are permanently scaled up.",
      "upgrade.multiplier": "Active multiplier",
      "upgrade.cost": "Upgrade cost",
      "upgrade.button": "Upgrade Shop",
      "upgrade.confirmText": "Your cash, tables, computers and store upgrades will reset; you'll pay {cost} ₺ and permanently scale all costs and earnings by x{mult}. Your achievements, level, total customer count and rebirth progress are kept. This cannot be undone.",
      "upgrade.done": "Your shop has been upgraded! All costs and earnings are now x{mult}.",
      "upgrade.confirmYes": "Yes, Upgrade",

      "settings.version": "Version 2.0",
      "settings.versionPrefix": "Version",
      "settings.tab.how": "How to Play",
      "settings.tab.prices": "Price Table",
      "settings.tab.achievements": "Achievements",
      "settings.tab.social": "Social",
      "settings.tab.app": "App",

      "how.1.title": "Handle requests", "how.1.desc": "Customers send a request for a specific table. Accept it and they sit down, decline and they leave.",
      "how.2.title": "Set your own prices", "how.2.desc": "Tap a table to set its hourly rate. Expensive tables get fewer customers, cheap ones stay full.",
      "how.3.title": "Close the day in profit", "how.3.desc": "The cafe is open 08:00–24:00. At day's end, electricity and internet costs come out of your budget.",
      "how.4.title": "Grow", "how.4.desc": "Up to 60 tables and 60 computers. An idle table still costs you money, so keep things balanced.",

      "level.label": "Level",
      "level.maxReached": "max level",

      "instagram.title": "Follow Us on Instagram",
      "instagram.sub": "Join our channel for new updates, promos, and behind-the-scenes content.",
      "instagram.open": "Join the Channel",
      "instagram.notNow": "Not Now",
      "social.tiktok.title": "Follow Us on TikTok",
      "social.tiktok.open": "Open TikTok",
      "social.tiktok.note": "Follow us, come back to the app, then claim your reward here.",
      "social.followFirst": "Follow on TikTok First",
      "social.rateFirst": "Rate on the Play Store First",
      "social.rateus.title": "Rate Us on the Play Store",
      "social.rateus.handle": "Leave 5 stars if you're enjoying it ⭐",
      "social.rateus.open": "Rate on the Play Store",
      "social.rateus.note": "Rate us, come back to the app, then claim your reward here.",
      "social.rewardClaimed": "Reward Claimed ✓",
      "social.claimReward": "Claim {amount} ₺ Reward",

      "app.legalNote": "The Privacy Policy and Terms of Use are in the legal/ folder of the app package.",
      "app.dangerZone": "Danger Zone",
      "app.resetBtn": "Reset Business",
      "app.resetHint": "Your budget, tables, computers and day counter will be wiped. You'll start over.",
      "app.resetConfirmText": "Are you sure? This can't be undone.",
      "app.resetCancel": "Cancel",
      "app.resetConfirm": "Yes, Reset",

      "stats.business": "Business", "stats.day": "Day", "stats.cash": "Cash",
      "stats.totalCustomers": "Total customers", "stats.tablesComputers": "Tables / Computers",
      "stats.dailyCost": "Daily cost",

      "ps.tableName": "Playstion Table {n}",
      "ps.tableDesc": "Set up a table/couch for the console corner.",
      "ps.consoleSetupName": "Install İoz Playstion 4",
      "ps.consoleSetupDesc": "Buy the first console for table {n}.",
      "ps.upgradeDesc": "Upgrade the console at table {n}.",
      "ps.maxedDesc": "Table {n} · top tier.",
      "ps.ready": "Ready",

      "car.tableName": "Sim Cabin {n}",
      "car.tableDesc": "Set up a cabin for the racing sim corner.",
      "car.consoleSetupName": "Install İoz Racer Basic",
      "car.consoleSetupDesc": "Buy the first simulator for cabin {n}.",
      "car.upgradeDesc": "Upgrade cabin {n}'s simulator.",
      "car.maxedDesc": "Cabin {n} · top level.",
      "car.ready": "Ready",
      "arcade.tableName": "Arcade Cabinet {n}",
      "arcade.tableDesc": "Set up a cabinet for the arcade corner.",
      "arcade.consoleSetupName": "Install İoz Atari Mini",
      "arcade.consoleSetupDesc": "Buy the first arcade machine for cabinet {n}.",
      "arcade.upgradeDesc": "Upgrade cabinet {n}'s arcade machine.",
      "arcade.maxedDesc": "Cabinet {n} · top level.",
      "arcade.ready": "Ready",

      "vending.drink.name": "Drink Vending Machine",
      "vending.drink.desc": "{rate} ₺ passive income per hour.",
      "vending.food.name": "Snack Vending Machine",
      "vending.food.desc": "{rate} ₺ passive income per hour.",
      "vending.candy.name": "Candy Vending Machine",
      "vending.candy.desc": "{rate} ₺ passive income per hour.",

      "staff.cleaner.name": "Cleaner",
      "staff.cleaner.descHired": "{wage} ₺ daily wage · boosts your cafe rating.",
      "staff.cleaner.descToHire": "{hire} ₺ to hire + {wage} ₺ daily wage. Boosts your cafe rating.",
      "staff.fire": "Let Go",

      "vip.title": "VIP Membership",
      "vip.heroTitle": "Make Your Business VIP",
      "vip.benefit1": "Doubles all your earnings",
      "vip.benefit2": "Removes the end-of-day ad entirely",
      "vip.benefit3": "Removes all other ads too",
      "vip.benefit4": "A gold VIP badge next to your name",
      "vip.buyBtn": "GO VIP",
      "vip.alreadyOwned": "You're already VIP, thank you!",
      "vip.note": "One-time purchase. Tied to your Google Play account, kept even if you uninstall.",
      "vip.purchased": "VIP membership active! Earnings are now 2x 👑",
      "vip.purchaseFailed": "Purchase couldn't be completed, try again.",
      "vip.adFreeHint": "You're VIP, continuing ad-free 👑",
      "day.continueVip": "Continue to Next Day",
      "day.continueFree": "Continue to Next Day (No Ad)",
      "day.freeDayHint": "No ad today, you can just continue 🎉",

      "daily.title": "Daily Login Reward",
      "daily.dayLabel": "Day {day}",
      "daily.subtitle": "Log in every day for a bigger reward!",
      "daily.claimBtn": "Claim Reward",
      "daily.claimed": "+{amount} ₺ daily reward claimed!",

      "bulk.title": "Prices",
      "bulk.subtitle": "Change the price for every unit of a brand at once.",
      "bulk.empty": "No priceable computers/consoles/simulators yet.",
      "bulk.unitSuffix": "units",
      "bulk.apply": "Apply",
      "bulk.applied": "{name} ({count} units) price updated",
      "shopbar.prices": "Prices",

      "toast.notEnoughMoney": "Not enough budget",
      "toast.stationFilledMeanwhile": "Table {n} got filled in the meantime",
      "toast.adBonusQuick": "+{amount} ₺ ad bonus!",
      "toast.adPcClaimed": "You earned a new VIP computer!",
      "toast.adBonusDay": "Ad bonus: +{amount} ₺",
      "toast.priceTooHighCustomerLeft": "Price too high, the waiting customer left",
      "toast.maxTablesReached": "Maximum number of tables reached",
      "toast.addTableFirst": "Add an empty table first",
      "toast.maxComputersReached": "Maximum number of computers reached",
      "toast.alreadyMaxLevel": "This table is already at the top tier",
      "toast.purchasedSuffix": " purchased!",
      "toast.installedSuffix": " installed!",
      "toast.psTableBuilt": "Playstion table set up",
      "toast.psConsoleInstalled": "İoz Playstion 4 installed!",
      "toast.carTableBuilt": "Sim cabin set up",
      "toast.carConsoleInstalled": "İoz Racer Basic installed!",
      "toast.arcadeTableBuilt": "Arcade cabinet set up",
      "toast.arcadeConsoleInstalled": "İoz Atari Mini installed!",
      "toast.cleanerHired": "Cleaner hired!",
      "toast.cleanerFired": "Parted ways with the cleaner",
      "toast.tiktokThanks": "+{amount} ₺ — thanks for following!",
      "toast.whatsappThanks": "+{amount} ₺ — thanks for joining the channel!",
      "toast.rateUsThanks": "+{amount} ₺ — thanks for rating us!",
      "toast.levelUp": "You reached level {level}! +{bonus} ₺ bonus",
      "toast.upgraded": "Upgraded to {name} · {rate} ₺/hr",

      "shop.fastServe.name": "Fast Service",
      "shop.fastServe.desc": "Cuts table seating time by 50%. Same rate, much faster customer turnover.",
      "shop.revenueBoost.name": "Revenue Boost",
      "shop.revenueBoost.desc": "Permanently adds +20% to all table income.",
      "shop.customerBoost.name": "Customer Efficiency",
      "shop.customerBoost.desc": "Increases foot traffic to your cafe by +50%.",
      "shop.autoAccept.name": "Auto-Accept",
      "shop.autoAccept.desc": "Incoming table requests get accepted automatically, no manual approval needed.",

      "achv.first_customer.name": "First Customer", "achv.first_customer.desc": "Serve your first customer.",
      "achv.customers_50.name": "Learning the Ropes", "achv.customers_50.desc": "Serve 50 customers in total.",
      "achv.customers_100.name": "A Hundred Customers", "achv.customers_100.desc": "Serve 100 customers in total.",
      "achv.customers_500.name": "Neighborhood Legend", "achv.customers_500.desc": "Serve 500 customers in total.",
      "achv.customers_1000.name": "A Thousand Customers", "achv.customers_1000.desc": "Serve 1,000 customers in total.",
      "achv.customers_5000.name": "Mass Movement", "achv.customers_5000.desc": "Serve 5,000 customers in total.",
      "achv.customers_10000.name": "City Legend", "achv.customers_10000.desc": "Serve 10,000 customers in total.",
      "achv.money_1000.name": "First Thousand", "achv.money_1000.desc": "Reach 1,000 ₺ in your till.",
      "achv.money_10000.name": "Ten Grand Capital", "achv.money_10000.desc": "Reach 10,000 ₺ in your till.",
      "achv.money_100000.name": "Hundred Grand Capital", "achv.money_100000.desc": "Reach 100,000 ₺ in your till.",
      "achv.money_1000000.name": "Millionaire Boss", "achv.money_1000000.desc": "Reach 1,000,000 ₺ in your till.",
      "achv.day_7.name": "First Week", "achv.day_7.desc": "Reach day 7.",
      "achv.day_30.name": "A Month In", "achv.day_30.desc": "Reach day 30.",
      "achv.day_100.name": "A Hundred Days Strong", "achv.day_100.desc": "Reach day 100.",
      "achv.full_capacity.name": "Full Capacity", "achv.full_capacity.desc": "Reach 40/40 tables and computers.",
      "achv.top_tier_pc.name": "Hardware Master", "achv.top_tier_pc.desc": "Upgrade any table to İoz X 2030.",
      "achv.all_lvl3plus.name": "Fleet Renewed", "achv.all_lvl3plus.desc": "Get every computer to at least level 3.",
      "achv.shop_first.name": "First Investment", "achv.shop_first.desc": "Buy any item from the store.",
      "achv.shop_all.name": "Store Collector", "achv.shop_all.desc": "Buy all 10 items in the store.",
      "achv.tiktok_follow.name": "TikTok Friend", "achv.tiktok_follow.desc": "Claim the TikTok reward.",
      "achv.whatsapp_join.name": "Channel Member", "achv.whatsapp_join.desc": "Claim the WhatsApp channel reward.",
      "achv.ps_first.name": "Game Time", "achv.ps_first.desc": "Set up your first İoz Playstion unit.",
      "achv.ps_both.name": "Playstion Lounge", "achv.ps_both.desc": "Set up all 10 Playstion units.",
      "achv.ps_maxed.name": "Playstion Master", "achv.ps_maxed.desc": "Upgrade any Playstion unit to series 6.",
      "achv.flawless_day.name": "Flawless Day", "achv.flawless_day.desc": "Close a day without turning away a single customer.",
      "achv.vending_first.name": "Vending Owner", "achv.vending_first.desc": "Set up a drink or snack machine.",
      "achv.vending_both.name": "Fully Equipped", "achv.vending_both.desc": "Set up both the drink and snack machines.",
      "achv.cleaner_hired.name": "Spotless", "achv.cleaner_hired.desc": "Hire a cleaner.",
      "achv.rating_9.name": "Fan Favorite", "achv.rating_9.desc": "Get your cafe rating up to 9.0.",
      "achv.rebirth_first.name": "Risen from the Ashes", "achv.rebirth_first.desc": "Complete your first rebirth.",
      "achv.rebirth_5.name": "Legendary Operator", "achv.rebirth_5.desc": "Rebirth 5 times.",

      "notif.comebackTitle": "Your business is waiting!",
      "notif.comebackBody": "{name} has been closed for a while. Come back — new customers are waiting 🎮"
    }
  };

  function t(key, vars) {
    var dict = TRANSLATIONS[LANG] || TRANSLATIONS.tr;
    var str = dict[key];
    if (str === undefined) str = (TRANSLATIONS.tr[key] !== undefined) ? TRANSLATIONS.tr[key] : key;
    if (vars) {
      for (var k in vars) {
        if (vars.hasOwnProperty(k)) str = str.split("{" + k + "}").join(vars[k]);
      }
    }
    return str;
  }

  function applyStaticI18n() {
    Array.prototype.slice.call(document.querySelectorAll("[data-i18n]")).forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    Array.prototype.slice.call(document.querySelectorAll("[data-i18n-placeholder]")).forEach(function (el) {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    document.documentElement.setAttribute("lang", LANG);
  }

  function setLanguage(lang) {
    LANG = (lang === "en") ? "en" : "tr";
    try { localStorage.setItem(LANG_KEY, LANG); } catch (e) {}
    applyStaticI18n();
    var switchEl = document.getElementById("lang-switch");
    if (switchEl) {
      Array.prototype.slice.call(switchEl.querySelectorAll(".lang-btn")).forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-lang") === LANG);
      });
    }
  }

  applyStaticI18n();
  document.addEventListener("DOMContentLoaded", function () {
    applyStaticI18n();
    var switchEl = document.getElementById("lang-switch");
    if (switchEl) {
      switchEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".lang-btn");
        if (!btn) return;
        setLanguage(btn.getAttribute("data-lang"));
      });
      Array.prototype.slice.call(switchEl.querySelectorAll(".lang-btn")).forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-lang") === LANG);
      });
    }
  });

  // IMPORTANT — never change this string again. An earlier update bumped
  // it from "netcafe_save_v2" to "netcafe_save_v3" purely to reflect a
  // stations-array format change, which was a mistake: every real player's
  // save silently became invisible to the app (their data was still on
  // the device, just under a key nothing was looking for anymore), and it
  // read exactly like a full progress wipe. Format/structure changes are
  // handled by the migration logic below instead — SAVE_KEY itself must
  // stay constant across every future version, forever.
  var SAVE_KEY = "netcafe_save_v3";
  // Older builds used these before the mistake above. load() falls back to
  // them so anyone updating from a version that far back still gets found
  // and migrated forward instead of starting over.
  var LEGACY_SAVE_KEYS = ["netcafe_save_v2", "netcafe_save_v1", "netcafe_save"];
  var MAX_STATIONS = 60;

  // ---- Reklamla Kazanılan VIP Bilgisayarlar: 10 ekstra masa+bilgisayar,
  // parayla değil ödüllü reklam izleyerek kazanılıyor. Kazanılınca sıradan
  // bir İoz Old 90 (level 1) gibi davranır — aynı fiyatla başlar, aynı
  // şekilde parayla yükseltilebilir; tek farkı kurulumun bedava olması ve
  // "REKLAM" rozeti taşıması. Normal 60'lık PC havuzunun DIŞINDadır: ne
  // "Masa Ekle" ile ne "full_capacity" gibi başarımlarla karışır.
  var AD_PC_STATION_COUNT = 10;
  var TABLE_COST = 100;
  var COMPUTER_COST = 100;
  var MAX_LEVEL = 7;
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
    5: { name: "İoz Pro 2025", defaultRate: 200, maxAcceptRate: 340, dailyCost: 130, upgradeCost: 10000 },
    6: { name: "İoz X 2027", defaultRate: 300, maxAcceptRate: 510, dailyCost: 195, upgradeCost: 20000 },
    7: { name: "İoz X 2030", defaultRate: 450, maxAcceptRate: 765, dailyCost: 290, upgradeCost: null }
  };

  // ---- Donanım Parça Yükseltmeleri: only for the regular PC pool, only
  // once a station has reached İoz X 2030 (level 7, the top of
  // COMPUTER_LEVELS). An orthogonal, per-station upgrade axis on top of
  // computerLevel — very expensive, stacking income multipliers instead of
  // changing the machine's tier/name. Bought in any order, once each.
  var PC_PARTS = [
    { id: "ram", name: "RAM Yükseltmesi", desc: "32 GB'a çıkar, çoklu görevde takılma kalmaz.", cost: 60000, bonusPct: 0.15 },
    { id: "ssd", name: "NVMe SSD Yükseltmesi", desc: "Oyun ve uygulama açılışları göz açıp kapayana kadar.", cost: 90000, bonusPct: 0.15 },
    { id: "gpu", name: "Ekran Kartı Yükseltmesi", desc: "En yeni oyunlar bile ultra ayarda tam performans.", cost: 150000, bonusPct: 0.25 },
    { id: "cooling", name: "Sıvı Soğutma Sistemi", desc: "Sistem hiç ısınmaz, performans hep zirvede kalır.", cost: 45000, bonusPct: 0.10 }
  ];
  function pcPartsCost(part) { return Math.round(part.cost * shopTierMultiplier()); }
  function partsMultiplier(s) {
    if (!s || !s.parts) return 1;
    var m = 1;
    PC_PARTS.forEach(function (p) { if (s.parts[p.id]) m += p.bonusPct; });
    return m;
  }
  function isPlainPc(s) { return !!(s && !s.isPS && !s.isCar && !s.isArcade); }

  var DEFAULT_RATE = 30;
  var MIN_RATE = 10;
  var MAX_RATE = 360;

  var DAILY_BASE_COST = 60; // rent/internet line, regardless of PC count

  // ---- İOZ Playstion (2 dedicated console stations, separate from the
  // 20-slot PC pool). Deliberately spelled "Playstion" — not the Sony
  // trademark — to keep the store listing safe.
  var PS_STATION_COUNT = 40;
  var PS_TABLE_COST = 250;
  var PS_CONSOLE_COST = 300;
  var PS_LEVELS = {
    1: { name: "İoz Playstion 4",     defaultRate: 80,  maxAcceptRate: 150,  dailyCost: 60,  upgradeCost: 2000 },
    2: { name: "İoz Playstion 4 Pro", defaultRate: 160, maxAcceptRate: 290,  dailyCost: 115, upgradeCost: 4500 },
    3: { name: "İoz Playstion 5",     defaultRate: 280, maxAcceptRate: 480,  dailyCost: 190, upgradeCost: 9000 },
    4: { name: "İoz Playstion 5 Pro", defaultRate: 450, maxAcceptRate: 750,  dailyCost: 300, upgradeCost: 18000 },
    5: { name: "İoz Playstion 6",     defaultRate: 700, maxAcceptRate: 1150, dailyCost: 460, upgradeCost: null }
  };
  var PS_PHOTOS = { 1: "assets/ps-lvl1.jpg", 2: "assets/ps-lvl1.jpg", 3: "assets/ps-lvl2.jpg", 4: "assets/ps-lvl2.jpg", 5: "assets/ps-lvl2.jpg" };

  // ---- İOZ Araba Simülasyonu (10 dedicated sim-racing cabinets, separate
  // pool from PC + Playstion). Priced ~5x İOZ Playstion, top of the
  // station food-chain. Each of the 3 levels gets its own custom SVG
  // silhouette (icon-car-lvl1/2/3, defined in index.html) instead of a
  // photo — so unlike the PS tiers, every level actually looks different.
  var CAR_STATION_COUNT = 30;
  var CAR_TABLE_COST = PS_TABLE_COST * 5;     // 1250
  var CAR_CONSOLE_COST = PS_CONSOLE_COST * 5; // 1500
  var CAR_LEVELS = {
    1: { name: "İoz Racer Basic", defaultRate: 400,  maxAcceptRate: 700,  dailyCost: 250, upgradeCost: 8000,  icon: "icon-car-lvl1" },
    2: { name: "İoz Racer GT",    defaultRate: 900,  maxAcceptRate: 1500, dailyCost: 500, upgradeCost: 18000, icon: "icon-car-lvl2" },
    3: { name: "İoz Racer Elite", defaultRate: 1800, maxAcceptRate: 3000, dailyCost: 950, upgradeCost: null,  icon: "icon-car-lvl3" }
  };

  // ---- İOZ Oyun Atarisi (10 dedicated retro arcade cabinets, separate
  // pool from PC + Playstion + Araba Sim). Priced exactly 3x the Araba
  // Simülasyonu across the board (table/console cost, rates, dailyCost,
  // upgradeCost) — the new top of the station food-chain. Same
  // icon-per-level pattern as the car pool (icon-arcade-lvl1/2/3).
  var ARCADE_STATION_COUNT = 10;
  var ARCADE_TABLE_COST = CAR_TABLE_COST * 3;     // 3750
  var ARCADE_CONSOLE_COST = CAR_CONSOLE_COST * 3; // 4500
  var ARCADE_LEVELS = {
    1: { name: "İoz Atari Mini",    defaultRate: 1200, maxAcceptRate: 2100, dailyCost: 750,  upgradeCost: 24000, icon: "icon-arcade-lvl1" },
    2: { name: "İoz Atari Pro",     defaultRate: 2700, maxAcceptRate: 4500, dailyCost: 1500, upgradeCost: 54000, icon: "icon-arcade-lvl2" },
    3: { name: "İoz Atari Deluxe",  defaultRate: 5400, maxAcceptRate: 9000, dailyCost: 2850, upgradeCost: null,  icon: "icon-arcade-lvl3" }
  };

  // ---- Uzun oyun için: PS / Araba Sim / Atari'nin üst seviyesinin ötesine
  // +40 seviye daha ekleniyor, her seviyede %18 katlanarak (aynı görsel/
  // fotoğraf en üst seviyeninkiyle aynı kalıyor — sadece isim, ücret ve
  // maliyet tırmanıyor). PC havuzu bunun dışında; o "Donanım Parça
  // Yükseltmeleri" ile ayrı bir eksende büyüyor (yukarıda).
  var LEVEL_EXTENSION_COUNT = 40;
  var LEVEL_EXTENSION_GROWTH = 1.18;
  function extendLevels(levels, topLevel, extraCount, growth, nameBase, iconOrNull) {
    var lastRealUpgradeCost = null;
    for (var lv = topLevel; lv >= 1; lv--) {
      if (levels[lv].upgradeCost) { lastRealUpgradeCost = levels[lv].upgradeCost; break; }
    }
    var rate = levels[topLevel].defaultRate;
    var ceiling = levels[topLevel].maxAcceptRate;
    var daily = levels[topLevel].dailyCost;
    var upCost = lastRealUpgradeCost || Math.round(rate * 10);
    for (var i = 1; i <= extraCount; i++) {
      rate = Math.round(rate * growth);
      ceiling = Math.round(ceiling * growth);
      daily = Math.round(daily * growth);
      upCost = Math.round(upCost * growth);
      var lvl = {
        name: nameBase + " +" + i,
        defaultRate: rate,
        maxAcceptRate: ceiling,
        dailyCost: daily,
        upgradeCost: (i === extraCount) ? null : upCost
      };
      if (iconOrNull) lvl.icon = iconOrNull;
      levels[topLevel + i] = lvl;
    }
  }
  extendLevels(PS_LEVELS, 5, LEVEL_EXTENSION_COUNT, LEVEL_EXTENSION_GROWTH, "İoz Playstion 6", null);
  for (var _psExtraLvl = 6; _psExtraLvl <= 5 + LEVEL_EXTENSION_COUNT; _psExtraLvl++) {
    PS_PHOTOS[_psExtraLvl] = PS_PHOTOS[5];
  }
  extendLevels(CAR_LEVELS, 3, LEVEL_EXTENSION_COUNT, LEVEL_EXTENSION_GROWTH, "İoz Racer Elite", "icon-car-lvl3");
  extendLevels(ARCADE_LEVELS, 3, LEVEL_EXTENSION_COUNT, LEVEL_EXTENSION_GROWTH, "İoz Atari Deluxe", "icon-arcade-lvl3");

  // ---- otomatlar (vending machines) — passive hourly income, single unit
  // each, bought once through the Dükkan. Cheap parallel system: no floor
  // slot, no request queue, just an hourly accrual added straight into tick().
  var VENDING_DRINK_COST = 3000;
  var VENDING_DRINK_RATE_PER_HOUR = 40;
  var VENDING_DRINK_DAILY_COST = 10;
  var VENDING_FOOD_COST = 5000;
  var VENDING_FOOD_RATE_PER_HOUR = 70;
  var VENDING_FOOD_DAILY_COST = 20;
  var VENDING_CANDY_COST = 8000;
  var VENDING_CANDY_RATE_PER_HOUR = 100;
  var VENDING_CANDY_DAILY_COST = 30;

  // ---- temizlikçi (cleaning staff) + dükkan puanı (0-10 cafe rating)
  var CLEANER_HIRE_COST = 2000;
  var CLEANER_DAILY_WAGE = 150;

  // ---- "Bizi Değerlendir" — real Play Store review prompt, separate from
  // the simulated 0-10 cafe rating above. Honor-system one-time reward,
  // same pattern as the TikTok follow bonus.
  var RATE_US_REWARD = 200;
  var PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.iozgames.iozcafe";

  // ---- zorunlu güncelleme kontrolü --------------------------------------
  // Compares the version baked into THIS build (www/app-version.json,
  // written by the CI workflow right before `cap sync`) against a small
  // JSON file hosted on GitHub Pages that the workflow updates after every
  // successful release. If Pages says a newer build exists, the player is
  // stopped before the game screen ever shows and sent to the Play Store.
  // Any failure here (offline, Pages down, files missing) FAILS OPEN — the
  // game just starts normally. We never want a network hiccup to lock
  // someone out of a game they already paid for (VIP).
  var REMOTE_VERSION_URL = "https://yapayzekapolat1-afk.github.io/ioz-internet-cafe/version.json";
  var updateRequired = false;
  var pendingUpdateUrl = PLAY_STORE_URL;

  function checkForUpdate() {
    return fetch("app-version.json")
      .then(function (r) { return r.json(); })
      .then(function (local) {
        if (!local || typeof local.versionCode !== "number") return;
        var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
        var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 5000) : null;
        return fetch(REMOTE_VERSION_URL, controller ? { signal: controller.signal, cache: "no-store" } : { cache: "no-store" })
          .then(function (r) { if (timeoutId) clearTimeout(timeoutId); return r.json(); })
          .then(function (remote) {
            if (remote && typeof remote.latestVersionCode === "number" && remote.latestVersionCode > local.versionCode) {
              updateRequired = true;
              pendingUpdateUrl = remote.updateUrl || PLAY_STORE_URL;
            }
          });
      })
      .catch(function () { /* fail open — see note above */ });
  }
  var updateCheckPromise = checkForUpdate();

  // ---- günlük giriş ödülü (daily login reward) -----------------------
  // 7-day cycle, day 7 is the biggest reward, then it loops back to day 1.
  // Tracked by REAL calendar date (not game day), so it rewards opening
  // the app once per day regardless of how far the in-game clock got.
  var DAILY_REWARDS = [300, 500, 800, 1200, 1800, 2500, 5000];
  var pendingDailyRewardDay = null; // set by checkDailyReward(), consumed by claim button

  function todayDateStr() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function dateStrDaysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    var pad = function (x) { return x < 10 ? "0" + x : "" + x; };
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // ---- achievements / xp / level ------------------------------------
  // XP needed to REACH each level (index 0 = level 1, always 0 XP).
  var LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
    3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10450];

  function levelForXp(xp) {
    var lvl = 1;
    for (var i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      if (xp >= LEVEL_THRESHOLDS[i]) lvl = i + 1; else break;
    }
    return lvl;
  }

  // Each achievement is checked every renderHud() call (cheap boolean
  // tests), so there is exactly one place that can ever unlock one —
  // no risk of a purchase/event path forgetting to call a check function.
  var ACHIEVEMENTS = [
    { id: "first_customer", xp: 50,
      check: function (st) { return st.totalCustomers >= 1; } },
    { id: "customers_50", xp: 100,
      check: function (st) { return st.totalCustomers >= 50; } },
    { id: "customers_100", xp: 150,
      check: function (st) { return st.totalCustomers >= 100; } },
    { id: "customers_500", xp: 300,
      check: function (st) { return st.totalCustomers >= 500; } },
    { id: "customers_1000", xp: 500,
      check: function (st) { return st.totalCustomers >= 1000; } },
    { id: "customers_5000", xp: 1000,
      check: function (st) { return st.totalCustomers >= 5000; } },
    { id: "customers_10000", xp: 2000,
      check: function (st) { return st.totalCustomers >= 10000; } },

    { id: "money_1000", xp: 50,
      check: function (st) { return st.money >= 1000; } },
    { id: "money_10000", xp: 150,
      check: function (st) { return st.money >= 10000; } },
    { id: "money_100000", xp: 400,
      check: function (st) { return st.money >= 100000; } },
    { id: "money_1000000", xp: 1000,
      check: function (st) { return st.money >= 1000000; } },

    { id: "day_7", xp: 100,
      check: function (st) { return st.day >= 7; } },
    { id: "day_30", xp: 300,
      check: function (st) { return st.day >= 30; } },
    { id: "day_100", xp: 800,
      check: function (st) { return st.day >= 100; } },

    { id: "full_capacity", xp: 400,
      check: function (st) {
        var t = st.stations.filter(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasTable; }).length;
        var c = st.stations.filter(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasComputer; }).length;
        return t >= MAX_STATIONS && c >= MAX_STATIONS;
      } },
    { id: "top_tier_pc", xp: 500,
      check: function (st) {
        return st.stations.some(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.computerLevel === 7; });
      } },
    { id: "all_lvl3plus", xp: 600,
      check: function (st) {
        var pcs = st.stations.filter(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasComputer; });
        return pcs.length >= MAX_STATIONS && pcs.every(function (s) { return s.computerLevel >= 3; });
      } },

    { id: "shop_first", xp: 100,
      check: function (st) {
        var s = st.shop;
        return s.fastServe || s.revenueBoost || s.customerBoost || s.autoAccept ||
               s.fiberInternet || s.airCon || s.vipProgram || s.loyaltyCard || s.generator || s.adCampaign;
      } },
    { id: "shop_all", xp: 1500,
      check: function (st) {
        var s = st.shop;
        return s.fastServe && s.revenueBoost && s.customerBoost && s.autoAccept &&
               s.fiberInternet && s.airCon && s.vipProgram && s.loyaltyCard && s.generator && s.adCampaign;
      } },
    { id: "tiktok_follow", xp: 50,
      check: function (st) { return st.tiktokClaimed; } },
    { id: "whatsapp_join", xp: 50,
      check: function (st) { return st.whatsappClaimed; } },

    { id: "ps_first", xp: 150,
      check: function (st) {
        return st.stations.some(function (s) { return s.isPS && s.hasComputer; });
      } },
    { id: "ps_both", xp: 400,
      check: function (st) {
        return st.stations.filter(function (s) { return s.isPS && s.hasComputer; }).length >= PS_STATION_COUNT;
      } },
    { id: "ps_maxed", xp: 500,
      check: function (st) {
        return st.stations.some(function (s) { return s.isPS && s.computerLevel >= 5; });
      } },

    { id: "flawless_day", xp: 200,
      check: function (st) { return st.flawlessDayAchieved === true; } },

    { id: "vending_first", xp: 100,
      check: function (st) { return st.vending.drink || st.vending.food; } },
    { id: "vending_both", xp: 200,
      check: function (st) { return st.vending.drink && st.vending.food; } },
    { id: "cleaner_hired", xp: 150,
      check: function (st) { return st.staff.cleaner; } },
    { id: "rating_9", xp: 500,
      check: function (st) { return st.rating >= 9; } },

    { id: "rebirth_first", xp: 800,
      check: function (st) { return st.rebirths >= 1; } },
    { id: "rebirth_5", xp: 2000,
      check: function (st) { return st.rebirths >= 5; } }
  ];

  // ---- customer flow --------------------------------------------------
  // Requests arrive one at a time with a gap between them, so the cafe
  // never dumps 15 people on the player at once.
  var MIN_GAP_GAME_MIN = 3;    // at peak hours
  var MAX_GAP_GAME_MIN = 55;   // at dead hours
  var MAX_PENDING_REQUESTS = 4;
  var PATIENCE_GAME_MIN = 20;  // how long a customer waits for approval

  // "Sosyal Medya Reklam Kampanyası" dükkan ürünü: müşteriler daha sabırlı
  // bekler ve aynı anda daha fazla istek kuyrukta tutulabilir — daha az
  // müşteri kaybı demek. Tek yerden okunur ki her kullanım noktası aynı
  // (varsa yükseltilmiş) değeri görsün.
  function currentPatience() { return state.shop.adCampaign ? PATIENCE_GAME_MIN + 10 : PATIENCE_GAME_MIN; }
  function currentMaxPending() { return state.shop.adCampaign ? MAX_PENDING_REQUESTS + 2 : MAX_PENDING_REQUESTS; }

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
        sessionStartMin: 0, sessionEndMin: 0, payout: 0,
        parts: {}
      });
    }
    stations[0].hasTable = true;
    stations[0].hasComputer = true;
    stations[0].computerLevel = 1;
    stations[0].rate = COMPUTER_LEVELS[1].defaultRate;

    // Reklamla Kazanılan VIP Bilgisayarlar: separate 10-slot pool, right
    // after the regular PC pool. Empty until the player watches a
    // rewarded ad for each one.
    for (var v = 0; v < AD_PC_STATION_COUNT; v++) {
      stations.push({
        hasTable: false, hasComputer: false, computerLevel: 0,
        rate: DEFAULT_RATE,
        occupied: false, customerName: "", hoursBooked: 0,
        sessionStartMin: 0, sessionEndMin: 0, payout: 0,
        parts: {}, isAdPc: true
      });
    }

    // İOZ Playstion: dedicated console slots, separate from the PC pool.
    // Same station shape (isPS flags which level table applies).
    for (var p = 0; p < PS_STATION_COUNT; p++) {
      stations.push({
        hasTable: false, hasComputer: false, computerLevel: 0,
        rate: PS_LEVELS[1].defaultRate,
        occupied: false, customerName: "", hoursBooked: 0,
        sessionStartMin: 0, sessionEndMin: 0, payout: 0,
        isPS: true
      });
    }

    // İOZ Araba Simülasyonu: dedicated sim cabinets, separate pool again.
    for (var c = 0; c < CAR_STATION_COUNT; c++) {
      stations.push({
        hasTable: false, hasComputer: false, computerLevel: 0,
        rate: CAR_LEVELS[1].defaultRate,
        occupied: false, customerName: "", hoursBooked: 0,
        sessionStartMin: 0, sessionEndMin: 0, payout: 0,
        isCar: true
      });
    }

    // İOZ Oyun Atarisi: dedicated retro arcade cabinets, separate pool again.
    for (var a = 0; a < ARCADE_STATION_COUNT; a++) {
      stations.push({
        hasTable: false, hasComputer: false, computerLevel: 0,
        rate: ARCADE_LEVELS[1].defaultRate,
        occupied: false, customerName: "", hoursBooked: 0,
        sessionStartMin: 0, sessionEndMin: 0, payout: 0,
        isArcade: true
      });
    }
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
      today: { served: 0, revenue: 0, lost: 0 },
      shop: {
        fastServe: false, revenueBoost: false, customerBoost: false, autoAccept: false,
        fiberInternet: false, airCon: false, vipProgram: false, loyaltyCard: false,
        generator: false, adCampaign: false, security: false, onlineReservation: false
      },
      rebirths: 0,
      shopTier: 0,
      tiktokClaimed: false,
      whatsappClaimed: false,
      xp: 0,
      level: 1,
      achievements: {},
      flawlessDayAchieved: false,
      vending: { drink: false, food: false, candy: false },
      vendingAccrued: 0,
      staff: { cleaner: false },
      rating: 7.0,
      rateUsClaimed: false,
      adBonusUsesToday: 0,
      vip: false,
      dailyStreak: 0,
      lastLoginDate: null
    };
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      var recoveredFromLegacyKey = null;
      if (!raw) {
        // Not found under the current key — check older key names before
        // concluding this is genuinely a first-time player.
        for (var i = 0; i < LEGACY_SAVE_KEYS.length; i++) {
          var legacyRaw = null;
          try { legacyRaw = localStorage.getItem(LEGACY_SAVE_KEYS[i]); } catch (e) {}
          if (legacyRaw) { raw = legacyRaw; recoveredFromLegacyKey = LEGACY_SAVE_KEYS[i]; break; }
        }
      }
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !parsed.stations) return null;
      // MIGRATION: the PC pool, the Reklamla Kazanılan VIP Bilgisayar pool,
      // the İOZ Playstion pool, the İOZ Araba Simülasyonu pool and the İOZ
      // Oyun Atarisi pool have all grown/appeared over updates. Rather than
      // checking exact historical lengths — which breaks the moment a count
      // changes again — split whatever the save has into its five pools by
      // isAdPc/isPS/isCar/isArcade and pad each up to its CURRENT target
      // independently. A save from any past version heals itself here with
      // zero lost progress, and this needs no further edits if any number
      // changes again later.
      var pcStations = parsed.stations.filter(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc; });
      var adPcStations = parsed.stations.filter(function (s) { return s.isAdPc; });
      var psStations = parsed.stations.filter(function (s) { return s.isPS; });
      var carStations = parsed.stations.filter(function (s) { return s.isCar; });
      var arcadeStations = parsed.stations.filter(function (s) { return s.isArcade; });
      while (pcStations.length < MAX_STATIONS) {
        pcStations.push({
          hasTable: false, hasComputer: false, computerLevel: 0, rate: DEFAULT_RATE,
          occupied: false, customerName: "", hoursBooked: 0,
          sessionStartMin: 0, sessionEndMin: 0, payout: 0, parts: {}
        });
      }
      pcStations.forEach(function (s) { if (!s.parts) s.parts = {}; });
      while (adPcStations.length < AD_PC_STATION_COUNT) {
        adPcStations.push({
          hasTable: false, hasComputer: false, computerLevel: 0, rate: DEFAULT_RATE,
          occupied: false, customerName: "", hoursBooked: 0,
          sessionStartMin: 0, sessionEndMin: 0, payout: 0, parts: {}, isAdPc: true
        });
      }
      adPcStations.forEach(function (s) { if (!s.parts) s.parts = {}; });
      while (psStations.length < PS_STATION_COUNT) {
        psStations.push({
          hasTable: false, hasComputer: false, computerLevel: 0, rate: PS_LEVELS[1].defaultRate,
          occupied: false, customerName: "", hoursBooked: 0,
          sessionStartMin: 0, sessionEndMin: 0, payout: 0, isPS: true
        });
      }
      while (carStations.length < CAR_STATION_COUNT) {
        carStations.push({
          hasTable: false, hasComputer: false, computerLevel: 0, rate: CAR_LEVELS[1].defaultRate,
          occupied: false, customerName: "", hoursBooked: 0,
          sessionStartMin: 0, sessionEndMin: 0, payout: 0, isCar: true
        });
      }
      while (arcadeStations.length < ARCADE_STATION_COUNT) {
        arcadeStations.push({
          hasTable: false, hasComputer: false, computerLevel: 0, rate: ARCADE_LEVELS[1].defaultRate,
          occupied: false, customerName: "", hoursBooked: 0,
          sessionStartMin: 0, sessionEndMin: 0, payout: 0, isArcade: true
        });
      }
      parsed.stations = pcStations.slice(0, MAX_STATIONS)
        .concat(adPcStations.slice(0, AD_PC_STATION_COUNT))
        .concat(psStations.slice(0, PS_STATION_COUNT))
        .concat(carStations.slice(0, CAR_STATION_COUNT))
        .concat(arcadeStations.slice(0, ARCADE_STATION_COUNT));
      if (parsed.stations.length !== MAX_STATIONS + AD_PC_STATION_COUNT + PS_STATION_COUNT + CAR_STATION_COUNT + ARCADE_STATION_COUNT) return null;

      // Fill in anything a older/partial save is missing so we never crash
      // on a field that didn't exist in a previous version.
      if (typeof parsed.day !== "number") parsed.day = 1;
      if (typeof parsed.clockMin !== "number") parsed.clockMin = DAY_OPEN_MIN;
      if (typeof parsed.reqSeq !== "number") parsed.reqSeq = 1;
      if (!parsed.today) parsed.today = { served: 0, revenue: 0, lost: 0 };
      if (!Array.isArray(parsed.requests)) parsed.requests = [];
      if (typeof parsed.nextRequestAtMin !== "number") parsed.nextRequestAtMin = parsed.clockMin + 4;
      if (!parsed.shop) parsed.shop = { fastServe: false, revenueBoost: false, customerBoost: false, autoAccept: false };
      if (typeof parsed.shop.fastServe !== "boolean") parsed.shop.fastServe = false;
      if (typeof parsed.shop.revenueBoost !== "boolean") parsed.shop.revenueBoost = false;
      if (typeof parsed.shop.customerBoost !== "boolean") parsed.shop.customerBoost = false;
      if (typeof parsed.shop.autoAccept !== "boolean") parsed.shop.autoAccept = false;
      if (typeof parsed.shop.fiberInternet !== "boolean") parsed.shop.fiberInternet = false;
      if (typeof parsed.shop.airCon !== "boolean") parsed.shop.airCon = false;
      if (typeof parsed.shop.vipProgram !== "boolean") parsed.shop.vipProgram = false;
      if (typeof parsed.shop.loyaltyCard !== "boolean") parsed.shop.loyaltyCard = false;
      if (typeof parsed.shop.generator !== "boolean") parsed.shop.generator = false;
      if (typeof parsed.shop.adCampaign !== "boolean") parsed.shop.adCampaign = false;
      if (typeof parsed.shop.security !== "boolean") parsed.shop.security = false;
      if (typeof parsed.shop.onlineReservation !== "boolean") parsed.shop.onlineReservation = false;
      if (typeof parsed.rebirths !== "number") parsed.rebirths = 0;
      if (typeof parsed.shopTier !== "number") parsed.shopTier = 0;
      if (typeof parsed.tiktokClaimed !== "boolean") parsed.tiktokClaimed = false;
      if (typeof parsed.whatsappClaimed !== "boolean") parsed.whatsappClaimed = false;
      if (typeof parsed.xp !== "number") parsed.xp = 0;
      if (typeof parsed.level !== "number") parsed.level = levelForXp(parsed.xp);
      if (!parsed.achievements || typeof parsed.achievements !== "object") parsed.achievements = {};
      if (typeof parsed.flawlessDayAchieved !== "boolean") parsed.flawlessDayAchieved = false;
      if (!parsed.vending) parsed.vending = { drink: false, food: false, candy: false };
      if (typeof parsed.vending.drink !== "boolean") parsed.vending.drink = false;
      if (typeof parsed.vending.food !== "boolean") parsed.vending.food = false;
      if (typeof parsed.vending.candy !== "boolean") parsed.vending.candy = false;
      if (typeof parsed.vendingAccrued !== "number") parsed.vendingAccrued = 0;
      if (!parsed.staff) parsed.staff = { cleaner: false };
      if (typeof parsed.staff.cleaner !== "boolean") parsed.staff.cleaner = false;
      if (typeof parsed.rating !== "number") parsed.rating = 7.0;
      if (typeof parsed.rateUsClaimed !== "boolean") parsed.rateUsClaimed = false;
      if (typeof parsed.adBonusUsesToday !== "number") parsed.adBonusUsesToday = 0;
      if (typeof parsed.vip !== "boolean") parsed.vip = false;
      if (typeof parsed.dailyStreak !== "number") parsed.dailyStreak = 0;
      if (typeof parsed.lastLoginDate !== "string") parsed.lastLoginDate = null;

      parsed.stations.forEach(function (s) {
        if (typeof s.computerLevel !== "number") s.computerLevel = s.hasComputer ? 1 : 0;
        if (typeof s.rate !== "number") {
          s.rate = s.hasComputer ? levelsFor(s)[s.computerLevel].defaultRate : DEFAULT_RATE;
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

      // If this save was recovered from an older key name, write it back
      // under the current key right away and drop the old copy — from here
      // on the player looks completely normal to every other function.
      if (recoveredFromLegacyKey) {
        try {
          localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
          localStorage.removeItem(recoveredFromLegacyKey);
        } catch (e) { /* ignore — worst case it re-recovers next launch */ }
      }

      return parsed;
    } catch (e) { return null; }
  }

  // ---------------------------------------------------------------- dom refs
  var $ = function (id) { return document.getElementById(id); };
  var screenLoading = $("screen-loading");
  var screenSetup = $("screen-setup");
  var screenUpdateRequired = $("screen-update-required");
  var btnUpdateNow = $("btn-update-now");
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
  var statPs = $("stat-ps");
  var statCar = $("stat-car");
  var statArcade = $("stat-arcade");
  var statAdPc = $("stat-ad-pc");
  var statLevel = $("stat-level");
  var statCustomers = $("stat-customers");
  var statToday = $("stat-today");
  var setupStartMoney = $("setup-start-money");
  var achvBanner = $("achv-banner");
  var achvBannerName = $("achv-banner-name");
  var achvBannerXp = $("achv-banner-xp");
  var achvList = $("achv-list");
  var levelNum = $("level-num");
  var levelNum2 = $("level-num-2");
  var xpBarFill = $("xp-bar-fill");
  var xpBarText = $("xp-bar-text");
  var psStoreList = $("ps-store-list");
  var statRating = $("stat-rating");
  var btnOpenRating = $("btn-open-rating");
  var modalRating = $("modal-rating");
  var btnCloseRating = $("btn-close-rating");
  var ratingHeroNum = $("rating-hero-num");
  var ratingBreakdown = $("rating-breakdown");
  var vendingStoreList = $("vending-store-list");
  var staffStoreList = $("staff-store-list");
  var rebirthStoreList = $("rebirth-store-list");
  var shopUpgradeStoreList = $("shop-upgrade-store-list");
  var modalChangelog = $("modal-changelog");
  var btnCloseChangelog = $("btn-close-changelog");
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
  var upgradeCarIcon = $("upgrade-car-icon");
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
  var btnOpenStore = $("btn-open-store");
  var modalStore = $("modal-store");
  var btnCloseStore = $("btn-close-store");
  var storeList = $("store-list");
  var btnTiktokClaim = $("btn-tiktok-claim");
  var vipBadge = $("vip-badge");
  var btnOpenVip = $("btn-open-vip");
  var btnOpenShopUpgrade = $("btn-open-shop-upgrade");
  var modalVip = $("modal-vip");
  var btnCloseVip = $("btn-close-vip");
  var btnBuyVip = $("btn-buy-vip");
  var vipOwnedBox = $("vip-owned-box");
  var vipPriceLabel = $("vip-price-label");
  var modalDaily = $("modal-daily-reward");
  var dailyRewardAmount = $("daily-reward-amount");
  var dailyRewardDayLabel = $("daily-reward-day-label");
  var dailyRewardTrack = $("daily-reward-track");
  var btnClaimDaily = $("btn-claim-daily");

  // (price-table / price-computer text is set live in renderHud(), since it
  // must reflect the current shop tier, not a fixed base price)

  // ---------------------------------------------------------------- helpers
  function fmtMoney(n) { return Math.round(n).toLocaleString("tr-TR"); }

  function fmtClock(totalMin) {
    var m = ((totalMin % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = Math.floor(m % 60);
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // Returns the correct level/spec table for a station — İOZ Playstion
  // units use PS_LEVELS, every other station uses COMPUTER_LEVELS. Every
  // lookup in the file goes through this so the two station types share
  // all the same rendering/pricing/upgrade code paths safely.
  function levelsFor(s) { return (s && s.isPS) ? PS_LEVELS : (s && s.isCar) ? CAR_LEVELS : (s && s.isArcade) ? ARCADE_LEVELS : COMPUTER_LEVELS; }
  function photosFor(s) { return (s && s.isPS) ? PS_PHOTOS : COMPUTER_PHOTOS; }
  // Car sim has no photo assets — every level is a custom inline SVG icon
  // instead (icon-car-lvl1/2/3), so the visual code checks this first.
  function isIconOnlyStation(s) { return !!(s && (s.isCar || s.isArcade)); }
  // "Fiber İnternet Altyapısı" dükkan ürünü: her seviyenin fiyat tavanını
  // kalıcı olarak +%25 yükseltir — müşteriler daha pahalı fiyata da razı
  // olur. Tek yerden hesaplanır ki fiyat kaydırıcısı, geri bildirim metni
  // ve müşteri kabul mantığı hep aynı tavanı görsün.
  function effectiveMaxAccept(lvl) {
    return state.shop.fiberInternet ? Math.round(lvl.maxAcceptRate * 1.25) : lvl.maxAcceptRate;
  }

  function countHasTable() { return state.stations.filter(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasTable; }).length; }
  function countHasComputer() { return state.stations.filter(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasComputer; }).length; }
  function countPsWithTable() { return state.stations.filter(function (s) { return s.isPS && s.hasTable; }).length; }
  function countPsWithConsole() { return state.stations.filter(function (s) { return s.isPS && s.hasComputer; }).length; }
  function countCarWithTable() { return state.stations.filter(function (s) { return s.isCar && s.hasTable; }).length; }
  function countCarWithConsole() { return state.stations.filter(function (s) { return s.isCar && s.hasComputer; }).length; }
  function countArcadeWithTable() { return state.stations.filter(function (s) { return s.isArcade && s.hasTable; }).length; }
  function countArcadeWithConsole() { return state.stations.filter(function (s) { return s.isArcade && s.hasComputer; }).length; }
  function countAdPcWithComputer() { return state.stations.filter(function (s) { return s.isAdPc && s.hasComputer; }).length; }

  // Yeniden Doğuş kalıcı bonusu: her yeniden doğuşta +%15, kalıcı olarak
  // birikir. Tüm gelir kaynaklarına (masa/PS ödemesi + otomat geliri)
  // revenueBoost ile birlikte uygulanır.
  function rebirthMultiplier() { return 1 + state.rebirths * 0.45; }
  // VIP: real-money one-time purchase, doubles every income source.
  function vipMultiplier() { return state.vip ? 2 : 1; }
  // Dükkan Geliştir: bir kerelik 300.000 ₺'lik satın alma. İşletmeyi
  // rebirth gibi sıfırlar (xp/seviye/başarım/toplam müşteri korunur) ama
  // kalıcı olarak tüm maliyetleri VE tüm geliri aynı oranda (3.5x)
  // büyütür — daha zor ama daha kazançlı "büyük dükkan" modu.
  var SHOP_UPGRADE_COST = 300000;
  var SHOP_TIER_MULTIPLIER = 3.5;
  function shopTierMultiplier() { return (state && state.shopTier) ? SHOP_TIER_MULTIPLIER : 1; }
  function tableCost() { return Math.round(TABLE_COST * shopTierMultiplier()); }
  function computerCost() { return Math.round(COMPUTER_COST * shopTierMultiplier()); }
  function psTableCost() { return Math.round(PS_TABLE_COST * shopTierMultiplier()); }
  function psConsoleCost() { return Math.round(PS_CONSOLE_COST * shopTierMultiplier()); }
  function carTableCost() { return Math.round(CAR_TABLE_COST * shopTierMultiplier()); }
  function carConsoleCost() { return Math.round(CAR_CONSOLE_COST * shopTierMultiplier()); }
  function arcadeTableCost() { return Math.round(ARCADE_TABLE_COST * shopTierMultiplier()); }
  function arcadeConsoleCost() { return Math.round(ARCADE_CONSOLE_COST * shopTierMultiplier()); }
  function upgradeCostFor(lvl) { return lvl.upgradeCost ? Math.round(lvl.upgradeCost * shopTierMultiplier()) : lvl.upgradeCost; }

  function dailyRunningCost() {
    var total = DAILY_BASE_COST * shopTierMultiplier();
    state.stations.forEach(function (s) {
      if (s.hasComputer) total += (levelsFor(s)[s.computerLevel].dailyCost || 0) * shopTierMultiplier();
    });
    if (state.vending.drink) total += VENDING_DRINK_DAILY_COST;
    if (state.vending.food) total += VENDING_FOOD_DAILY_COST;
    if (state.vending.candy) total += VENDING_CANDY_DAILY_COST;
    if (state.staff.cleaner) total += CLEANER_DAILY_WAGE;
    // "Jeneratör / Enerji Verimliliği" dükkan ürünü: tüm günlük gideri
    // kalıcı olarak %25 azaltır.
    if (state.shop.generator) total = Math.round(total * 0.75);
    return total;
  }

  if (btnUpdateNow) {
    btnUpdateNow.addEventListener("click", function () {
      window.open(pendingUpdateUrl, "_system");
    });
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
    updateCheckPromise.then(function () {
      screenLoading.hidden = true;
      if (updateRequired) {
        screenUpdateRequired.hidden = false;
        return; // the rest of the game never boots — no save is touched
      }
      showInstagramPopup();
      setupStartMoney.textContent = fmtMoney(START_MONEY) + " ₺";
      var existing = load();
      if (existing && existing.cafeName) {
        state = existing;
        startGameScreen();
        maybeShowChangelog();
        // Re-confirm VIP entitlement with Google Play (covers reinstalls /
        // new devices — VIP isn't lost even if the local save is).
        Billing.restore(function (isVip) {
          if (isVip && !state.vip) {
            state.vip = true;
            save();
            renderHud();
            renderAdBonusButton();
          }
        });
      } else {
        screenSetup.hidden = false;
        nameInput.focus();
      }
    });
  }

  // ---------------------------------------------------------------- instagram promo popup
  // Deliberately shown on EVERY cold start (unlike the changelog, which is
  // once-per-version) — no "seen" flag, no save-file involvement at all.
  var modalInstagram = $("modal-instagram");
  var btnInstagramOpen = $("btn-instagram-open");
  var btnInstagramClose = $("btn-instagram-close");

  function showInstagramPopup() {
    if (!modalInstagram) return;
    modalInstagram.hidden = false;
  }
  if (btnInstagramClose) {
    btnInstagramClose.addEventListener("click", function () { modalInstagram.hidden = true; });
  }
  if (btnInstagramOpen) {
    btnInstagramOpen.addEventListener("click", function () { modalInstagram.hidden = true; });
  }

  // ---------------------------------------------------------------- what's new (v2)
  // Shown once, only to returning players who already had a save before
  // this update — a brand-new player has nothing to compare it to, so they
  // never see it. The "seen" flag lives outside the save file on purpose:
  // it's app-install-level state, not cafe-progress state.
  var CHANGELOG_VERSION = "5.0";
  var CHANGELOG_SEEN_KEY = "netcafe_changelog_seen";

  function maybeShowChangelog() {
    var seen = null;
    try { seen = localStorage.getItem(CHANGELOG_SEEN_KEY); } catch (e) {}
    if (seen === CHANGELOG_VERSION) return;
    modalChangelog.hidden = false;
    var left = 3;
    btnCloseChangelog.disabled = true;
    btnCloseChangelog.textContent = t("changelog.closeWithCount", { n: left });
    var iv = setInterval(function () {
      left -= 1;
      if (left <= 0) {
        clearInterval(iv);
        btnCloseChangelog.disabled = false;
        btnCloseChangelog.textContent = t("changelog.close");
      } else {
        btnCloseChangelog.textContent = t("changelog.closeWithCount", { n: left });
      }
    }, 1000);
  }

  btnCloseChangelog.addEventListener("click", function () {
    if (btnCloseChangelog.disabled) return;
    modalChangelog.hidden = true;
    try { localStorage.setItem(CHANGELOG_SEEN_KEY, CHANGELOG_VERSION); } catch (e) {}
  });

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
    else checkDailyReward();
    requestNotificationPermission();
  }

  // ---------------------------------------------------------------- rendering
  function renderHud() {
    checkAchievements();
    hudMoney.textContent = fmtMoney(state.money);
    hudTime.textContent = fmtClock(state.clockMin);
    hudDay.textContent = state.day;
    statTables.textContent = countHasTable() + "/" + MAX_STATIONS;
    statComputers.textContent = countHasComputer() + "/" + MAX_STATIONS;
    statPs.textContent = countPsWithConsole() + "/" + PS_STATION_COUNT;
    if (statCar) statCar.textContent = countCarWithConsole() + "/" + CAR_STATION_COUNT;
    if (statArcade) statArcade.textContent = countArcadeWithConsole() + "/" + ARCADE_STATION_COUNT;
    if (statAdPc) statAdPc.textContent = countAdPcWithComputer() + "/" + AD_PC_STATION_COUNT;
    statLevel.textContent = "Lv " + state.level;
    statRating.textContent = state.rating.toFixed(1);
    statCustomers.textContent = state.totalCustomers;
    statToday.textContent = fmtMoney(state.today.revenue) + " ₺";
    if (vipBadge) vipBadge.hidden = !state.vip;

    var tables = countHasTable();
    var computers = countHasComputer();
    var tCost = tableCost(), cCost = computerCost();
    $("price-table").textContent = fmtMoney(tCost) + " ₺";
    $("price-computer").textContent = fmtMoney(cCost) + " ₺";
    btnBuyTable.disabled = tables >= MAX_STATIONS || state.money < tCost;
    var hasBareTable = state.stations.some(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasTable && !s.hasComputer; });
    btnBuyComputer.disabled = !hasBareTable || computers >= MAX_STATIONS || state.money < cCost;
  }

  function stationStatusClass(s) {
    var cls = [];
    if (s.occupied) cls.push("occupied");
    else if (s.hasTable && s.hasComputer) cls.push("ready");
    else if (s.hasTable) cls.push("needs-computer");
    else cls.push("empty");
    if (s.isPS) {
      cls.push("is-ps");
      if (s.hasComputer && s.computerLevel >= 2) cls.push("ps-lvl" + Math.min(s.computerLevel, 5));
    } else if (s.isCar) {
      cls.push("is-car");
      if (s.hasComputer) cls.push("car-lvl" + Math.min(s.computerLevel, 3));
    } else if (s.isArcade) {
      cls.push("is-arcade");
      if (s.hasComputer) cls.push("arcade-lvl" + Math.min(s.computerLevel, 3));
    } else if (s.hasComputer && s.computerLevel >= 2) {
      cls.push("lvl" + s.computerLevel);
    }
    if (s.isAdPc) cls.push("is-ad-pc" + (s.hasTable ? "" : " ad-pc-empty"));
    return cls.join(" ");
  }

  var COMPUTER_PHOTOS = {
    1: "assets/computer-lvl1.jpg",
    2: "assets/computer-lvl2.jpg",
    3: "assets/computer-lvl3.jpg",
    4: "assets/computer-lvl4.jpg",
    5: "assets/computer-lvl5.jpg",
    6: "assets/computer-lvl6.jpg",
    7: "assets/computer-lvl7.jpg"
  };

  function stationVisualMarkup(s) {
    if (s.hasComputer) {
      var name = levelsFor(s)[s.computerLevel].name;
      if (isIconOnlyStation(s)) {
        var iconRef = levelsFor(s)[s.computerLevel].icon;
        var lvlCls = (s.isArcade ? "arcade-lvl" : "car-lvl") + Math.min(s.computerLevel, 3);
        return '<div class="station-car-frame ' + lvlCls + '">' +
          '<svg class="station-car-svg"><use href="#' + iconRef + '"/></svg>' +
          '</div>';
      }
      return '<div class="station-photo-frame">' +
        '<img class="station-photo" src="' + photosFor(s)[s.computerLevel] + '" alt="' + name + '">' +
        '</div>';
    }
    return '<svg class="i-24 station-bare-desk"><use href="#' + (s.isPS ? "icon-gamepad-mini" : s.isCar ? "icon-car-mini" : s.isArcade ? "icon-arcade-mini" : "icon-desk-mini") + '"/></svg>';
  }

  function renderFloor() {
    floor.innerHTML = "";
    state.stations.forEach(function (s, idx) {
      var el = document.createElement("div");
      el.className = "station " + stationStatusClass(s) + (s.isVip ? " is-vip" : "");
      el.dataset.index = idx;

      if (!s.hasTable) {
        el.innerHTML = s.isPS
          ? '<svg class="i-20 icon-plus"><use href="#icon-plus"/></svg>' +
            '<span class="station-label">' + t("floor.psTableEmpty") + '</span>'
          : s.isCar
          ? '<svg class="i-20 icon-plus"><use href="#icon-plus"/></svg>' +
            '<span class="station-label">' + t("floor.carTableEmpty") + '</span>'
          : s.isArcade
          ? '<svg class="i-20 icon-plus"><use href="#icon-plus"/></svg>' +
            '<span class="station-label">' + t("floor.arcadeTableEmpty") + '</span>'
          : s.isAdPc
          ? '<svg class="i-20"><use href="#icon-play"/></svg>' +
            '<span class="station-label">' + t("floor.adPcEmpty") + '</span>'
          : '<svg class="i-20 icon-plus"><use href="#icon-plus"/></svg>' +
            '<span class="station-label">' + t("floor.emptySpot") + '</span>';
      } else {
        var label = s.occupied ? s.customerName
          : (s.hasComputer ? levelsFor(s)[s.computerLevel].name : (s.isPS ? t("floor.noConsole") : s.isCar ? t("floor.noCar") : s.isArcade ? t("floor.noArcade") : t("floor.noComputer")));
        el.innerHTML =
          (s.isPS ? '<span class="ps-badge">PS</span>' : "") +
          (s.isCar ? '<span class="car-badge">SİM</span>' : "") +
          (s.isArcade ? '<span class="arcade-badge">ATARİ</span>' : "") +
          (s.isAdPc ? '<span class="ad-pc-badge">REKLAM</span>' : "") +
          (s.isVip ? '<span class="station-vip-badge">★</span>' : "") +
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
    renderAdBonusButton();

    // remove old cards
    Array.prototype.slice.call(requestsList.querySelectorAll(".req-card"))
      .forEach(function (n) { n.remove(); });

    requestsEmpty.hidden = list.length > 0;

    list.forEach(function (r) {
      var st = state.stations[r.stationIdx];
      var total = r.hours * st.rate;
      var left = r.expiresAtMin - state.clockMin;
      var pct = Math.max(0, Math.min(100, (left / currentPatience()) * 100));

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
      var pct = Math.max(0, Math.min(100, (left / currentPatience()) * 100));
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
    var lvl = levelsFor(s)[s.computerLevel];
    var ceiling = effectiveMaxAccept(lvl);
    if (s.rate > ceiling) return false;
    var fair = lvl.defaultRate;
    if (s.rate <= fair) return true;
    // between fair price and the ceiling, interest fades out linearly
    var over = (s.rate - fair) / (ceiling - fair);
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
    // "Müşteri Verimliliği" dükkan ürünü: +%50 müşteri trafiği (aralığı
    // kısaltarak daha sık istek üretir).
    if (state.shop.customerBoost) sizeBoost *= 1.5;
    if (state.shop.onlineReservation) sizeBoost *= 1.25;
    var gap = MAX_GAP_GAME_MIN / (demand * sizeBoost);
    gap = Math.max(MIN_GAP_GAME_MIN, Math.min(MAX_GAP_GAME_MIN, gap));
    // jitter so arrivals never feel metronomic
    gap = gap * (0.65 + Math.random() * 0.7);
    state.nextRequestAtMin = state.clockMin + gap;
  }

  function tryCreateRequest() {
    if (state.requests.length >= currentMaxPending()) { scheduleNextRequest(); return; }

    // "VIP Üyelik Programı" dükkan ürünü: gelen müşterilerin %15'i VIP
    // olarak gelir — fiyat tavanını hiç umursamaz, en pahalı masaya bile
    // oturur. Bu yüzden VIP için aday listesi normal fiyat/istek
    // filtresinden (customerWantsStation) tamamen ayrı hesaplanır.
    var isVip = state.shop.vipProgram && Math.random() < 0.15;

    var candidates = [];
    state.stations.forEach(function (s, idx) {
      if (state.requests.some(function (r) { return r.stationIdx === idx; })) return; // already requested
      if (isVip) {
        if (s.hasTable && s.hasComputer && !s.occupied) candidates.push(idx);
      } else if (customerWantsStation(s)) {
        candidates.push(idx);
      }
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
    // "Sadakat Kart Sistemi" dükkan ürünü ve VIP müşteriler daha uzun
    // oturur — 2-4 saat yerine normalde 1-3 saat.
    var longStay = isVip || state.shop.loyaltyCard;
    var hours = (longStay ? 2 : 1) + Math.floor(Math.random() * 3);
    var newId = state.reqSeq++;
    state.requests.push({
      id: newId,
      name: randPick(FIRST_NAMES),
      stationIdx: stationIdx,
      hours: hours,
      isVip: isVip,
      expiresAtMin: state.clockMin + currentPatience()
    });
    scheduleNextRequest();

    // "Otomatik Kabul" dükkan ürünü: istek oluşur oluşmaz otomatik onaylanır,
    // oyuncunun her seferinde dokunmasına gerek kalmaz.
    if (state.shop.autoAccept) approveRequest(newId);
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
      showToast(t("toast.stationFilledMeanwhile", { n: r.stationIdx + 1 }));
      return;
    }

    s.occupied = true;
    s.customerName = r.name;
    s.hoursBooked = r.hours;
    s.isVip = !!r.isVip;
    s.sessionStartMin = state.clockMin;
    // "Hızlı Servis" dükkan ürünü: müşteri hâlâ r.hours karşılığını öder
    // (fiyatlandırma/ekonomi değişmez) ama masada gerçekte geçirdiği süre
    // yarıya iner, yani masa çok daha hızlı boşalıp yeni müşteri alır.
    var durationMin = r.hours * 60 * (state.shop.fastServe ? 0.5 : 1);
    s.sessionEndMin = state.clockMin + durationMin;
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

      // otomatlar: saatlik pasif gelir, dakikaya bölünüp biriktirilir
      // (küçük step'lerde sürekli sıfıra yuvarlanmasın diye kalan pay
      // state.vendingAccrued'da tutulur, hiç kayıp olmaz)
      if (state.vending.drink || state.vending.food || state.vending.candy) {
        var perMin = 0;
        if (state.vending.drink) perMin += VENDING_DRINK_RATE_PER_HOUR / 60;
        if (state.vending.food) perMin += VENDING_FOOD_RATE_PER_HOUR / 60;
        if (state.vending.candy) perMin += VENDING_CANDY_RATE_PER_HOUR / 60;
        perMin *= rebirthMultiplier() * vipMultiplier() * shopTierMultiplier();
        state.vendingAccrued += perMin * step;
        var whole = Math.floor(state.vendingAccrued);
        if (whole > 0) {
          state.vendingAccrued -= whole;
          state.money += whole;
          state.today.revenue += whole;
        }
      }

      // finish any completed sessions
      state.stations.forEach(function (s, idx) {
        if (!s.occupied) return;
        if (state.clockMin >= s.sessionEndMin) {
          // "Gelir Artışı" dükkan ürünü (+%20) ve Yeniden Doğuş kalıcı
          // bonusu (+%15/doğuş) net kazanca birlikte uygulanır.
          var earned = s.payout * (state.shop.revenueBoost ? 1.2 : 1) * rebirthMultiplier() * vipMultiplier() * shopTierMultiplier() * partsMultiplier(s);
          earned = Math.round(earned);
          state.money += earned;
          state.today.revenue += earned;
          state.today.served += 1;
          state.totalCustomers += 1;
          spawnIncomePop(idx, earned);
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
    s.isVip = false;
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
      if (state.shop.revenueBoost) partial = Math.round(partial * 1.2);
      partial = Math.round(partial * rebirthMultiplier() * vipMultiplier() * shopTierMultiplier() * partsMultiplier(s));
      state.money += partial;
      state.today.revenue += partial;
      state.today.served += 1;
      state.totalCustomers += 1;
      clearSession(s);
    });

    // people still waiting at the door go home
    state.today.lost += state.requests.length;
    state.requests = [];

    // "Kusursuz Gün" başarımı: bugün hiç müşteri kaçırmadan kapandı mı?
    state.flawlessDayAchieved = state.today.lost === 0 && state.today.served > 0;

    // Dükkan puanı (0-10): kaybedilen müşteri oranı, temizlikçi ve klima
    // durumuna göre günlük bir hedef puan hesaplanır, mevcut puanla
    // harmanlanır (EMA) — tek kötü/iyi gün puanı aniden sıçratmaz.
    var totalToday = state.today.served + state.today.lost;
    var lostRatio = totalToday > 0 ? state.today.lost / totalToday : 0;
    var cleanBonus = state.staff.cleaner ? 1.5 : -1.5;
    var comfortBonus = (state.shop.airCon ? 1.0 : 0) + (state.shop.security ? 0.5 : 0);
    var target = 7 + cleanBonus + comfortBonus - lostRatio * 4;
    target = Math.max(0, Math.min(10, target));
    state.rating = Math.max(0, Math.min(10, state.rating * 0.75 + target * 0.25));

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
  //
  // FIX 2: the "no earning station" branch below could never actually fire
  // in practice — the starter station's hasTable/hasComputer are never
  // unset (there is no sell mechanic), so `earning` is always true from
  // day one onward, forever. That made bankruptcy dead code: the till
  // could go arbitrarily negative and the game would just keep running,
  // showing an ever-more-negative number with no way back and no game-over
  // screen. Added a second, reachable trigger: sustained deep debt (more
  // than 5 days of running costs underwater) now also ends the game.
  function isBankrupt() {
    var earning = state.stations.some(function (s) { return s.hasTable && s.hasComputer; });
    if (!earning && state.money < (tableCost() + computerCost())) return true;
    if (state.money < -5 * dailyRunningCost()) return true;
    return false;
  }

  function showBankrupt() {
    state.bankrupt = true;
    $("bankrupt-days").textContent = state.day;
    $("bankrupt-customers").textContent = state.totalCustomers;
    modalBankrupt.hidden = false;
    save();
  }

  btnBankruptRestart.addEventListener("click", function () {
    try {
      localStorage.removeItem(SAVE_KEY);
      LEGACY_SAVE_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
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
    dayModalTitle.textContent = t("day.titleWithNum", { day: state.day });
    dayServed.textContent = state.today.served;
    dayRevenue.textContent = fmtMoney(state.today.revenue) + " ₺";
    dayCosts.textContent = "-" + fmtMoney(costs) + " ₺";
    dayLost.textContent = state.today.lost;
    dayNet.textContent = (net >= 0 ? "+" : "") + fmtMoney(net) + " ₺";
    dayNet.style.color = net >= 0 ? "var(--gold)" : "var(--danger)";
    // VIP: no ad is shown at all — button just advances the day, and the
    // "reklam gösterilemedi" fallback UI never applies since Ads.showRewarded
    // is skipped entirely in the click handler below.
    // Non-VIP: ads only show every OTHER day (day 1→2 needs an ad, day
    // 2→3 is free, day 3→4 needs one again, ...) so players aren't hit
    // with a mandatory ad every single day.
    var nextDayLabel = $("btn-next-day-label");
    if (state.vip || isFreeDayTransition()) {
      if (nextDayLabel) nextDayLabel.textContent = state.vip ? t("day.continueVip") : t("day.continueFree");
      if (adHint) { adHint.hidden = false; adHint.textContent = state.vip ? t("vip.adFreeHint") : t("day.freeDayHint"); }
      if (adBlockedBox) adBlockedBox.hidden = true;
    } else {
      if (nextDayLabel) nextDayLabel.textContent = t("day.watchAd");
      if (adHint) { adHint.hidden = false; adHint.textContent = t("day.adHint"); }
    }
    modalDay.hidden = false;
  }

  // Odd day number → the upcoming transition (to day+1) is the "free" one.
  // Day 1→2 requires an ad, day 2→3 is free, day 3→4 requires one, etc.
  function isFreeDayTransition() { return state.day % 2 === 0; }

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

    // onDone(watchedFully, reason) is always called exactly once. reason is
    // only meaningful when watchedFully is false:
    //   "skipped"   -> the ad DID display (an impression was served, the
    //                  network gets paid) but the user closed it early.
    //   anything else (no_fill / init_timeout / show_failed / init_failed:*)
    //               -> the ad NEVER displayed at all. No impression, no
    //                  revenue. The caller must not treat this the same as
    //                  a watched/skipped ad.
    showRewarded: function (onDone) {
      var bridge = this.nativeBridge();
      if (bridge) {
        adOverlayText.textContent = t("ad.loading");
        adOverlaySub.textContent = t("ad.pleaseWait");
        adOverlay.hidden = false;
        bridge.showRewarded({ placementId: AD_PLACEMENT_ID })
          .then(function () { adOverlay.hidden = true; onDone(true, null); })
          .catch(function (err) {
            // no fill / network error / user closed early — continue anyway,
            // but surface WHY so it can be diagnosed without a computer.
            adOverlay.hidden = true;
            var raw = (err && (err.message || err.errorMessage || err)) || t("ad.unknown");
            var reasons = {
              no_fill: t("ad.reason.noFill"),
              init_timeout: t("ad.reason.initTimeout"),
              show_failed: t("ad.reason.showFailed"),
              skipped: t("ad.reason.skipped")
            };
            var msg = reasons[raw];
            if (!msg && raw.indexOf("init_failed:") === 0) {
              msg = t("ad.reason.initFailed", { detail: raw.replace("init_failed: ", "") });
            }
            if (!msg) msg = t("ad.reason.generic", { raw: raw });
            showToast(msg, 6000);
            onDone(false, raw);
          });
        return;
      }
      // ---- browser preview fallback: simulated 4-second rewarded ad ----
      adOverlay.hidden = false;
      adOverlayText.textContent = t("ad.previewPlaying");
      var left = 4;
      adOverlaySub.textContent = t("ad.secondsLeft", { n: left });
      var iv = setInterval(function () {
        left -= 1;
        if (left <= 0) {
          clearInterval(iv);
          adOverlay.hidden = true;
          onDone(true, null);
        } else {
          adOverlaySub.textContent = t("ad.secondsLeft", { n: left });
        }
      }, 1000);
    }
  };

  // ---------------------------------------------------------------- vip billing (real-money one-time purchase)
  // Same pattern as the Ads bridge above: a native Capacitor plugin named
  // "BillingBridge" (Google Play Billing Library) is registered in the APK
  // — see android-plugin/BillingBridge.kt. Here we only detect it and call
  // it; opened in a plain browser, we fall back to instantly granting VIP
  // so the flow can be tested without a signed build or real payment.
  var VIP_PRODUCT_ID = "vip_membership";
  var Billing = {
    nativeBridge: function () {
      return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.BillingBridge) || null;
    },
    // onDone(success, reason) is called exactly once. On success the
    // purchase has already been acknowledged/consumed by the native side.
    purchaseVip: function (onDone) {
      var bridge = this.nativeBridge();
      if (bridge) {
        bridge.purchaseVip({ productId: VIP_PRODUCT_ID })
          .then(function () { onDone(true, null); })
          .catch(function (err) {
            var raw = (err && (err.message || err.errorMessage || err)) || "unknown";
            onDone(false, raw);
          });
        return;
      }
      // ---- browser preview fallback: no real billing available here ----
      onDone(true, "preview");
    },
    // Re-checks entitlement with Google Play so a reinstall / new device
    // gets VIP back without paying again. Call this once on startup.
    restore: function (onDone) {
      var bridge = this.nativeBridge();
      if (!bridge || !bridge.restorePurchases) { onDone(false); return; }
      bridge.restorePurchases()
        .then(function (res) { onDone(!!(res && res.vip)); })
        .catch(function () { onDone(false); });
    }
  };

  function renderVipModal() {
    if (!state) return;
    var owned = !!state.vip;
    if (btnBuyVip) btnBuyVip.hidden = owned;
    if (vipOwnedBox) vipOwnedBox.hidden = !owned;
    // Show the real, localized Play Store price when available instead of
    // the hardcoded "100 ₺" placeholder (Google sets the local-currency
    // price for a given base price, so it won't always read exactly 100).
    var bridge = Billing.nativeBridge();
    if (!owned && bridge && bridge.getVipPrice && vipPriceLabel) {
      bridge.getVipPrice({ productId: VIP_PRODUCT_ID })
        .then(function (res) { if (res && res.price) vipPriceLabel.textContent = res.price; })
        .catch(function () { /* keep placeholder */ });
    }
  }

  if (btnOpenVip) {
    btnOpenVip.addEventListener("click", function () {
      renderVipModal();
      modalVip.hidden = false;
    });
  }
  if (btnCloseVip) {
    btnCloseVip.addEventListener("click", function () { modalVip.hidden = true; });
  }
  if (modalVip) {
    modalVip.addEventListener("click", function (e) { if (e.target === modalVip) modalVip.hidden = true; });
  }
  if (btnBuyVip) {
    btnBuyVip.addEventListener("click", function () {
      if (!state || state.vip) return;
      btnBuyVip.disabled = true;
      Billing.purchaseVip(function (success) {
        btnBuyVip.disabled = false;
        if (success) {
          state.vip = true;
          save();
          renderHud();
          renderVipModal();
          renderAdBonusButton();
          showToast(t("vip.purchased"));
        } else {
          showToast(t("vip.purchaseFailed"));
        }
      });
    });
  }

  // ---------------------------------------------------------------- daily login reward
  function checkDailyReward() {
    var today = todayDateStr();
    if (state.lastLoginDate === today) return; // already claimed today, stay quiet

    var yesterday = dateStrDaysAgo(1);
    var nextDay;
    if (state.lastLoginDate === yesterday) {
      nextDay = (state.dailyStreak % 7) + 1; // continues the streak, loops after day 7
    } else {
      nextDay = 1; // first login ever, or a gap of 2+ days — streak resets
    }
    pendingDailyRewardDay = nextDay;
    renderDailyRewardModal();
    modalDaily.hidden = false;
  }

  function renderDailyRewardModal() {
    if (!pendingDailyRewardDay) return;
    var amount = DAILY_REWARDS[pendingDailyRewardDay - 1];
    if (dailyRewardAmount) dailyRewardAmount.textContent = "+" + fmtMoney(amount) + " ₺";
    if (dailyRewardDayLabel) dailyRewardDayLabel.textContent = t("daily.dayLabel", { day: pendingDailyRewardDay });
    if (dailyRewardTrack) {
      dailyRewardTrack.innerHTML = "";
      DAILY_REWARDS.forEach(function (amt, i) {
        var dayNum = i + 1;
        var pip = document.createElement("div");
        pip.className = "daily-pip" +
          (dayNum === pendingDailyRewardDay ? " current" : "") +
          (dayNum < pendingDailyRewardDay ? " past" : "");
        pip.innerHTML = '<span class="daily-pip-day">' + dayNum + '</span><span class="daily-pip-amt">' + fmtMoney(amt) + '</span>';
        dailyRewardTrack.appendChild(pip);
      });
    }
  }

  if (btnClaimDaily) {
    btnClaimDaily.addEventListener("click", function () {
      if (!pendingDailyRewardDay || !state) return;
      var amount = DAILY_REWARDS[pendingDailyRewardDay - 1];
      state.money += amount;
      state.dailyStreak = pendingDailyRewardDay;
      state.lastLoginDate = todayDateStr();
      pendingDailyRewardDay = null;
      save();
      renderHud();
      modalDaily.hidden = true;
      showToast(t("daily.claimed", { amount: amount }));
    });
  }

  var AD_BONUS = 100;
  var adBlockedBox = $("ad-blocked-box");
  var adBlockedText = $("ad-blocked-text");
  var adHint = $("ad-hint");

  // ---------------------------------------------------------------- optional quick ad-bonus button
  // Separate from the mandatory day-transition ad above — this one is
  // opt-in, the player can tap it anytime requests are open, capped per
  // in-game day so it stays a nice-to-have rather than the whole economy.
  var AD_BONUS_QUICK_REWARD = 3000;
  var AD_BONUS_QUICK_DAILY_LIMIT = 3;
  var btnAdBonus = $("btn-ad-bonus");
  var adBonusLabel = $("ad-bonus-label");

  function renderAdBonusButton() {
    if (!state || !btnAdBonus) return;
    // VIP: "tüm reklamlar kaldırılır" — this opt-in bonus ad goes away too.
    if (state.vip) { btnAdBonus.hidden = true; return; }
    btnAdBonus.hidden = false;
    var left = AD_BONUS_QUICK_DAILY_LIMIT - state.adBonusUsesToday;
    if (left <= 0) {
      btnAdBonus.disabled = true;
      adBonusLabel.textContent = t("ad.dailyLimitReached");
    } else {
      btnAdBonus.disabled = false;
      adBonusLabel.textContent = "+" + fmtMoney(AD_BONUS_QUICK_REWARD) + " ₺ (" + left + ")";
    }
  }

  if (btnAdBonus) {
    btnAdBonus.addEventListener("click", function () {
      if (state.adBonusUsesToday >= AD_BONUS_QUICK_DAILY_LIMIT) return;
      btnAdBonus.disabled = true;
      Ads.showRewarded(function (watchedFully, reason) {
        if (watchedFully) {
          state.adBonusUsesToday += 1;
          state.money += AD_BONUS_QUICK_REWARD;
          renderHud();
          save();
          showToast(t("toast.adBonusQuick", { amount: fmtMoney(AD_BONUS_QUICK_REWARD) }));
        }
        // skipped or failed-to-show: no reward, no use consumed — let them
        // try again right away instead of burning one of their 3 uses.
        renderAdBonusButton();
      });
    });
  }

  // Shared tail of the day-transition, used both for the normal
  // watch-ad path and the VIP no-ad path below.
  function advanceToNextDay(withAdBonus) {
    modalDay.hidden = true;
    if (withAdBonus) {
      state.money += AD_BONUS;
      showToast(t("toast.adBonusDay", { amount: AD_BONUS }));
    }
    state.day += 1;
    state.clockMin = DAY_OPEN_MIN;
    state.dayOver = false;
    state.today = { served: 0, revenue: 0, lost: 0 };
    state.todayCosts = 0;
    state.adBonusUsesToday = 0;
    state.requests = [];
    state.nextRequestAtMin = DAY_OPEN_MIN + 4;
    lastTickAt = Date.now();
    renderFloor();
    renderRequests();
    renderAdBonusButton();
    renderHud();
    save();
  }

  btnNextDay.addEventListener("click", function () {
    // VIP: no ad, ever. Advance straight to the next day.
    // Non-VIP: every other day is also ad-free (see isFreeDayTransition).
    if (state.vip || isFreeDayTransition()) {
      advanceToNextDay(false);
      return;
    }

    btnNextDay.disabled = true;
    adBlockedBox.hidden = true;
    adHint.hidden = false;
    Ads.showRewarded(function (watchedFully, reason) {
      btnNextDay.disabled = false;

      // The ad never actually displayed (no internet, no fill, init
      // timeout, native error) — NO impression happened, so the day must
      // NOT advance. This is what stops "turn off WiFi, skip every ad,
      // keep playing for free" from working: without a network there is
      // simply no way past this screen anymore.
      if (!watchedFully && reason !== "skipped") {
        adBlockedBox.hidden = false;
        adHint.hidden = true;
        return;
      }

      // Either fully watched (bonus) or shown-but-skipped (still a served
      // impression, still earns revenue) — the day is allowed to proceed.
      advanceToNextDay(watchedFully);
    });
  });

  // ---------------------------------------------------------------- bulk price ("Fiyatlar")
  var modalBulkPrice = $("modal-bulk-price");
  var btnOpenBulkPrice = $("btn-open-bulk-price");
  var btnCloseBulkPrice = $("btn-close-bulk-price");
  var bulkPriceList = $("bulk-price-list");
  var bulkPriceEmpty = $("bulk-price-empty");

  function bulkPriceMax(levels, level) {
    return Math.ceil((effectiveMaxAccept(levels[level]) * 1.15) / 10) * 10;
  }

  function renderBulkPriceModal() {
    var groups = {};
    var order = [];
    state.stations.forEach(function (s, idx) {
      if (!s.hasComputer) return;
      var levels = levelsFor(s);
      var kind = s.isPS ? "ps" : (s.isCar ? "car" : (s.isArcade ? "arcade" : "pc"));
      var key = kind + "-" + s.computerLevel;
      if (!groups[key]) {
        groups[key] = {
          key: key, kind: kind, level: s.computerLevel, levels: levels,
          name: levels[s.computerLevel].name, count: 0, sampleRate: s.rate, indices: []
        };
        order.push(key);
      }
      groups[key].count += 1;
      groups[key].indices.push(idx);
    });

    bulkPriceList.innerHTML = "";
    bulkPriceEmpty.hidden = order.length > 0;

    order.forEach(function (key) {
      var g = groups[key];
      var max = bulkPriceMax(g.levels, g.level);
      var row = document.createElement("div");
      row.className = "bulk-price-row";
      row.innerHTML =
        '<div class="bulk-price-info">' +
          '<div class="bulk-price-name">' + g.name + '</div>' +
          '<div class="bulk-price-count">' + g.count + ' ' + t("bulk.unitSuffix") + '</div>' +
        '</div>' +
        '<input type="number" class="bulk-price-input" min="' + MIN_RATE + '" max="' + max + '" value="' + g.sampleRate + '" data-key="' + key + '">' +
        '<button class="bulk-price-apply" data-key="' + key + '">' + t("bulk.apply") + '</button>';
      bulkPriceList.appendChild(row);
    });

    // stash groups on the list element so the click handler below can read
    // indices without re-scanning state.stations every click.
    bulkPriceList._groups = groups;
  }

  if (btnOpenBulkPrice) {
    btnOpenBulkPrice.addEventListener("click", function () {
      renderBulkPriceModal();
      modalBulkPrice.hidden = false;
    });
  }
  if (btnCloseBulkPrice) {
    btnCloseBulkPrice.addEventListener("click", function () { modalBulkPrice.hidden = true; });
  }
  if (modalBulkPrice) {
    modalBulkPrice.addEventListener("click", function (e) { if (e.target === modalBulkPrice) modalBulkPrice.hidden = true; });
  }
  if (bulkPriceList) {
    bulkPriceList.addEventListener("click", function (e) {
      var btn = e.target.closest(".bulk-price-apply");
      if (!btn) return;
      var key = btn.dataset.key;
      var groups = bulkPriceList._groups || {};
      var g = groups[key];
      if (!g) return;
      var input = bulkPriceList.querySelector('.bulk-price-input[data-key="' + key + '"]');
      if (!input) return;
      var max = bulkPriceMax(g.levels, g.level);
      var val = Math.round(parseFloat(input.value));
      if (isNaN(val)) return;
      val = Math.max(MIN_RATE, Math.min(max, val));
      input.value = val;
      g.indices.forEach(function (idx) { state.stations[idx].rate = val; });
      renderFloor();
      save();
      showToast(t("bulk.applied", { name: g.name, count: g.count }));
    });
  }

  // ---------------------------------------------------------------- price editing
  floor.addEventListener("click", function (e) {
    var card = e.target.closest(".station");
    if (!card) return;
    var idx = parseInt(card.dataset.index, 10);
    var s = state.stations[idx];
    if (!s) return;
    if (s.isAdPc && !s.hasTable) { claimAdPcStation(idx); return; }
    if (!s.hasTable) return;
    openPriceModal(idx);
  });

  var adPcClaimBusy = false;
  function claimAdPcStation(idx) {
    if (adPcClaimBusy) return;
    var s = state.stations[idx];
    if (!s || !s.isAdPc || s.hasTable) return;
    adPcClaimBusy = true;
    Ads.showRewarded(function (watchedFully) {
      adPcClaimBusy = false;
      if (!watchedFully) return;
      s.hasTable = true;
      s.hasComputer = true;
      s.computerLevel = 1;
      s.rate = COMPUTER_LEVELS[1].defaultRate;
      renderFloor();
      renderHud();
      save();
      showToast(t("toast.adPcClaimed"));
    });
  }

  function applySliderRange(s) {
    var lvl = s.hasComputer ? levelsFor(s)[s.computerLevel] : levelsFor(s)[1];
    // headroom above the ceiling so the "too expensive" zone is reachable,
    // but the slider stays precise for the range that actually matters
    var max = Math.ceil((effectiveMaxAccept(lvl) * 1.15) / 10) * 10;
    priceSlider.min = MIN_RATE;
    priceSlider.max = max;
    priceScaleMin.textContent = MIN_RATE + " ₺";
    priceScaleMax.textContent = max + " ₺";
    if (parseInt(priceSlider.value, 10) > max) priceSlider.value = max;
  }

  function openPriceModal(idx) {
    editingStationIdx = idx;
    var s = state.stations[idx];
    priceModalTitle.textContent = (s.isPS ? t("price.psTitle") : s.isCar ? t("price.carTitle") : s.isArcade ? t("price.arcadeTitle") : t("price.tableTitle")) + " " + (idx + 1) + " " + t("price.feeSuffix");
    priceModalSub.textContent = s.hasComputer
      ? levelsFor(s)[s.computerLevel].name + " · " + t("price.setHourlyRate")
      : (s.isPS ? t("price.noConsoleYet") : s.isCar ? t("price.noCarYet") : s.isArcade ? t("price.noArcadeYet") : t("price.noComputerYet"));
    applySliderRange(s);
    priceSlider.value = s.rate;
    priceValue.textContent = s.rate;
    updatePriceFeedback();
    renderUpgradeCard(idx);
    modalPrice.hidden = false;
  }

  var partsUpgradePanel = $("parts-upgrade-panel");
  var partsUpgradeList = $("parts-upgrade-list");

  function renderUpgradeCard(idx) {
    var s = state.stations[idx];
    if (!s.hasComputer) { upgradeCard.hidden = true; if (partsUpgradePanel) partsUpgradePanel.hidden = true; return; }

    var levels = levelsFor(s);
    var cur = levels[s.computerLevel];
    upgradeCard.hidden = false;

    if (!cur.upgradeCost) {
      upgradeCard.classList.add("maxed");
      setUpgradeVisual(s, s.computerLevel);
      upgradeLabel.textContent = t("price.topLevel");
      upgradeName.textContent = cur.name;
      btnUpgradeStation.hidden = true;
      renderPartsPanel(idx);
      return;
    }

    if (partsUpgradePanel) partsUpgradePanel.hidden = true;
    var next = levels[s.computerLevel + 1];
    upgradeCard.classList.remove("maxed");
    setUpgradeVisual(s, s.computerLevel + 1);
    upgradeLabel.textContent = t("price.nextLevel");
    upgradeName.textContent = next.name;
    btnUpgradeStation.hidden = false;
    upgradeCost.textContent = fmtMoney(upgradeCostFor(cur)) + " ₺";
    btnUpgradeStation.disabled = state.money < upgradeCostFor(cur);
  }

  // Parça yükseltmeleri: sadece sıradan bilgisayar havuzu, sadece
  // İoz X 2030'a (level 7, en üst seviye) ulaşmış istasyonlarda görünür.
  function renderPartsPanel(idx) {
    if (!partsUpgradePanel || !partsUpgradeList) return;
    var s = state.stations[idx];
    if (!isPlainPc(s)) { partsUpgradePanel.hidden = true; return; }
    partsUpgradePanel.hidden = false;
    partsUpgradeList.innerHTML = PC_PARTS.map(function (p) {
      var owned = !!(s.parts && s.parts[p.id]);
      var cost = pcPartsCost(p);
      if (owned) {
        return '<div class="parts-item owned">' +
          '<div class="parts-item-info">' +
            '<div class="parts-item-name">' + p.name + '</div>' +
            '<div class="parts-item-desc">' + p.desc + '</div>' +
          '</div>' +
          '<div class="store-item-owned"><svg class="i-18"><use href="#icon-check"/></svg>' + t("parts.installed") + '</div>' +
        '</div>';
      }
      return '<div class="parts-item">' +
        '<div class="parts-item-info">' +
          '<div class="parts-item-name">' + p.name + ' <span class="parts-item-bonus">+' + Math.round(p.bonusPct * 100) + '%</span></div>' +
          '<div class="parts-item-desc">' + p.desc + '</div>' +
        '</div>' +
        '<button class="parts-buy-btn" data-part="' + p.id + '"' + (state.money < cost ? " disabled" : "") + '>' + fmtMoney(cost) + ' ₺</button>' +
      '</div>';
    }).join("");
  }

  if (partsUpgradeList) {
    partsUpgradeList.addEventListener("click", function (e) {
      var btn = e.target.closest(".parts-buy-btn");
      if (!btn || btn.disabled || editingStationIdx === null) return;
      var s = state.stations[editingStationIdx];
      if (!isPlainPc(s)) return;
      var part = PC_PARTS.filter(function (p) { return p.id === btn.dataset.part; })[0];
      if (!part || (s.parts && s.parts[part.id])) return;
      var cost = pcPartsCost(part);
      if (state.money < cost) return showToast(t("toast.notEnoughMoney"));
      state.money -= cost;
      if (!s.parts) s.parts = {};
      s.parts[part.id] = true;
      renderPartsPanel(editingStationIdx);
      renderHud();
      save();
      showToast(part.name + t("toast.installedSuffix"));
    });
  }

  // Car sim / arcade have no photo files — swap in the matching inline SVG
  // icon and hide the <img> instead. Every other station type keeps using
  // photos.
  function setUpgradeVisual(s, level) {
    if (isIconOnlyStation(s)) {
      upgradePhoto.hidden = true;
      upgradeCarIcon.hidden = false;
      var lvlCls = (s.isArcade ? "arcade-lvl" : "car-lvl") + Math.min(level, 3);
      upgradeCarIcon.className = "upgrade-photo upgrade-car-icon " + lvlCls;
      upgradeCarIcon.querySelector("use").setAttribute("href", "#" + levelsFor(s)[level].icon);
    } else {
      upgradeCarIcon.hidden = true;
      upgradePhoto.hidden = false;
      upgradePhoto.src = photosFor(s)[level];
    }
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
    priceModalSub.textContent = levelsFor(s)[s.computerLevel].name + " · " + t("price.setHourlyRate");
    updatePriceFeedback();
  });

  function updatePriceFeedback() {
    var rate = parseInt(priceSlider.value, 10);
    priceValue.textContent = rate;
    var s = state.stations[editingStationIdx];
    var lvl = s && s.hasComputer ? levelsFor(s)[s.computerLevel] : levelsFor(s)[1];
    var cls = "", msg = "";

    if (rate > effectiveMaxAccept(lvl)) {
      cls = "pricey";
      msg = "<strong>" + t("price.fb.tooExpensive") + "</strong> " + t("price.fb.tooExpensiveDesc", { name: lvl.name });
    } else if (rate > lvl.defaultRate * 1.35) {
      cls = "pricey";
      msg = "<strong>" + t("price.fb.high") + "</strong> " + t("price.fb.highDesc");
    } else if (rate < lvl.defaultRate * 0.7) {
      cls = "cheap";
      msg = "<strong>" + t("price.fb.cheap") + "</strong> " + t("price.fb.cheapDesc");
    } else {
      msg = "<strong>" + t("price.fb.balanced") + "</strong> " + t("price.fb.balancedDesc", { name: lvl.name });
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
      var ceiling = effectiveMaxAccept(levelsFor(s)[s.computerLevel]);
      state.requests = state.requests.filter(function (r) {
        if (r.stationIdx !== editingStationIdx) return true;
        if (newRate <= ceiling) return true;
        walkedOut++;
        return false;
      });
    }
    if (walkedOut > 0) {
      state.today.lost += walkedOut;
      showToast(t("toast.priceTooHighCustomerLeft"));
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
    if (countHasTable() >= MAX_STATIONS) return showToast(t("toast.maxTablesReached"));
    if (state.money < tableCost()) return showToast(t("toast.notEnoughMoney"));
    var slot = state.stations.find(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && !s.hasTable; });
    if (!slot) return;
    slot.hasTable = true;
    state.money -= tableCost();
    renderFloor(); renderHud(); save();
  });

  btnBuyComputer.addEventListener("click", function () {
    var slot = state.stations.find(function (s) { return !s.isPS && !s.isCar && !s.isArcade && !s.isAdPc && s.hasTable && !s.hasComputer; });
    if (!slot) return showToast(t("toast.addTableFirst"));
    if (countHasComputer() >= MAX_STATIONS) return showToast(t("toast.maxComputersReached"));
    if (state.money < computerCost()) return showToast(t("toast.notEnoughMoney"));
    slot.hasComputer = true;
    slot.computerLevel = 1;
    slot.rate = COMPUTER_LEVELS[1].defaultRate;
    state.money -= computerCost();
    renderFloor(); renderHud(); save();
  });

  // Per-station upgrade — called from the price modal's "Yükselt" button.
  // Works for both the PC pool and İOZ Playstion units: levelsFor(s) picks
  // the right spec table for whichever station this is.
  function upgradeStation(idx) {
    var s = state.stations[idx];
    if (!s || !s.hasComputer) return;
    var levels = levelsFor(s);
    var cur = levels[s.computerLevel];
    if (!cur.upgradeCost) return showToast(t("toast.alreadyMaxLevel"));
    var cost = upgradeCostFor(cur);
    if (state.money < cost) return showToast(t("toast.notEnoughMoney"));
    state.money -= cost;
    s.computerLevel += 1;
    // bump the price toward the new machine's market rate, but never
    // below what the owner already had it set to
    s.rate = Math.max(s.rate, levels[s.computerLevel].defaultRate);
    renderFloor(); renderHud(); save();
    showToast(t("toast.upgraded", { name: levels[s.computerLevel].name, rate: s.rate }));
  }

  // ---------------------------------------------------------------- dükkan (one-time perk purchases)
  // Each item is a permanent, one-time perk paid for with in-game ₺ (not
  // real money). Effects are wired directly into the simulation above:
  // fastServe -> approveRequest(), revenueBoost -> tick()/endDay() payouts,
  // customerBoost -> scheduleNextRequest(), autoAccept -> tryCreateRequest().
  var SHOP_ITEMS = [
    { id: "autoAccept", price: 800, icon: "icon-shop-auto" },
    { id: "fastServe", price: 8000, icon: "icon-shop-speed" },
    { id: "airCon", price: 8000, icon: "icon-shop-aircon" },
    { id: "adCampaign", price: 10000, icon: "icon-shop-megaphone" },
    { id: "fiberInternet", price: 12000, icon: "icon-shop-fiber" },
    { id: "revenueBoost", price: 15000, icon: "icon-shop-revenue" },
    { id: "loyaltyCard", price: 18000, icon: "icon-shop-loyalty" },
    { id: "customerBoost", price: 20000, icon: "icon-shop-customers" },
    { id: "generator", price: 20000, icon: "icon-shop-generator" },
    { id: "vipProgram", price: 30000, icon: "icon-shop-vip" },
    { id: "security", price: 35000, icon: "icon-shop-camera" },
    { id: "onlineReservation", price: 45000, icon: "icon-shop-reservation" }
  ];

  function renderShop() {
    if (!state) return;
    storeList.innerHTML = SHOP_ITEMS.map(function (item) {
      var owned = !!state.shop[item.id];
      var canAfford = state.money >= item.price;
      return (
        '<div class="store-item' + (owned ? " owned" : "") + '">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#' + item.icon + '"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("shop." + item.id + ".name") + '</div>' +
            '<div class="store-item-desc">' + t("shop." + item.id + ".desc") + '</div>' +
          '</div>' +
          (owned
            ? '<div class="store-item-owned"><svg class="i-18"><use href="#icon-check"/></svg>' + t("store.owned") + '</div>'
            : '<button class="store-item-buy" data-id="' + item.id + '"' + (canAfford ? "" : " disabled") + '>' +
                fmtMoney(item.price) + ' ₺</button>') +
        '</div>'
      );
    }).join("");
  }

  btnOpenStore.addEventListener("click", function () {
    renderShop();
    renderPsSection();
    renderCarSection();
    renderArcadeSection();
    renderVendingSection();
    renderStaffSection();
    renderRebirthSection();
    renderShopUpgradeSection();
    modalStore.hidden = false;
  });

  function switchStoreTab(tab) {
    var storeTabsEl = $("store-tabs");
    if (storeTabsEl) {
      Array.prototype.slice.call(storeTabsEl.querySelectorAll(".store-tab")).forEach(function (b) {
        b.classList.toggle("is-active", b.dataset.tab === tab);
      });
    }
    Array.prototype.slice.call(document.querySelectorAll(".store-tab-panel")).forEach(function (panel) {
      panel.hidden = panel.dataset.tabPanel !== tab;
    });
  }

  if (btnOpenShopUpgrade) {
    btnOpenShopUpgrade.addEventListener("click", function () {
      renderShop();
      renderPsSection();
      renderCarSection();
      renderArcadeSection();
      renderVendingSection();
      renderStaffSection();
      renderRebirthSection();
      renderShopUpgradeSection();
      modalStore.hidden = false;
      switchStoreTab("upgrade");
    });
  }

  // ---- store modal tabs: one category visible at a time instead of six
  // stacked sections — everything still renders underneath, switching is
  // instant, nothing is removed, just no longer all shown at once.
  var storeTabs = $("store-tabs");
  if (storeTabs) {
    storeTabs.addEventListener("click", function (e) {
      var btn = e.target.closest(".store-tab");
      if (!btn) return;
      switchStoreTab(btn.dataset.tab);
    });
  }
  btnCloseStore.addEventListener("click", function () { modalStore.hidden = true; });
  modalStore.addEventListener("click", function (e) { if (e.target === modalStore) modalStore.hidden = true; });

  storeList.addEventListener("click", function (e) {
    var btn = e.target.closest(".store-item-buy");
    if (!btn || btn.disabled) return;
    var id = btn.dataset.id;
    var item = SHOP_ITEMS.filter(function (it) { return it.id === id; })[0];
    if (!item || state.shop[id]) return;
    if (state.money < item.price) return showToast(t("toast.notEnoughMoney"));
    state.money -= item.price;
    state.shop[id] = true;
    renderShop();
    renderHud();
    save();
    showToast(t("shop." + item.id + ".name") + t("toast.purchasedSuffix"));
  });

  // ---------------------------------------------------------------- tiktok reward
  // Honor-system reward, but no longer a free instant-click: the app can't
  // verify a follow/rating server-side, so instead it requires the player to
  // actually LEAVE the app (tap the real TikTok/Play Store link, which
  // backgrounds this app) and come back before the claim button unlocks.
  // Clicking straight through without ever leaving no longer pays out.
  var TIKTOK_REWARD = 300;
  var TIKTOK_HANDLE = "iozgames";
  var SOCIAL_MIN_AWAY_MS = 2500;
  var socialGate = {
    tiktok: { armed: false, verified: false },
    rateus: { armed: false, verified: false }
  };
  var socialHiddenAt = 0;

  function renderTiktokClaim() {
    if (!state || !btnTiktokClaim) return;
    if (state.tiktokClaimed) {
      btnTiktokClaim.textContent = t("social.rewardClaimed");
      btnTiktokClaim.disabled = true;
    } else if (socialGate.tiktok.verified) {
      btnTiktokClaim.textContent = t("social.claimReward", { amount: TIKTOK_REWARD });
      btnTiktokClaim.disabled = false;
    } else {
      btnTiktokClaim.textContent = t("social.followFirst");
      btnTiktokClaim.disabled = true;
    }
  }

  var tiktokFollowLink = document.querySelector(".tiktok-follow-btn");
  if (tiktokFollowLink) {
    tiktokFollowLink.addEventListener("click", function () {
      socialGate.tiktok.armed = true;
    });
  }

  if (btnTiktokClaim) {
    btnTiktokClaim.addEventListener("click", function () {
      if (!state || state.tiktokClaimed || !socialGate.tiktok.verified) return;
      state.tiktokClaimed = true;
      state.money += TIKTOK_REWARD;
      renderTiktokClaim();
      renderHud();
      save();
      showToast(t("toast.tiktokThanks", { amount: TIKTOK_REWARD }));
    });
  }

  // ---------------------------------------------------------------- "Bizi Değerlendir" (Play Store)
  var btnRateUsOpen = $("btn-rate-us-open");
  var btnRateUsClaim = $("btn-rate-us-claim");

  function renderRateUsButtons() {
    if (!state) return;
    if (btnRateUsClaim) {
      if (state.rateUsClaimed) {
        btnRateUsClaim.textContent = t("social.rewardClaimed");
        btnRateUsClaim.disabled = true;
      } else if (socialGate.rateus.verified) {
        btnRateUsClaim.textContent = t("social.claimReward", { amount: RATE_US_REWARD });
        btnRateUsClaim.disabled = false;
      } else {
        btnRateUsClaim.textContent = t("social.rateFirst");
        btnRateUsClaim.disabled = true;
      }
    }
  }

  if (btnRateUsOpen) {
    btnRateUsOpen.addEventListener("click", function () {
      socialGate.rateus.armed = true;
    });
  }

  if (btnRateUsClaim) {
    btnRateUsClaim.addEventListener("click", function () {
      if (!state || state.rateUsClaimed || !socialGate.rateus.verified) return;
      state.rateUsClaimed = true;
      state.money += RATE_US_REWARD;
      renderRateUsButtons();
      renderHud();
      save();
      showToast(t("toast.rateUsThanks", { amount: RATE_US_REWARD }));
    });
  }

  // Fires when the player actually leaves (TikTok app, Play Store, another
  // app, screen lock — anything that backgrounds this WebView) and comes
  // back. Only an armed gate that was away for a real, human-plausible
  // amount of time gets verified — a same-tick tap can't fake it.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      socialHiddenAt = Date.now();
      return;
    }
    if (!socialHiddenAt) return;
    var awayMs = Date.now() - socialHiddenAt;
    socialHiddenAt = 0;
    if (awayMs < SOCIAL_MIN_AWAY_MS) return;
    if (socialGate.tiktok.armed) { socialGate.tiktok.armed = false; socialGate.tiktok.verified = true; renderTiktokClaim(); }
    if (socialGate.rateus.armed) { socialGate.rateus.armed = false; socialGate.rateus.verified = true; renderRateUsButtons(); }
  });

  // ---------------------------------------------------------------- İOZ Playstion (dükkan)
  function renderPsSection() {
    if (!state || !psStoreList) return;
    var html = "";
    state.stations.forEach(function (s, idx) {
      if (!s.isPS) return;
      var slotNum = idx - MAX_STATIONS + 1; // 1, 2
      if (!s.hasTable) {
        html += '<div class="store-item">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#icon-gamepad-mini"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("ps.tableName", { n: slotNum }) + '</div>' +
            '<div class="store-item-desc">' + t("ps.tableDesc") + '</div>' +
          '</div>' +
          '<button class="ps-action-btn" data-action="ps-table" data-idx="' + idx + '"' +
            (state.money < psTableCost() ? " disabled" : "") + '>' + fmtMoney(psTableCost()) + ' ₺</button>' +
        '</div>';
      } else if (!s.hasComputer) {
        html += '<div class="store-item">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#icon-gamepad-mini"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("ps.consoleSetupName") + '</div>' +
            '<div class="store-item-desc">' + t("ps.consoleSetupDesc", { n: slotNum }) + '</div>' +
          '</div>' +
          '<button class="ps-action-btn" data-action="ps-console" data-idx="' + idx + '"' +
            (state.money < psConsoleCost() ? " disabled" : "") + '>' + fmtMoney(psConsoleCost()) + ' ₺</button>' +
        '</div>';
      } else {
        var lvl = PS_LEVELS[s.computerLevel];
        if (lvl.upgradeCost) {
          html += '<div class="store-item">' +
            '<div class="store-item-icon"><svg class="i-28"><use href="#icon-gamepad-mini"/></svg></div>' +
            '<div class="store-item-info">' +
              '<div class="store-item-name">' + lvl.name + ' → ' + PS_LEVELS[s.computerLevel + 1].name + '</div>' +
              '<div class="store-item-desc">' + t("ps.upgradeDesc", { n: slotNum }) + '</div>' +
            '</div>' +
            '<button class="ps-action-btn" data-action="ps-upgrade" data-idx="' + idx + '"' +
              (state.money < upgradeCostFor(lvl) ? " disabled" : "") + '>' + fmtMoney(upgradeCostFor(lvl)) + ' ₺</button>' +
          '</div>';
        } else {
          html += '<div class="store-item owned">' +
            '<div class="store-item-icon"><svg class="i-28"><use href="#icon-gamepad-mini"/></svg></div>' +
            '<div class="store-item-info">' +
              '<div class="store-item-name">' + lvl.name + '</div>' +
              '<div class="store-item-desc">' + t("ps.maxedDesc", { n: slotNum }) + '</div>' +
            '</div>' +
            '<div class="store-item-owned"><svg class="i-18"><use href="#icon-check"/></svg>' + t("ps.ready") + '</div>' +
          '</div>';
        }
      }
    });
    psStoreList.innerHTML = html;
  }

  if (psStoreList) {
    psStoreList.addEventListener("click", function (e) {
      var btn = e.target.closest(".ps-action-btn");
      if (!btn || btn.disabled) return;
      var idx = parseInt(btn.dataset.idx, 10);
      var s = state.stations[idx];
      if (!s) return;
      var action = btn.dataset.action;
      if (action === "ps-table") {
        if (state.money < psTableCost()) return showToast(t("toast.notEnoughMoney"));
        s.hasTable = true;
        state.money -= psTableCost();
        showToast(t("toast.psTableBuilt"));
      } else if (action === "ps-console") {
        if (state.money < psConsoleCost()) return showToast(t("toast.notEnoughMoney"));
        s.hasComputer = true;
        s.computerLevel = 1;
        s.rate = PS_LEVELS[1].defaultRate;
        state.money -= psConsoleCost();
        showToast(t("toast.psConsoleInstalled"));
      } else if (action === "ps-upgrade") {
        upgradeStation(idx);
      }
      renderPsSection();
      renderFloor();
      renderHud();
      save();
    });
  }

  // ---------------------------------------------------------------- İOZ Araba Simülasyonu (dükkan)
  var carStoreList = $("car-store-list");

  function renderCarSection() {
    if (!state || !carStoreList) return;
    var html = "";
    state.stations.forEach(function (s, idx) {
      if (!s.isCar) return;
      var slotNum = idx - MAX_STATIONS - PS_STATION_COUNT + 1; // 1..10
      if (!s.hasTable) {
        html += '<div class="store-item">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#icon-car-mini"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("car.tableName", { n: slotNum }) + '</div>' +
            '<div class="store-item-desc">' + t("car.tableDesc") + '</div>' +
          '</div>' +
          '<button class="car-action-btn" data-action="car-table" data-idx="' + idx + '"' +
            (state.money < carTableCost() ? " disabled" : "") + '>' + fmtMoney(carTableCost()) + ' ₺</button>' +
        '</div>';
      } else if (!s.hasComputer) {
        html += '<div class="store-item">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#icon-car-mini"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("car.consoleSetupName") + '</div>' +
            '<div class="store-item-desc">' + t("car.consoleSetupDesc", { n: slotNum }) + '</div>' +
          '</div>' +
          '<button class="car-action-btn" data-action="car-console" data-idx="' + idx + '"' +
            (state.money < carConsoleCost() ? " disabled" : "") + '>' + fmtMoney(carConsoleCost()) + ' ₺</button>' +
        '</div>';
      } else {
        var lvl = CAR_LEVELS[s.computerLevel];
        if (lvl.upgradeCost) {
          html += '<div class="store-item">' +
            '<div class="store-item-icon"><svg class="i-28"><use href="#' + lvl.icon + '"/></svg></div>' +
            '<div class="store-item-info">' +
              '<div class="store-item-name">' + lvl.name + ' → ' + CAR_LEVELS[s.computerLevel + 1].name + '</div>' +
              '<div class="store-item-desc">' + t("car.upgradeDesc", { n: slotNum }) + '</div>' +
            '</div>' +
            '<button class="car-action-btn" data-action="car-upgrade" data-idx="' + idx + '"' +
              (state.money < upgradeCostFor(lvl) ? " disabled" : "") + '>' + fmtMoney(upgradeCostFor(lvl)) + ' ₺</button>' +
          '</div>';
        } else {
          html += '<div class="store-item owned">' +
            '<div class="store-item-icon"><svg class="i-28"><use href="#' + lvl.icon + '"/></svg></div>' +
            '<div class="store-item-info">' +
              '<div class="store-item-name">' + lvl.name + '</div>' +
              '<div class="store-item-desc">' + t("car.maxedDesc", { n: slotNum }) + '</div>' +
            '</div>' +
            '<div class="store-item-owned"><svg class="i-18"><use href="#icon-check"/></svg>' + t("car.ready") + '</div>' +
          '</div>';
        }
      }
    });
    carStoreList.innerHTML = html;
  }

  if (carStoreList) {
    carStoreList.addEventListener("click", function (e) {
      var btn = e.target.closest(".car-action-btn");
      if (!btn || btn.disabled) return;
      var idx = parseInt(btn.dataset.idx, 10);
      var s = state.stations[idx];
      if (!s) return;
      var action = btn.dataset.action;
      if (action === "car-table") {
        if (state.money < carTableCost()) return showToast(t("toast.notEnoughMoney"));
        s.hasTable = true;
        state.money -= carTableCost();
        showToast(t("toast.carTableBuilt"));
      } else if (action === "car-console") {
        if (state.money < carConsoleCost()) return showToast(t("toast.notEnoughMoney"));
        s.hasComputer = true;
        s.computerLevel = 1;
        s.rate = CAR_LEVELS[1].defaultRate;
        state.money -= carConsoleCost();
        showToast(t("toast.carConsoleInstalled"));
      } else if (action === "car-upgrade") {
        upgradeStation(idx);
      }
      renderCarSection();
      renderFloor();
      renderHud();
      save();
    });
  }

  // ---------------------------------------------------------------- İOZ Oyun Atarisi (dükkan)
  var arcadeStoreList = $("arcade-store-list");

  function renderArcadeSection() {
    if (!state || !arcadeStoreList) return;
    var html = "";
    state.stations.forEach(function (s, idx) {
      if (!s.isArcade) return;
      var slotNum = idx - MAX_STATIONS - PS_STATION_COUNT - CAR_STATION_COUNT + 1; // 1..10
      if (!s.hasTable) {
        html += '<div class="store-item">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#icon-arcade-mini"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("arcade.tableName", { n: slotNum }) + '</div>' +
            '<div class="store-item-desc">' + t("arcade.tableDesc") + '</div>' +
          '</div>' +
          '<button class="arcade-action-btn" data-action="arcade-table" data-idx="' + idx + '"' +
            (state.money < arcadeTableCost() ? " disabled" : "") + '>' + fmtMoney(arcadeTableCost()) + ' ₺</button>' +
        '</div>';
      } else if (!s.hasComputer) {
        html += '<div class="store-item">' +
          '<div class="store-item-icon"><svg class="i-28"><use href="#icon-arcade-mini"/></svg></div>' +
          '<div class="store-item-info">' +
            '<div class="store-item-name">' + t("arcade.consoleSetupName") + '</div>' +
            '<div class="store-item-desc">' + t("arcade.consoleSetupDesc", { n: slotNum }) + '</div>' +
          '</div>' +
          '<button class="arcade-action-btn" data-action="arcade-console" data-idx="' + idx + '"' +
            (state.money < arcadeConsoleCost() ? " disabled" : "") + '>' + fmtMoney(arcadeConsoleCost()) + ' ₺</button>' +
        '</div>';
      } else {
        var lvl = ARCADE_LEVELS[s.computerLevel];
        if (lvl.upgradeCost) {
          html += '<div class="store-item">' +
            '<div class="store-item-icon"><svg class="i-28"><use href="#' + lvl.icon + '"/></svg></div>' +
            '<div class="store-item-info">' +
              '<div class="store-item-name">' + lvl.name + ' → ' + ARCADE_LEVELS[s.computerLevel + 1].name + '</div>' +
              '<div class="store-item-desc">' + t("arcade.upgradeDesc", { n: slotNum }) + '</div>' +
            '</div>' +
            '<button class="arcade-action-btn" data-action="arcade-upgrade" data-idx="' + idx + '"' +
              (state.money < upgradeCostFor(lvl) ? " disabled" : "") + '>' + fmtMoney(upgradeCostFor(lvl)) + ' ₺</button>' +
          '</div>';
        } else {
          html += '<div class="store-item owned">' +
            '<div class="store-item-icon"><svg class="i-28"><use href="#' + lvl.icon + '"/></svg></div>' +
            '<div class="store-item-info">' +
              '<div class="store-item-name">' + lvl.name + '</div>' +
              '<div class="store-item-desc">' + t("arcade.maxedDesc", { n: slotNum }) + '</div>' +
            '</div>' +
            '<div class="store-item-owned"><svg class="i-18"><use href="#icon-check"/></svg>' + t("arcade.ready") + '</div>' +
          '</div>';
        }
      }
    });
    arcadeStoreList.innerHTML = html;
  }

  if (arcadeStoreList) {
    arcadeStoreList.addEventListener("click", function (e) {
      var btn = e.target.closest(".arcade-action-btn");
      if (!btn || btn.disabled) return;
      var idx = parseInt(btn.dataset.idx, 10);
      var s = state.stations[idx];
      if (!s) return;
      var action = btn.dataset.action;
      if (action === "arcade-table") {
        if (state.money < arcadeTableCost()) return showToast(t("toast.notEnoughMoney"));
        s.hasTable = true;
        state.money -= arcadeTableCost();
        showToast(t("toast.arcadeTableBuilt"));
      } else if (action === "arcade-console") {
        if (state.money < arcadeConsoleCost()) return showToast(t("toast.notEnoughMoney"));
        s.hasComputer = true;
        s.computerLevel = 1;
        s.rate = ARCADE_LEVELS[1].defaultRate;
        state.money -= arcadeConsoleCost();
        showToast(t("toast.arcadeConsoleInstalled"));
      } else if (action === "arcade-upgrade") {
        upgradeStation(idx);
      }
      renderArcadeSection();
      renderFloor();
      renderHud();
      save();
    });
  }

  // ---------------------------------------------------------------- achievements / xp / level
  function checkAchievements() {
    if (!state || !state.achievements) return;
    ACHIEVEMENTS.forEach(function (ach) {
      if (state.achievements[ach.id]) return; // already unlocked
      var earned;
      try { earned = ach.check(state); } catch (e) { earned = false; }
      if (!earned) return;
      state.achievements[ach.id] = true;
      state.xp += ach.xp;
      var newLevel = levelForXp(state.xp);
      var leveledUp = newLevel > state.level;
      state.level = newLevel;
      queueAchievementBanner(ach, leveledUp);
      if (leveledUp) {
        var bonus = newLevel * 300;
        state.money += bonus;
      }
    });
  }

  var achvQueue = [];
  var achvBannerBusy = false;

  function queueAchievementBanner(ach, leveledUp) {
    achvQueue.push({ ach: ach, leveledUp: leveledUp });
    if (!achvBannerBusy) showNextAchievementBanner();
  }

  function showNextAchievementBanner() {
    if (achvQueue.length === 0) { achvBannerBusy = false; return; }
    achvBannerBusy = true;
    var item = achvQueue.shift();
    achvBannerName.textContent = t("achv." + item.ach.id + ".name");
    achvBannerXp.textContent = "+" + item.ach.xp + " XP";
    achvBanner.classList.remove("achv-banner-show");
    achvBanner.hidden = false;
    // force reflow so the animation class re-triggers for back-to-back unlocks
    void achvBanner.offsetWidth;
    achvBanner.classList.add("achv-banner-show");
    if (item.leveledUp) {
      showToast(t("toast.levelUp", { level: state.level, bonus: state.level * 300 }));
    }
    setTimeout(function () {
      achvBanner.classList.remove("achv-banner-show");
      setTimeout(function () {
        achvBanner.hidden = true;
        showNextAchievementBanner();
      }, 300);
    }, 3200);
  }

  function renderAchievementsTab() {
    if (!state || !achvList) return;
    levelNum.textContent = state.level;
    levelNum2.textContent = state.level;
    var curThresh = LEVEL_THRESHOLDS[state.level - 1] || 0;
    var nextThresh = LEVEL_THRESHOLDS[state.level] || null;
    if (nextThresh === null) {
      xpBarFill.style.width = "100%";
      xpBarText.textContent = state.xp + " XP · " + t("level.maxReached");
    } else {
      var span = nextThresh - curThresh;
      var into = state.xp - curThresh;
      var pct = span > 0 ? Math.max(0, Math.min(100, (into / span) * 100)) : 100;
      xpBarFill.style.width = pct + "%";
      xpBarText.textContent = state.xp + " / " + nextThresh + " XP";
    }

    achvList.innerHTML = ACHIEVEMENTS.map(function (ach) {
      var unlocked = !!state.achievements[ach.id];
      return '<div class="achv-item' + (unlocked ? " unlocked" : "") + '">' +
        '<div class="achv-item-icon"><svg class="i-20"><use href="#icon-trophy"/></svg></div>' +
        '<div class="achv-item-info">' +
          '<div class="achv-item-name">' + t("achv." + ach.id + ".name") + '</div>' +
          '<div class="achv-item-desc">' + t("achv." + ach.id + ".desc") + '</div>' +
        '</div>' +
        '<div class="achv-item-xp">' + (unlocked ? "✓" : "+" + ach.xp + " XP") + '</div>' +
      '</div>';
    }).join("");
  }

  // ---------------------------------------------------------------- otomatlar (vending)
  var VENDING_ITEMS = {
    drink: { cost: VENDING_DRINK_COST, rate: VENDING_DRINK_RATE_PER_HOUR, icon: "icon-drink", nameKey: "vending.drink.name", descKey: "vending.drink.desc" },
    food: { cost: VENDING_FOOD_COST, rate: VENDING_FOOD_RATE_PER_HOUR, icon: "icon-snack", nameKey: "vending.food.name", descKey: "vending.food.desc" },
    candy: { cost: VENDING_CANDY_COST, rate: VENDING_CANDY_RATE_PER_HOUR, icon: "icon-candy", nameKey: "vending.candy.name", descKey: "vending.candy.desc" }
  };
  function renderVendingSection() {
    if (!state || !vendingStoreList) return;
    var items = ["drink", "food", "candy"].map(function (id) {
      var v = VENDING_ITEMS[id];
      return { id: id, name: t(v.nameKey), desc: t(v.descKey, { rate: v.rate }), cost: v.cost, icon: v.icon };
    });
    vendingStoreList.innerHTML = items.map(function (item) {
      var owned = !!state.vending[item.id];
      var canAfford = state.money >= item.cost;
      return '<div class="store-item' + (owned ? " owned" : "") + '">' +
        '<div class="store-item-icon"><svg class="i-28"><use href="#' + item.icon + '"/></svg></div>' +
        '<div class="store-item-info">' +
          '<div class="store-item-name">' + item.name + '</div>' +
          '<div class="store-item-desc">' + item.desc + '</div>' +
        '</div>' +
        (owned
          ? '<div class="store-item-owned"><svg class="i-18"><use href="#icon-check"/></svg>' + t("store.installed") + '</div>'
          : '<button class="vending-buy-btn" data-id="' + item.id + '"' + (canAfford ? "" : " disabled") + '>' +
              fmtMoney(item.cost) + ' ₺</button>') +
      '</div>';
    }).join("");
  }

  if (vendingStoreList) {
    vendingStoreList.addEventListener("click", function (e) {
      var btn = e.target.closest(".vending-buy-btn");
      if (!btn || btn.disabled) return;
      var id = btn.dataset.id;
      var item = VENDING_ITEMS[id];
      if (!item || state.vending[id]) return;
      if (state.money < item.cost) return showToast(t("toast.notEnoughMoney"));
      state.money -= item.cost;
      state.vending[id] = true;
      renderVendingSection();
      renderHud();
      save();
      showToast(t(item.nameKey) + t("toast.installedSuffix"));
    });
  }

  // ---------------------------------------------------------------- personel (temizlikçi)
  function renderStaffSection() {
    if (!state || !staffStoreList) return;
    var hired = state.staff.cleaner;
    staffStoreList.innerHTML =
      '<div class="store-item' + (hired ? " owned" : "") + '">' +
        '<div class="store-item-icon"><svg class="i-28"><use href="#icon-broom"/></svg></div>' +
        '<div class="store-item-info">' +
          '<div class="store-item-name">' + t("staff.cleaner.name") + '</div>' +
          '<div class="store-item-desc">' +
            (hired
              ? t("staff.cleaner.descHired", { wage: CLEANER_DAILY_WAGE })
              : t("staff.cleaner.descToHire", { hire: fmtMoney(CLEANER_HIRE_COST), wage: CLEANER_DAILY_WAGE })) +
          '</div>' +
        '</div>' +
        (hired
          ? '<button class="vending-buy-btn staff-fire-btn" id="btn-fire-cleaner">' + t("staff.fire") + '</button>'
          : '<button class="vending-buy-btn" id="btn-hire-cleaner"' + (state.money < CLEANER_HIRE_COST ? " disabled" : "") + '>' +
              fmtMoney(CLEANER_HIRE_COST) + ' ₺</button>') +
      '</div>';

    var hireBtn = $("btn-hire-cleaner");
    if (hireBtn) hireBtn.addEventListener("click", function () {
      if (state.staff.cleaner) return;
      if (state.money < CLEANER_HIRE_COST) return showToast(t("toast.notEnoughMoney"));
      state.money -= CLEANER_HIRE_COST;
      state.staff.cleaner = true;
      renderStaffSection(); renderHud(); save();
      showToast(t("toast.cleanerHired"));
    });
    var fireBtn = $("btn-fire-cleaner");
    if (fireBtn) fireBtn.addEventListener("click", function () {
      state.staff.cleaner = false;
      renderStaffSection(); renderHud(); save();
      showToast(t("toast.cleanerFired"));
    });
  }

  // ---------------------------------------------------------------- yeniden doğuş (rebirth)
  // Prestige mekaniği: tüm masa/bilgisayarları kurup 20. güne ulaşan
  // oyuncu, işletmesini sıfırlayıp kalıcı bir gelir bonusu karşılığında
  // yeniden başlayabilir. Bonus (+%15/doğuş) kalıcıdır ve birikir —
  // başarımlar, seviye/XP, toplam müşteri sayısı ve sosyal ödül talepleri
  // KORUNUR, sadece kasa/masa/dükkan/gün sıfırlanır.
  var REBIRTH_MIN_DAY = 20;

  function canRebirth() {
    return countHasTable() >= MAX_STATIONS && countHasComputer() >= MAX_STATIONS && state.day >= REBIRTH_MIN_DAY;
  }

  function doRebirth() {
    if (!canRebirth()) return;
    var newRebirths = state.rebirths + 1;
    var keep = {
      cafeName: state.cafeName,
      totalCustomers: state.totalCustomers,
      xp: state.xp,
      level: state.level,
      achievements: state.achievements,
      tiktokClaimed: state.tiktokClaimed,
      whatsappClaimed: state.whatsappClaimed,
      rateUsClaimed: state.rateUsClaimed,
      shopTier: state.shopTier,
      vip: state.vip
    };
    state = freshState();
    state.cafeName = keep.cafeName;
    state.totalCustomers = keep.totalCustomers;
    state.xp = keep.xp;
    state.level = keep.level;
    state.achievements = keep.achievements;
    state.tiktokClaimed = keep.tiktokClaimed;
    state.whatsappClaimed = keep.whatsappClaimed;
    state.rateUsClaimed = keep.rateUsClaimed;
    state.rebirths = newRebirths;
    state.shopTier = keep.shopTier;
    state.vip = keep.vip;

    modalStore.hidden = true;
    renderFloor(); renderRequests(); renderHud();
    save();
    showToast(t("rebirth.done", { pct: newRebirths * 45 }));
  }

  function renderRebirthSection() {
    if (!state || !rebirthStoreList) return;
    var eligible = canRebirth();
    var curPct = state.rebirths * 45;
    var nextPct = (state.rebirths + 1) * 45;
    var html =
      '<div class="rebirth-card">' +
        '<p class="rebirth-intro">' + t("rebirth.intro") + '</p>' +
        '<div class="rebirth-stats">' +
          '<div class="rebirth-stat"><span>' + t("rebirth.currentBonus") + '</span><strong>+%' + curPct + '</strong></div>' +
          '<div class="rebirth-stat"><span>' + t("rebirth.count") + '</span><strong>' + state.rebirths + '</strong></div>' +
        '</div>' +
        (eligible
          ? '<button id="btn-rebirth" class="btn btn-primary btn-block"><svg class="i-16"><use href="#icon-rebirth"/></svg> ' +
              t("rebirth.button") + ' (+%' + nextPct + ')</button>'
          : '<div class="rebirth-locked">' + t("rebirth.locked", { req: t("rebirth.lockedReq", { day: REBIRTH_MIN_DAY }) }) + '</div>') +
        '<div id="rebirth-confirm-box" class="rebirth-confirm-box" hidden>' +
          '<p class="rebirth-confirm-text">' + t("rebirth.confirmText", { pct: nextPct }) + '</p>' +
          '<div class="rebirth-confirm-actions">' +
            '<button id="btn-rebirth-cancel" class="btn-reset-cancel">' + t("rebirth.confirmCancel") + '</button>' +
            '<button id="btn-rebirth-confirm" class="btn-reset-confirm">' + t("rebirth.confirmYes") + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    rebirthStoreList.innerHTML = html;

    var btn = $("btn-rebirth");
    if (btn) btn.addEventListener("click", function () {
      btn.hidden = true;
      $("rebirth-confirm-box").hidden = false;
    });
    var cancelBtn = $("btn-rebirth-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", function () { renderRebirthSection(); });
    var confirmBtn = $("btn-rebirth-confirm");
    if (confirmBtn) confirmBtn.addEventListener("click", function () { doRebirth(); });
  }

  // ---------------------------------------------------------------- dükkan geliştir (shop upgrade tier)
  // Rebirth'e benzer ama gün/istasyon şartı yerine 300.000 ₺ karşılığında
  // satın alınan, kalıcı ve TEK SEFERLİK bir "büyük dükkan" yükseltmesi.
  // İşletmeyi rebirth gibi sıfırlar (xp/seviye/başarım/toplam müşteri/
  // rebirth sayısı KORUNUR) ve state.shopTier=1 yapar; bu bayrak sayesinde
  // tüm maliyetler VE tüm gelir kalıcı olarak SHOP_TIER_MULTIPLIER (3.5x)
  // ile çarpılır — aynı 80 istasyonluk düzen, çok daha büyük rakamlar.
  function canUpgradeShop() {
    return !state.shopTier && state.money >= SHOP_UPGRADE_COST;
  }

  function doShopUpgrade() {
    if (state.shopTier) return;
    if (state.money < SHOP_UPGRADE_COST) return showToast(t("toast.notEnoughMoney"));
    var keep = {
      cafeName: state.cafeName,
      totalCustomers: state.totalCustomers,
      xp: state.xp,
      level: state.level,
      achievements: state.achievements,
      tiktokClaimed: state.tiktokClaimed,
      whatsappClaimed: state.whatsappClaimed,
      rateUsClaimed: state.rateUsClaimed,
      rebirths: state.rebirths,
      vip: state.vip
    };
    state = freshState();
    state.cafeName = keep.cafeName;
    state.totalCustomers = keep.totalCustomers;
    state.xp = keep.xp;
    state.level = keep.level;
    state.achievements = keep.achievements;
    state.tiktokClaimed = keep.tiktokClaimed;
    state.whatsappClaimed = keep.whatsappClaimed;
    state.rateUsClaimed = keep.rateUsClaimed;
    state.rebirths = keep.rebirths;
    state.vip = keep.vip;
    state.shopTier = 1;

    modalStore.hidden = true;
    renderFloor(); renderRequests(); renderHud();
    save();
    showToast(t("upgrade.done", { mult: SHOP_TIER_MULTIPLIER }));
  }

  function renderShopUpgradeSection() {
    if (!state || !shopUpgradeStoreList) return;
    var html = '<div class="rebirth-card">';
    if (state.shopTier) {
      html +=
        '<p class="rebirth-intro">' + t("upgrade.introDone") + '</p>' +
        '<div class="rebirth-stats">' +
          '<div class="rebirth-stat"><span>' + t("upgrade.multiplier") + '</span><strong>x' + SHOP_TIER_MULTIPLIER + '</strong></div>' +
        '</div>';
    } else {
      var eligible = state.money >= SHOP_UPGRADE_COST;
      html +=
        '<p class="rebirth-intro">' + t("upgrade.intro", { mult: SHOP_TIER_MULTIPLIER }) + '</p>' +
        '<div class="rebirth-stats">' +
          '<div class="rebirth-stat"><span>' + t("upgrade.cost") + '</span><strong>' + fmtMoney(SHOP_UPGRADE_COST) + ' ₺</strong></div>' +
        '</div>' +
        '<button id="btn-shop-upgrade" class="btn btn-primary btn-block"' + (eligible ? "" : " disabled") + '>' +
          '<svg class="i-16"><use href="#icon-shop-upgrade"/></svg> ' + t("upgrade.button") + '</button>' +
        '<div id="shop-upgrade-confirm-box" class="rebirth-confirm-box" hidden>' +
          '<p class="rebirth-confirm-text">' + t("upgrade.confirmText", { cost: fmtMoney(SHOP_UPGRADE_COST), mult: SHOP_TIER_MULTIPLIER }) + '</p>' +
          '<div class="rebirth-confirm-actions">' +
            '<button id="btn-shop-upgrade-cancel" class="btn-reset-cancel">' + t("rebirth.confirmCancel") + '</button>' +
            '<button id="btn-shop-upgrade-confirm" class="btn-reset-confirm">' + t("upgrade.confirmYes") + '</button>' +
          '</div>' +
        '</div>';
    }
    html += '</div>';
    shopUpgradeStoreList.innerHTML = html;

    var btn = $("btn-shop-upgrade");
    if (btn) btn.addEventListener("click", function () {
      btn.hidden = true;
      $("shop-upgrade-confirm-box").hidden = false;
    });
    var cancelBtn = $("btn-shop-upgrade-cancel");
    if (cancelBtn) cancelBtn.addEventListener("click", function () { renderShopUpgradeSection(); });
    var confirmBtn2 = $("btn-shop-upgrade-confirm");
    if (confirmBtn2) confirmBtn2.addEventListener("click", function () { doShopUpgrade(); });
  }

  // ---------------------------------------------------------------- dükkan puanı (rating modal)
  function renderRatingModal() {
    if (!state) return;
    var r = state.rating;
    ratingHeroNum.textContent = r.toFixed(1);
    var lostRatioPct = state.today.served + state.today.lost > 0
      ? Math.round((state.today.lost / (state.today.served + state.today.lost)) * 100)
      : 0;
    ratingBreakdown.innerHTML =
      '<li><span>' + t("rating.cleaner") + '</span><strong class="' + (state.staff.cleaner ? "" : "neg") + '">' +
        (state.staff.cleaner ? t("rating.cleanerYes") : t("rating.cleanerNo")) + '</strong></li>' +
      '<li><span>' + t("rating.airCon") + '</span><strong class="' + (state.shop.airCon ? "" : "neg") + '">' +
        (state.shop.airCon ? t("rating.airConYes") : t("rating.airConNo")) + '</strong></li>' +
      '<li><span>' + t("rating.security") + '</span><strong class="' + (state.shop.security ? "" : "neg") + '">' +
        (state.shop.security ? t("rating.airConYes") : t("rating.airConNo")) + '</strong></li>' +
      '<li><span>' + t("rating.lostToday") + '</span><strong class="' + (lostRatioPct > 20 ? "neg" : "") + '">%' + lostRatioPct + '</strong></li>' +
      '<li><span>' + t("rating.servedToday") + '</span><strong>' + state.today.served + '</strong></li>';
  }

  btnOpenRating.addEventListener("click", function () {
    renderRatingModal();
    modalRating.hidden = false;
  });
  btnCloseRating.addEventListener("click", function () { modalRating.hidden = true; });
  modalRating.addEventListener("click", function (e) { if (e.target === modalRating) modalRating.hidden = true; });

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

  function showToast(msg, durationMs) {
    var el = document.createElement("div");
    el.className = "toast-msg";
    el.textContent = msg;
    toastLayer.appendChild(el);
    setTimeout(function () { el.remove(); }, durationMs || 1900);
  }

  // ---------------------------------------------------------------- info modal + reset
  var btnReset = $("btn-reset");
  var resetConfirm = $("reset-confirm");
  var btnResetCancel = $("btn-reset-cancel");
  var btnResetConfirm = $("btn-reset-confirm");

  // ---------------------------------------------------------------- real app version (Settings screen)
  // Shows whatever versionName is actually baked into this build (via
  // Capacitor's official @capacitor/app plugin) instead of a hand-typed
  // string here that can silently drift out of sync with the real APK/AAB.
  // Needs "npm install @capacitor/app && npx cap sync android" in the repo
  // — until that's added, getInfo() is simply undefined and this falls
  // back to the static translated "Sürüm 2.0" / "Version 2.0" text.
  var nativeVersionInfo = null;

  function renderSettingsVersion() {
    var el = document.querySelector(".settings-version");
    if (!el) return;
    var appPlugin = (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) || null;
    if (!appPlugin || !appPlugin.getInfo) { el.textContent = t("settings.version"); return; }
    if (nativeVersionInfo) {
      el.textContent = t("settings.versionPrefix") + " " + nativeVersionInfo.version;
      return;
    }
    appPlugin.getInfo().then(function (info) {
      nativeVersionInfo = info;
      el.textContent = t("settings.versionPrefix") + " " + info.version;
    }).catch(function () {
      el.textContent = t("settings.version");
    });
  }

  btnInfo.addEventListener("click", function () {
    renderSettingsStats();
    renderTiktokClaim();
    renderAchievementsTab();
    renderRateUsButtons();
    renderSettingsVersion();
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
      if (target === "achievements") renderAchievementsTab();
    });
  });

  function renderSettingsStats() {
    if (!state) return;
    var rows = [
      [t("stats.business"), state.cafeName],
      [t("stats.day"), String(state.day)],
      [t("stats.cash"), fmtMoney(state.money) + " ₺"],
      [t("stats.totalCustomers"), String(state.totalCustomers)],
      [t("stats.tablesComputers"), countHasTable() + " / " + countHasComputer()],
      [t("stats.dailyCost"), fmtMoney(dailyRunningCost()) + " ₺"]
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
    try {
      localStorage.removeItem(SAVE_KEY);
      LEGACY_SAVE_KEYS.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
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

  // ---------------------------------------------------------------- local notifications (daily comeback reminder)
  // Uses Capacitor's OFFICIAL @capacitor/local-notifications plugin — a
  // first-party plugin, so unlike UnityAdsBridge it needs no custom Kotlin.
  // To actually work in the app, this repo needs:
  //   npm install @capacitor/local-notifications
  //   npx cap sync android
  // run once, then rebuilt. Until that's done, window.Capacitor.Plugins
  // .LocalNotifications simply won't exist and every function here becomes
  // a harmless no-op — this never breaks the browser preview or a build
  // that doesn't have the plugin yet.
  var NOTIF_REMINDER_ID = 9001;
  var NOTIF_DELAY_HOURS = 20;
  var notifPermissionAsked = false;

  function notifPlugin() {
    return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
  }

  function requestNotificationPermission() {
    var plugin = notifPlugin();
    if (!plugin || notifPermissionAsked) return;
    notifPermissionAsked = true;
    plugin.requestPermissions().catch(function () { /* ignore */ });
  }

  function scheduleComebackNotification() {
    var plugin = notifPlugin();
    if (!plugin || !state) return;
    var fireAt = new Date(Date.now() + NOTIF_DELAY_HOURS * 60 * 60 * 1000);
    plugin.schedule({
      notifications: [{
        id: NOTIF_REMINDER_ID,
        title: t("notif.comebackTitle"),
        body: t("notif.comebackBody", { name: state.cafeName || "" }),
        schedule: { at: fireAt }
      }]
    }).catch(function () { /* ignore — a missed reminder is never worth crashing over */ });
  }

  function cancelComebackNotification() {
    var plugin = notifPlugin();
    if (!plugin) return;
    plugin.cancel({ notifications: [{ id: NOTIF_REMINDER_ID }] }).catch(function () { /* ignore */ });
  }

  // Schedule the reminder the moment the player leaves the app (tab hidden,
  // app backgrounded, screen locked); cancel it the moment they come back
  // so an already-open session never gets pinged.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) scheduleComebackNotification();
    else cancelComebackNotification();
  });

})();
