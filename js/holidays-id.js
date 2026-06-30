window.LiburNasionalID = {
  tahunDariTA(ta) {
    const m = String(ta || "").match(/(\d{4})/);
    if (!m) {
      const y = new Date().getFullYear();
      return { y1: y, y2: y + 1 };
    }
    const y1 = +m[1];
    return { y1, y2: y1 + 1 };
  },

  data: {
    2025: [
      { d: "2025-01-01", l: "Tahun Baru" },
      { d: "2025-01-27", l: "Isra Mikraj" },
      { d: "2025-03-29", l: "Nyepi" },
      { d: "2025-03-31", l: "Idul Fitri" },
      { d: "2025-04-01", l: "Idul Fitri" },
      { d: "2025-04-18", l: "Wafat Isa Almasih" },
      { d: "2025-05-01", l: "Buruh" },
      { d: "2025-05-12", l: "Waisak" },
      { d: "2025-05-29", l: "Kenaikan Isa" },
      { d: "2025-06-01", l: "Pancasila" },
      { d: "2025-06-06", l: "Idul Adha" },
      { d: "2025-06-27", l: "1 Muharam" },
      { d: "2025-08-17", l: "Kemerdekaan" },
      { d: "2025-09-05", l: "Maulid Nabi" },
      { d: "2025-12-25", l: "Natal" },
    ],
    2026: [
      { d: "2026-01-01", l: "Tahun Baru" },
      { d: "2026-01-16", l: "Isra Mikraj" },
      { d: "2026-03-19", l: "Nyepi" },
      { d: "2026-03-20", l: "Idul Fitri" },
      { d: "2026-03-21", l: "Idul Fitri" },
      { d: "2026-04-03", l: "Wafat Isa Almasih" },
      { d: "2026-05-01", l: "Hari Buruh / Waisak" },
      { d: "2026-05-14", l: "Kenaikan Isa" },
      { d: "2026-05-27", l: "Idul Adha" },
      { d: "2026-06-01", l: "Pancasila" },
      { d: "2026-06-16", l: "1 Muharam" },
      { d: "2026-08-17", l: "Kemerdekaan" },
      { d: "2026-08-25", l: "Maulid Nabi" },
      { d: "2026-12-25", l: "Natal" },
    ],
  },

  toMarkers(ta, color = "#dc2626") {
    const { y1, y2 } = this.tahunDariTA(ta);
    const out = [];
    [y1, y2].forEach((y) => {
      (this.data[y] || []).forEach((r) => {
        out.push({
          id: crypto.randomUUID(),
          label: r.l + " (Libur Nasional)",
          color,
          icon: "★",
          start: r.d,
          end: r.d,
          libur: true,
          semester: "all",
        });
      });
    });
    return out;
  },
};
