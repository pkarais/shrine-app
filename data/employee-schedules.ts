export type DayShift = {
  date: string   // YYYY-MM-DD
  staffName: string
  shiftStart: string | null  // HH:mm or null = OFF
  shiftEnd: string | null
}

const SCHEDULE: DayShift[] = [
  // ===== WEEK 1: 5/18 Mon – 5/24 Sun =====
  // --- Paul (Director) ---
  { date: "2026-05-18", staffName: "Paul", shiftStart: null, shiftEnd: null },
  { date: "2026-05-19", staffName: "Paul", shiftStart: null, shiftEnd: null },
  { date: "2026-05-20", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-21", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-22", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-23", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-24", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Fabio (Porter/Operations) ---
  { date: "2026-05-18", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-19", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-20", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-21", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-22", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-23", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-05-24", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  // --- Josh (Porter/Operations) ---
  { date: "2026-05-18", staffName: "Josh", shiftStart: null, shiftEnd: null },
  { date: "2026-05-19", staffName: "Josh", shiftStart: null, shiftEnd: null },
  { date: "2026-05-20", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-21", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-22", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-23", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-24", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  // --- Paulin (Porter/Operations) ---
  { date: "2026-05-18", staffName: "Paulin", shiftStart: null, shiftEnd: null },
  { date: "2026-05-19", staffName: "Paulin", shiftStart: "14:00", shiftEnd: "20:00" },
  { date: "2026-05-20", staffName: "Paulin", shiftStart: "08:00", shiftEnd: "14:00" },
  { date: "2026-05-21", staffName: "Paulin", shiftStart: "08:00", shiftEnd: "14:00" },
  { date: "2026-05-22", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  { date: "2026-05-23", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-05-24", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  // --- Demetri (Greeter) ---
  { date: "2026-05-18", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-19", staffName: "Demetri", shiftStart: "12:00", shiftEnd: "20:00" },
  { date: "2026-05-20", staffName: "Demetri", shiftStart: "12:30", shiftEnd: "20:30" },
  { date: "2026-05-21", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-22", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-05-23", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-05-24", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Marcus (Greeter) ---
  { date: "2026-05-18", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-05-19", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-20", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-21", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-22", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-05-23", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-24", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  // --- Teresa (Security) ---
  { date: "2026-05-18", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-19", staffName: "Teresa", shiftStart: "12:00", shiftEnd: "20:00" },
  { date: "2026-05-20", staffName: "Teresa", shiftStart: "12:30", shiftEnd: "20:30" },
  { date: "2026-05-21", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-22", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-23", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-24", staffName: "Teresa", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Ryan (Security) ---
  { date: "2026-05-18", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-05-19", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-05-20", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-05-21", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-22", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-05-23", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-05-24", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  // --- Ken (Security) ---
  { date: "2026-05-18", staffName: "Ken", shiftStart: "09:00", shiftEnd: "15:00" },
  { date: "2026-05-19", staffName: "Ken", shiftStart: "09:00", shiftEnd: "15:00" },
  { date: "2026-05-20", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-05-21", staffName: "Ken", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-22", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-23", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-05-24", staffName: "Ken", shiftStart: null, shiftEnd: null },
  // --- Jose (Security) ---
  { date: "2026-05-18", staffName: "Jose", shiftStart: "09:00", shiftEnd: "17:00" },

  // ===== WEEK 2: 5/25 Mon – 5/31 Sun =====
  // Note: 5/25 Memorial Day - Church Closed
  // --- Paul (Director) ---
  { date: "2026-05-25", staffName: "Paul", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Paul", shiftStart: null, shiftEnd: null },
  { date: "2026-05-27", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-28", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-29", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-30", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-31", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Fabio ---
  { date: "2026-05-25", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-27", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-28", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-29", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-05-30", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-05-31", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  // --- Josh ---
  { date: "2026-05-25", staffName: "Josh", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Josh", shiftStart: null, shiftEnd: null },
  { date: "2026-05-27", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-28", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-29", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-30", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-05-31", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  // --- Paulin ---
  { date: "2026-05-25", staffName: "Paulin", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Paulin", shiftStart: null, shiftEnd: null },
  { date: "2026-05-27", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-05-28", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-05-29", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-05-30", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-05-31", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  // --- Demetri ---
  { date: "2026-05-25", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-27", staffName: "Demetri", shiftStart: "12:30", shiftEnd: "20:30" },
  { date: "2026-05-28", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-29", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-05-30", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-05-31", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Marcus ---
  { date: "2026-05-25", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-27", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-28", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-29", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-30", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-31", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  // --- Teresa ---
  { date: "2026-05-25", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-27", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-28", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-29", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-05-30", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-31", staffName: "Teresa", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Ryan ---
  { date: "2026-05-25", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-05-27", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-05-28", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-05-29", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  // --- Ken ---
  { date: "2026-05-25", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-05-26", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-05-27", staffName: "Ken", shiftStart: "12:30", shiftEnd: "20:30" },
  { date: "2026-05-28", staffName: "Ken", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-29", staffName: "Ken", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-05-30", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },

  // ===== WEEK 3: 6/1 Mon – 6/7 Sun =====
  // --- Paul (Director) ---
  { date: "2026-06-01", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-02", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-03", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-04", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-05", staffName: "Paul", shiftStart: null, shiftEnd: null },
  { date: "2026-06-06", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-07", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Fabio ---
  { date: "2026-06-01", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-02", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-03", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-06-04", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-06-05", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-06", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-07", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  // --- Josh ---
  { date: "2026-06-01", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-06-02", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-06-03", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-06-04", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-06-05", staffName: "Josh", shiftStart: null, shiftEnd: null },
  { date: "2026-06-06", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  { date: "2026-06-07", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  // --- Paulin ---
  { date: "2026-06-01", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-02", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-03", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-04", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-05", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  { date: "2026-06-06", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  { date: "2026-06-07", staffName: "Paulin", shiftStart: null, shiftEnd: null },
  // --- Demetri ---
  { date: "2026-06-01", staffName: "Demetri", shiftStart: "12:30", shiftEnd: "20:30" },
  { date: "2026-06-02", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-03", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-06-04", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-06-05", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-06", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-07", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Marcus ---
  { date: "2026-06-01", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-02", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-03", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-04", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-05", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-06-06", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-06-07", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  // --- Teresa ---
  { date: "2026-06-01", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-06-02", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-06-03", staffName: "Teresa", shiftStart: "12:30", shiftEnd: "20:30" },
  { date: "2026-06-04", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-05", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-06", staffName: "Teresa", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-07", staffName: "Teresa", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Ryan ---
  { date: "2026-06-01", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-02", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-03", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-04", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-05", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-06-06", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-07", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  // --- Ken ---
  { date: "2026-06-01", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-02", staffName: "Ken", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-03", staffName: "Ken", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-04", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-06-05", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-06-06", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-07", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },

  // ===== WEEK 4: 6/8 Mon – 6/14 Sun =====
  // --- Paul (Director) ---
  { date: "2026-06-08", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-09", staffName: "Paul", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-10", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-11", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-12", staffName: "Paul", shiftStart: null, shiftEnd: null },
  { date: "2026-06-13", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-14", staffName: "Paul", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Fabio ---
  { date: "2026-06-08", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-09", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-10", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-11", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-06-12", staffName: "Fabio", shiftStart: null, shiftEnd: null },
  { date: "2026-06-13", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  { date: "2026-06-14", staffName: "Fabio", shiftStart: "08:00", shiftEnd: "16:00" },
  // --- Josh ---
  { date: "2026-06-08", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-06-09", staffName: "Josh", shiftStart: "11:00", shiftEnd: "17:00" },
  { date: "2026-06-10", staffName: "Josh", shiftStart: null, shiftEnd: null },
  { date: "2026-06-11", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  { date: "2026-06-12", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  { date: "2026-06-13", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  { date: "2026-06-14", staffName: "Josh", shiftStart: "12:00", shiftEnd: "17:00" },
  // --- Paulin ---
  { date: "2026-06-08", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-09", staffName: "Paulin", shiftStart: null, shiftEnd: null },
  { date: "2026-06-10", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-11", staffName: "Paulin", shiftStart: "10:00", shiftEnd: "16:00" },
  { date: "2026-06-12", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  { date: "2026-06-13", staffName: "Paulin", shiftStart: "09:00", shiftEnd: "14:00" },
  { date: "2026-06-14", staffName: "Paulin", shiftStart: null, shiftEnd: null },
  // --- Demetri ---
  { date: "2026-06-08", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-09", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-10", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-06-11", staffName: "Demetri", shiftStart: null, shiftEnd: null },
  { date: "2026-06-12", staffName: "Demetri", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-13", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-14", staffName: "Demetri", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Marcus ---
  { date: "2026-06-08", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-09", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-10", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-06-11", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-06-12", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-13", staffName: "Marcus", shiftStart: null, shiftEnd: null },
  { date: "2026-06-14", staffName: "Marcus", shiftStart: "10:00", shiftEnd: "17:00" },
  // --- Teresa ---
  { date: "2026-06-08", staffName: "Teresa", shiftStart: null, shiftEnd: null },
  { date: "2026-06-09", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-10", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-11", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-12", staffName: "Teresa", shiftStart: "10:00", shiftEnd: "17:00" },
  { date: "2026-06-13", staffName: "Teresa", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-14", staffName: "Teresa", shiftStart: "09:00", shiftEnd: "17:00" },
  // --- Ryan ---
  { date: "2026-06-08", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-09", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-10", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-06-11", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-06-12", staffName: "Ryan", shiftStart: "09:00", shiftEnd: "16:00" },
  { date: "2026-06-13", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  { date: "2026-06-14", staffName: "Ryan", shiftStart: null, shiftEnd: null },
  // --- Ken ---
  { date: "2026-06-08", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-06-09", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-10", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-11", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-12", staffName: "Ken", shiftStart: null, shiftEnd: null },
  { date: "2026-06-13", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
  { date: "2026-06-14", staffName: "Ken", shiftStart: "09:00", shiftEnd: "17:00" },
]

export function getScheduleForDate(dateStr: string): DayShift[] {
  return SCHEDULE.filter(s => s.date === dateStr)
}

export function getScheduleForDateRange(startDate: string, endDate: string): DayShift[] {
  return SCHEDULE.filter(s => s.date >= startDate && s.date <= endDate)
}

export function getScheduleForWeek(startDate: string): DayShift[] {
  const d = new Date(startDate + "T12:00:00")
  const endDate = new Date(d)
  endDate.setDate(d.getDate() + 6)
  const end = endDate.toISOString().split("T")[0]
  return getScheduleForDateRange(startDate, end)
}

export function getAllStaffNames(): string[] {
  return Array.from(new Set(SCHEDULE.map(s => s.staffName)))
}
