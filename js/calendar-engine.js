(function () {
  "use strict";

  var M = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  var D = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseISO(s) {
    if (!s) return null;
    var a = s.split("-");
    return new Date(parseInt(a[0], 10), parseInt(a[1], 10) - 1, parseInt(a[2], 10));
  }

  function daysInMonth(y, m) {
    return new Date(y, m, 0).getDate();
  }

  function inRange(dt, start, end) {
    return dt >= start && dt <= end;
  }

  function markerMap(markers) {
    var map = {};
    markers.forEach(function (x) {
      var a = parseISO(x.start);
      var b = parseISO(x.end || x.start);
      if (!a || !b) return;
      for (var d = new Date(a.getTime()); d <= b; d.setDate(d.getDate() + 1)) {
        var k = toISO(new Date(d.getTime()));
        if (!map[k]) map[k] = [];
        map[k].push(x);
      }
    });
    return {
      get: function (iso) {
        return map[iso] || [];
      }
    };
  }

  function monthsBetween(start, end) {
    var a = parseISO(start);
    var b = parseISO(end);
    if (!a || !b || a > b) return [];
    var out = [];
    var c = new Date(a.getFullYear(), a.getMonth(), 1);
    var endM = new Date(b.getFullYear(), b.getMonth(), 1);
    while (c <= endM) {
      out.push({ y: c.getFullYear(), m: c.getMonth() + 1 });
      c.setMonth(c.getMonth() + 1);
    }
    return out.slice(0, 6);
  }

  function weekRows(months) {
    var mx = 0;
    months.forEach(function (item) {
      var y = item.y;
      var m = item.m;
      var first = new Date(y, m - 1, 1);
      var dim = daysInMonth(y, m);
      var startCol = first.getDay();
      var rows = Math.ceil((startCol + dim) / 7);
      if (rows > mx) mx = rows;
    });
    return mx < 6 ? 6 : mx;
  }

  function effectiveDays(y, m, ss, se, mm, weekendLibur) {
    var c = 0;
    var dim = daysInMonth(y, m);
    var d;
    for (d = 1; d <= dim; d++) {
      var dt = new Date(y, m - 1, d);
      if (!inRange(dt, ss, se)) continue;
      var w = dt.getDay();
      if (weekendLibur && (w === 0 || w === 6)) continue;
      var hits = mm.get(toISO(dt));
      var libur = false;
      for (var i = 0; i < hits.length; i++) {
        if (hits[i].libur) {
          libur = true;
          break;
        }
      }
      if (libur) continue;
      c++;
    }
    return c;
  }

  function monthTable(y, m, rw, mm, ss, se) {
    var first = new Date(y, m - 1, 1);
    var dim = daysInMonth(y, m);
    var startCol = first.getDay();
    var cells = [];
    var i;
    for (i = 0; i < startCol; i++) cells.push(0);
    for (i = 1; i <= dim; i++) cells.push(i);
    while (cells.length < rw * 7) cells.push(0);

    var h = '<table class="cal-month"><thead><tr>';
    D.forEach(function (x) {
      h += "<th>" + x + "</th>";
    });
    h += "</tr></thead><tbody>";

    var rr, cc;
    for (rr = 0; rr < rw; rr++) {
      h += "<tr>";
      for (cc = 0; cc < 7; cc++) {
        var v = cells[rr * 7 + cc];
        if (!v) {
          h += '<td class="empty"></td>';
          continue;
        }
        var dt = new Date(y, m - 1, v);
        var id = toISO(dt);
        var ok = inRange(dt, ss, se);
        var ms = ok ? mm.get(id) : [];
        var stl = "";
        var ic = "";
        var cl = ["day"];
        if (!ok) cl.push("out");
        if (ms.length) {
          cl.push("marked");
          if (ms[0].color) {
            stl = "background:" + ms[0].color + "22;border-color:" + ms[0].color;
          }
          if (ms[0].icon) {
            ic = '<span class="ico">' + ms[0].icon + "</span>";
          }
        }
        h += '<td class="' + cl.join(" ") + '" style="' + stl + '">' + ic + v + "</td>";
      }
      h += "</tr>";
    }
    return h + "</tbody></table>";
  }

  function formatID(isoStr) {
    var d = parseISO(isoStr);
    if (!d) return isoStr;
    return d.getDate() + " " + M[d.getMonth() + 1] + " " + d.getFullYear();
  }

  function legend(markers, ss, se, sn) {
    var seen = {};
    var o = [];
    markers.forEach(function (m) {
      if (m.semester !== "all" && String(m.semester) !== String(sn)) return;
      var key = m.label + m.color + (m.icon || "");
      if (seen[key]) return;
      var a = parseISO(m.start);
      var b = parseISO(m.end || m.start);
      if (!a || !b) return;
      if (b < ss || a > se) return;
      seen[key] = true;
      var range =
        m.start === m.end
          ? formatID(m.start)
          : formatID(m.start) + " – " + formatID(m.end);
      o.push({
        label: m.label,
        color: m.color,
        icon: m.icon || "",
        range: range
      });
    });
    return o;
  }

  function renderSemester(cfg, sn) {
    var sem = cfg.semesters[sn];
    if (!sem || !sem.start || !sem.end) {
      return (
        '<section class="print-page"><p class="error-hint">Semester ' +
        sn +
        ": isi tanggal mulai & selesai.</p></section>"
      );
    }
    var ss = parseISO(sem.start);
    var se = parseISO(sem.end);
    var ms = monthsBetween(sem.start, sem.end);
    var rw = weekRows(ms);
    var mm = markerMap(cfg.markers || []);
    var ori = cfg.orientation || "portrait";
    var gc = ori === "landscape" ? "months landscape" : "months portrait";

    var mh = '<div class="' + gc + '">';
    ms.forEach(function (item) {
      var y = item.y;
      var m = item.m;
      mh +=
        '<div class="month-card"><div class="month-head">' +
        '<span class="name">' +
        M[m] +
        " " +
        y +
        '</span><span class="eff">Hari efektif: ' +
        effectiveDays(y, m, ss, se, mm, cfg.weekendLibur) +
        "</span></div>" +
        monthTable(y, m, rw, mm, ss, se) +
        "</div>";
    });
    mh += "</div>";

    var lg = legend(cfg.markers || [], ss, se, sn);
    var lh = '<div class="legend"><h4>Keterangan</h4><ul>';
    lg.forEach(function (it) {
      lh +=
        "<li><span class=\"sw\" style=\"background:" +
        it.color +
        '"></span>' +
        (it.icon ? '<span class="lico">' + it.icon + "</span>" : "") +
        "<span>" +
        it.label +
        " (" +
        it.range +
        ")</span></li>";
    });
    lh += "</ul></div>";

    var sig =
      '<div class="signature"><p>' +
      (cfg.ttdTempat || "") +
      '</p><p class="role">Kepala Sekolah</p><p class="name">' +
      (cfg.kepalaSekolah || "") +
      '</p><p class="nip">NIP. ' +
      (cfg.nipKepala || "") +
      "</p></div>";

    var fc = ori === "landscape" ? "footer landscape" : "footer portrait";

    return (
      '<section class="print-page" data-sem="' +
      sn +
      '"><header class="doc-head"><h2>KALENDER PENDIDIKAN</h2><h3>' +
      (cfg.schoolName || "") +
      '</h3><p class="ta">Tahun Ajaran ' +
      (cfg.tahunAjaran || "") +
      " — Semester " +
      sn +
      "</p></header>" +
      mh +
      '<div class="' +
      fc +
      '">' +
      lh +
      sig +
      "</div></section>"
    );
  }

  function renderAll(cfg) {
    return renderSemester(cfg, 1) + renderSemester(cfg, 2);
  }

  window.CalendarEngine = {
    renderAll: renderAll,
    parseISO: parseISO,
    toISO: toISO,
    monthsBetween: monthsBetween
  };
})();