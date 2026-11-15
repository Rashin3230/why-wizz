// Helpers to upload + schedule one WhyWhizz Short in YouTube Studio's upload dialog.
// Load in the Studio page: eval(await (await fetch(RAW_URL)).text()); then __go(()=>__one(n), n)
(async () => {
  const S = await (await fetch('https://raw.githubusercontent.com/Rashin3230/why-wizz/main/schedule.json')).json();
  // slots 11-13 passed before upload: 11..25 shifted to start 15 Nov 17:00 IST, then 10:00/17:00 daily
  S.filter(x => x.n >= 11).forEach((x, k) => {
    const d = new Date(Date.UTC(2026, 10, 15 + Math.floor((k + 1) / 2)));
    x.publish_at = d.toISOString().slice(0, 10) + 'T' + (k % 2 === 0 ? '17:00' : '10:00') + ':00+05:30';
  });
  window.__S = S;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const vis = (e) => e && e.getBoundingClientRect().height > 0;
  const dlg = () => document.querySelector('ytcp-uploads-dialog');
  const waitFor = async (fn, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = fn(); if (v) return v; await sleep(400); } return null; };
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const when = (it) => { const [Y, M, D] = it.publish_at.slice(0, 10).split('-'); return { day: String(+D), mlab: MON[+M - 1].toUpperCase() + ' ' + Y, date: `${+D} ${MON[+M - 1]} ${Y}`, hhmm: it.publish_at.slice(11, 16) }; };
  const setBox = (t, text) => { t.focus(); const r = document.createRange(); r.selectNodeContents(t); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('insertText', false, text); t.dispatchEvent(new Event('input', { bubbles: true })); };

  window.__details = async (it) => {
    const tb = await waitFor(() => { const t = dlg()?.querySelector('ytcp-video-title #textbox'); return vis(t) && t; });
    if (!tb) return 'no editor';
    await sleep(2000);
    if (/Daily upload limit/i.test(dlg().innerText)) return 'LIMIT';
    setBox(tb, it.title); setBox(dlg().querySelector('ytcp-video-description #textbox'), it.description); await sleep(500);
    if (tb.innerText.trim() !== it.title) return 'title not set: ' + tb.innerText;
    dlg().querySelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_MFK"]').click();
    dlg().querySelector('#toggle-button')?.click(); await sleep(800);
    const ti = dlg().querySelector('#tags-container input');
    if (!dlg().querySelectorAll('#tags-container ytcp-chip').length)
      for (const t of it.tags.filter((t) => t !== 'shorts')) { ti.focus(); document.execCommand('insertText', false, t); ti.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })); await sleep(200); }
    for (let i = 0; i < 3; i++) { dlg().querySelector('#next-button').click(); await sleep(1800); }
    const ex = await waitFor(() => { const e = dlg().querySelector('#second-container-expand-button'); return vis(e) && e; }, 15000);
    if (!ex) return 'no visibility step';
    if (!vis(dlg().querySelector('ytcp-visibility-scheduler #datepicker-trigger'))) { ex.click(); await sleep(1500); }
    return 'ok';
  };

  window.__sched = async (it) => {
    const w = when(it);
    const trig = dlg().querySelector('ytcp-visibility-scheduler #datepicker-trigger');
    if (!vis(trig)) return 'no scheduler';
    if (trig.innerText.trim() !== w.date) {
      if (!vis(document.querySelector('ytcp-scrollable-calendar'))) trig.click();
      const cell = await waitFor(() => { const cal = document.querySelector('ytcp-scrollable-calendar'); return vis(cal) && [...cal.querySelectorAll('.calendar-day')].find((c) => c.innerText.trim() === w.day && c.parentElement.parentElement.innerText.includes(w.mlab)); }, 15000);
      if (!cell) return 'no day cell';
      cell.click(); await sleep(1000);
    }
    const tin = dlg().querySelector('ytcp-visibility-scheduler input'); tin.click(); tin.focus(); await sleep(1000);
    const opt = [...document.querySelectorAll('tp-yt-paper-item')].find((o) => o.innerText.trim() === w.hhmm);
    if (!opt) return 'no time option';
    opt.click(); await sleep(1000);
    const got = trig.innerText.trim() + ' ' + tin.value;
    if (got !== w.date + ' ' + w.hhmm) return 'MISMATCH ' + got;
    dlg().querySelector('#done-button').click();
    const key = it.title.slice(0, 15);
    const conf = await waitFor(() => { const t = [...document.querySelectorAll('tp-yt-paper-dialog')].map((e) => e.innerText.replace(/\s+/g, ' ')).find((t) => t.includes(key) && /public on/.test(t)); return t && t.match(/public on (\d+ \w+ \d{4} at \d\d:\d\d)/)?.[1]; }, 60000);
    return conf ? 'public on ' + conf : 'NO CONFIRM';
  };

  // page must be opened at .../videos/upload?d=ud so the upload dialog is fresh
  window.__one = async (n) => {
    const it = S.find((x) => x.n === n);
    const findInput = () => { const all = []; const walk = (root) => { root.querySelectorAll('*').forEach((e) => { if (e.tagName === 'INPUT' && e.type === 'file' && e.name === 'Filedata') all.push(e); if (e.shadowRoot) walk(e.shadowRoot); }); }; walk(document); return all[0]; };
    const inp = await waitFor(findInput, 20000); if (!inp) return 'no file input';
    const b = await (await fetch(it.video)).blob();
    const dt = new DataTransfer(); dt.items.add(new File([b], it.video.split('/').pop(), { type: 'video/mp4' })); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
    const r = await __details(it); if (r !== 'ok') return r;
    let s = await __sched(it);
    for (let k = 0; k < 2 && /no day cell|no time option|MISMATCH|no scheduler/.test(s); k++) { await sleep(3000); s = await __sched(it); }
    return s;
  };
  window.__log = window.__log || [];
  window.__go = (fn, label) => { window.__res = 'running'; fn().then((r) => { __log.push(label + ' ' + r); window.__res = r; }).catch((e) => { __log.push(label + ' ERR ' + e.message); window.__res = 'ERR ' + e.message; }); return 'started'; };
})();
