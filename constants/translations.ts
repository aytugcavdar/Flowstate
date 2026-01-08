
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
      startSim: "START SIMULATION"
    },
    intro: {
      dailyTitle: "Daily Protocol",
      simTitle: "Simulation Mode",
      dailyMission: "MISSION: Connect the power source to the sink. Everyone gets the same grid today. Can you beat the global efficiency?",
      simMission: "TRAINING: Unlimited generated levels. Use this to practice advanced routing techniques.",
      li1: "Rotate pipes to guide flow.",
      li2: "Power all 'Req' nodes.",
      li3: "Avoid 'Bug' nodes.",
      li4: "Stuck? Ask the AI Operator for a hint."
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
      startSim: "SİMÜLASYONU BAŞLAT"
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
    }
  }
};
