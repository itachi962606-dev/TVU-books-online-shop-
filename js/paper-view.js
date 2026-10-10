/** TVU Books Shop - Question paper viewer (prints cleanly / Save as PDF) */
const pvEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

document.addEventListener('DOMContentLoaded', () => {
  const id = new URLSearchParams(location.search).get('id');
  const root = document.getElementById('paper-root');
  const p = id && window.getSeedPaper ? window.getSeedPaper(id) : null;
  if (!p) {
    root.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📄</div><h3 class="empty-state-title">Question paper not found</h3><a href="download-syllabus.html#papers" class="btn btn-primary">Browse Question Papers</a></div>`;
    return;
  }
  document.title = `${p.subjectName} – ${p.examYear} | TVU Books Shop`;
  const q = window.buildPaperContent(p);
  const letters = ['a', 'b'];

  root.innerHTML = `
    <article class="paper-sheet">
      <div class="paper-note no-print">📘 Model question paper prepared from the syllabus units of this subject, for practice. Official scanned papers uploaded by the admin are listed on the previous page.</div>
      <div class="paper-code">Sub. Code: <b>${pvEsc(p.subjectCode)}</b></div>
      <h1 class="paper-uni">THIRUVALLUVAR UNIVERSITY</h1>
      <h2 class="paper-exam">${pvEsc(p.department.toUpperCase())} DEGREE EXAMINATION, ${pvEsc(p.session.toUpperCase())} ${p.year}${p.examType === 'Arrear' ? ' (ARREAR)' : ''}</h2>
      <div class="paper-sem">Semester ${pvEsc(p.semester)}</div>
      <h3 class="paper-subject">${pvEsc(p.subjectName.toUpperCase())}</h3>
      <div class="paper-meta"><span>Time : Three hours</span><span>Maximum : 75 marks</span></div>

      <h4 class="paper-part">PART A — (10 × 2 = 20 marks)</h4>
      <p class="paper-instr">Answer ALL questions.</p>
      <ol class="paper-list">${q.partA.map(x => `<li>${pvEsc(x)}</li>`).join('')}</ol>

      <h4 class="paper-part">PART B — (5 × 5 = 25 marks)</h4>
      <p class="paper-instr">Answer ALL questions, choosing either (a) or (b).</p>
      <ol class="paper-list" start="11">${q.partB.map(x => `<li><div>(a) ${pvEsc(x.a)}</div><div class="paper-or">Or</div><div>(b) ${pvEsc(x.b)}</div></li>`).join('')}</ol>

      <h4 class="paper-part">PART C — (3 × 10 = 30 marks)</h4>
      <p class="paper-instr">Answer any THREE questions.</p>
      <ol class="paper-list" start="16">${q.partC.map(x => `<li>${pvEsc(x)}</li>`).join('')}</ol>

      <div class="paper-end">—— End of Question Paper ——</div>
    </article>`;
});
