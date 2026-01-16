
export type Language = 'en' | 'tr';

export const TRANSLATIONS = {
  en: {
    title: "FLOWSTATE",
    moves: "MOVES",
    streak: "Day Streak",
    modes: {
      daily: "DAILY RUN",
      practice: "PRACTICE"
    },
    status: {
      req: "Req",
      bug: "Bug",
      initializing: "Initializing System...",
      uplink: "Establishing Uplink..."
    },
    buttons: {
      hint: "HINT",
      reset: "RESET",
      newLevel: "NEW LEVEL",
      share: "SHARE RESULT",
      next: "NEXT LEVEL",
      startDaily: "INITIATE DAILY RUN",
      startSim: "START SIMULATION",
      profile: "PROFILE",
      close: "CLOSE TERMINAL"
    },
    intro: {
      dailyTitle: "Daily Protocol",
      simTitle: "Simulation Mode",
      dailyMission: "MISSION: Connect the power source to the sink. Everyone gets the same grid today. Can you beat the global efficiency?",
      simMission: "TRAINING: Unlimited generated levels. Use this to practice advanced routing techniques.",
      li1: "Rotate pipes to guide flow.",
      li2: "Power all 'Req' nodes.",
      li3: "Avoid 'Bug' nodes.",
      li4: "Stuck? Ask the AI Operator for a hint.",
      todaysOrders: "TODAY'S ORDERS",
      streakBonus: "STREAK BONUS"
    },
    missions: {
        mission_speed: "Complete in under {target}s",
        mission_moves: "Finish in {target} moves or less",
        mission_nohint: "Use ZERO hints",
        mission_bonus: "Power all BONUS nodes",
        complete: "COMPLETE",
        reward: "REWARD"
    },
    win: {
      title: "Sequence Complete",
      systemOnline: "System Online",
      calculating: "Calculating efficiency...",
      shareText: "Result copied to clipboard!",
      aiLog: "AI LOG"
    },
    logs: [
      "INITIALIZING HANDSHAKE...",
      "VERIFYING NODE INTEGRITY...",
      "BYPASSING SECURITY PROTOCOLS...",
      "OPTIMIZING POWER FLOW...",
      "DECRYPTING PAYLOAD...",
      "SYSTEM SYNCHRONIZATION: 100%"
    ],
    success: {
        system: "SYSTEM",
        online: "ONLINE",
        access: "ACCESS GRANTED"
    },
    shareTemplate: {
        daily: "Daily",
        practice: "Practice Run",
        moves: "Moves"
    },
    terminal: {
        header: "TERMINAL_OUTPUT_V4.0",
        upload: "UPLOAD_COMPLETE",
        analysis: "EFFICIENCY_ANALYSIS",
        time: "TIME_ELAPSED",
        badge: "NEW_PROTOCOL_DISCOVERED",
        rank: "OPERATOR_RANK",
        xp: "DATA_MINED",
        missions: "MISSION_REPORT",
        streak: "STREAK_MULTIPLIER"
    },
    badges: {
        NOVICE: { name: "Script Kiddie", desc: "First successful hack." },
        SPEED_DEMON: { name: "Speed Demon", desc: "Complete a run in under 30 seconds." },
        NETRUNNER: { name: "Netrunner", desc: "5 consecutive wins without hints." },
        ARCHITECT: { name: "System Architect", desc: "10 total successful runs." },
        CYBER_GOD: { name: "Mainframe Deity", desc: "< 20 moves in under 45s." }
    },
    profile: {
        title: "OPERATOR PROFILE",
        wins: "TOTAL BREACHES",
        fastest: "BEST TIME",
        streak: "NO-HINT STREAK",
        level: "SECURITY CLEARANCE",
        xp: "TOTAL DATA"
    }
  },
  tr: {
    title: "AKIŞ DURUMU",
    moves: "HAMLE",
    streak: "Gün Seri",
    modes: {
      daily: "GÜNLÜK",
      practice: "ANTRENMAN"
    },
    status: {
      req: "Gerekli",
      bug: "Hata",
      initializing: "Sistem Başlatılıyor...",
      uplink: "Bağlantı Kuruluyor..."
    },
    buttons: {
      hint: "İPUCU",
      reset: "SIFIRLA",
      newLevel: "YENİ SEVİYE",
      share: "SONUCU PAYLAŞ",
      next: "SONRAKİ SEVİYE",
      startDaily: "GÜNLÜK MODU BAŞLAT",
      startSim: "SİMÜLASYONU BAŞLAT",
      profile: "PROFİL",
      close: "TERMİNALİ KAPAT"
    },
    intro: {
      dailyTitle: "Günlük Protokol",
      simTitle: "Simülasyon Modu",
      dailyMission: "GÖREV: Güç kaynağını çıkışa bağla. Bugün herkes aynı haritayı oynuyor. Küresel verimliliği geçebilir misin?",
      simMission: "EĞİTİM: Sınırsız rastgele seviye. İleri düzey yönlendirme teknikleri çalışmak için kullanın.",
      li1: "Akışı yönlendirmek için boruları çevir.",
      li2: "Tüm 'Gerekli' düğümlere güç ver.",
      li3: "'Hata' (Bug) düğümlerinden kaçın.",
      li4: "Takıldın mı? Yapay Zeka Operatörüne sor."
    },
    missions: {
        mission_speed: "{target}sn altında tamamla",
        mission_moves: "{target} hamle veya daha azıyla bitir",
        mission_nohint: "HİÇ ipucu kullanma",
        mission_bonus: "Tüm BONUS düğümleri aktifle",
        complete: "TAMAMLANDI",
        reward: "ÖDÜL"
    },
    win: {
      title: "Dizi Tamamlandı",
      systemOnline: "Sistem Çevrimiçi",
      calculating: "Verimlilik hesaplanıyor...",
      shareText: "Sonuç panoya kopyalandı!",
      aiLog: "YZ GÜNLÜĞÜ"
    },
    logs: [
      "EL SIKIŞMA BAŞLATILIYOR...",
      "DÜĞÜM BÜTÜNLÜĞÜ DOĞRULANIYOR...",
      "GÜVENLİK PROTOKOLLERİ ATLATILIYOR...",
      "GÜÇ AKIŞI OPTİMİZE EDİLİYOR...",
      "VERİ PAKETİ ŞİFRESİ ÇÖZÜLÜYOR...",
      "SİSTEM SENKRONİZASYONU: %100"
    ],
    success: {
        system: "SİSTEM",
        online: "ÇEVRİMİÇİ",
        access: "ERİŞİM İZNİ VERİLDİ"
    },
    shareTemplate: {
        daily: "Günlük",
        practice: "Antrenman",
        moves: "Hamle"
    },
    terminal: {
        header: "TERMINAL_ÇIKTI_V4.0",
        upload: "YÜKLEME_TAMAMLANDI",
        analysis: "VERİMLİLİK_ANALİZİ",
        time: "GEÇEN_SÜRE",
        badge: "YENİ_PROTOKOL_KEŞFEDİLDİ",
        rank: "OPERATÖR_RÜTBESİ",
        xp: "VERİ_ÇIKARILDI",
        missions: "GÖREV_RAPORU",
        streak: "SERİ_ÇARPANI"
    },
    badges: {
        NOVICE: { name: "Çaylak Hacker", desc: "İlk başarılı sızma." },
        SPEED_DEMON: { name: "Hız Şeytanı", desc: "30 saniyenin altında tamamla." },
        NETRUNNER: { name: "Ağ Koşucusu", desc: "İpucu kullanmadan üst üste 5 zafer." },
        ARCHITECT: { name: "Sistem Mimarı", desc: "Toplam 10 başarılı operasyon." },
        CYBER_GOD: { name: "Ana Bilgisayar Tanrısı", desc: "45sn altında ve 20 hamleden az." }
    },
    profile: {
        title: "OPERATÖR PROFİLİ",
        wins: "TOPLAM SIZMA",
        fastest: "EN İYİ SÜRE",
        streak: "İPUCUSUZ SERİ",
        level: "GÜVENLİK YETKİSİ",
        xp: "TOPLAM VERİ"
    }
  }
};
