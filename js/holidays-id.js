window.LiburNasionalID = {
  tahunDariTA: function (ta) {
    var m = String(ta || "").match(/(\d{4})/);
    if (!m) {
      var y = new Date().getFullYear();
      return { y1: y, y2: y + 1 };
    }
    var y1 = parseInt(m[1], 10);
    return { y1: y1, y2: y1 + 1 };
  },
  data: {
    2025: [
      { d: "2025-01-01", l: "Tahun Baru" },
      { d: "2025-03-31", l: "Idul Fitri" },
      { d: "2025-04-01", l: "Idul Fitri" },
      { d: "2025-05-01", l: "Buruh" },
      { d: "2025-06-01", l: "Pancasila" },
      { d: "2025-08-17", l: "Kemerdekaan" },
      { d: "2025-12-25", l: "Natal" }
    ],
    2026: [
      { d: "2026-01-01", l: "Tahun Baru" },
      { d: "2026-03-20", l: "Idul Fitri" },
      { d: "2026-03-21", l: "Idul Fitri" },
      { d: "2026-06-01", l: "Pancasila" },
      { d: "2026-08-17", l: "Kemerdekaan" },
      { d: "2026-12-25", l: "Natal" }
    ]
  },
  toMarkers: function (ta, color) {
    color = color || "#dc2626";
    var years = this.tahunDariTA(ta);
    var out = [];
    var self = this;
    [years.y1, years.y2].forEach(function (y) {
      (self.data[y] || []).forEach(function (r) {
        out.push({
          id: String(Date.now()) + Math.random(),
          label: r.l + " (Libur Nasional)",
          color: color,
          icon: "★",
          start: r.d,
          end: r.d,
          libur: true,
          semester: "all"
        });
      });
    });
    return out;
  }
};