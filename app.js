/* ============================================================
   Lecteurs Juniors SAP ZOGBO — logique applicative
   Base de données : Supabase (Postgres), configurée dans config.js
   ============================================================ */

const ROLE_FIELDS = [
  { id: "r1",       label: "1ère lecture",   input: "f-r1",       tag: "1" },
  { id: "r2",       label: "2ème lecture",   input: "f-r2",       tag: "2" },
  { id: "pu1",      label: "Prière univ. 1", input: "f-pu1",      tag: "1" },
  { id: "pu2",      label: "Prière univ. 2", input: "f-pu2",      tag: "2" },
  { id: "pu3",      label: "Prière univ. 3", input: "f-pu3",      tag: "3" },
  { id: "pu4",      label: "Prière univ. 4", input: "f-pu4",      tag: "4" },
  { id: "monition", label: "Monition",       input: "f-monition", tag: "•" },
];

const MOIS = ["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const MOIS_LONG = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
const JOURS_LONG = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];

const BRAND = "Lecteurs Juniors SAP ZOGBO";
const WINE_RGB = [91, 26, 42];
const GOLD_RGB = [176, 141, 87];
const IVORY_RGB = [247, 242, 231];

// ---------- Connexion Supabase ----------
let db = null;
let configOk = false;

function initDb(){
  const cfg = window.APP_CONFIG || {};
  configOk = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
             !cfg.SUPABASE_URL.includes("YOUR-PROJECT") &&
             !cfg.SUPABASE_ANON_KEY.includes("YOUR-ANON");
  if(configOk && window.supabase){
    db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }
  document.querySelectorAll(".config-warning").forEach(el => {
    el.style.display = configOk ? "none" : "block";
  });
  return configOk;
}

function fmtMoney(n){
  const num = Number(n) || 0;
  return num.toLocaleString('fr-FR') + " FCFA";
}

function parseDateLocal(dateStr){
  const [y,m,d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d, 12);
}

function fullDateLabel(dateStr){
  const d = parseDateLocal(dateStr);
  return `${JOURS_LONG[d.getDay()]} ${d.getDate()} ${MOIS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function shortDateLabel(dateStr){
  const d = parseDateLocal(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

function showToast(msg){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._tm);
  showToast._tm = setTimeout(()=> t.classList.remove('show'), 2200);
}

function todayISO(){
  return new Date().toISOString().slice(0,10);
}

function nextSaturdayOrSundayISO(targetDow){
  // targetDow: 0 = dimanche, 6 = samedi
  const today = new Date();
  const day = today.getDay();
  let diff = (targetDow - day + 7) % 7;
  const next = new Date(today);
  next.setDate(today.getDate() + diff);
  return next.toISOString().slice(0,10);
}

/* ============================================================
   CLASSEMENTS (lecteurs / prières universelles / monition)
   ============================================================ */

async function fetchClassements(){
  const { data, error } = await db.from('classements').select('*').order('date', { ascending:false });
  if(error){ console.error(error); showToast("Erreur de chargement des classements"); return []; }
  return data || [];
}
async function insertClassement(entry){
  const { error } = await db.from('classements').insert([entry]);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}
async function updateClassement(id, entry){
  const { error } = await db.from('classements').update(entry).eq('id', id);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}
async function deleteClassement(id){
  const { error } = await db.from('classements').delete().eq('id', id);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}

/* ============================================================
   COTISATIONS (collecte du samedi)
   ============================================================ */

async function fetchCotisations(){
  const { data, error } = await db.from('cotisations').select('*').order('date', { ascending:false });
  if(error){ console.error(error); showToast("Erreur de chargement des cotisations"); return []; }
  return data || [];
}
async function insertCotisation(entry){
  const { error } = await db.from('cotisations').insert([entry]);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}
async function updateCotisation(id, entry){
  const { error } = await db.from('cotisations').update(entry).eq('id', id);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}
async function deleteCotisation(id){
  const { error } = await db.from('cotisations').delete().eq('id', id);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}

/* ============================================================
   PRÉSENCES (enfants présents + cotisation du jour payée ou non)
   ============================================================ */

async function fetchPresences(){
  const { data, error } = await db.from('presences').select('*').order('date', { ascending:false });
  if(error){ console.error(error); showToast("Erreur de chargement des présences"); return []; }
  return data || [];
}
async function insertPresenceRows(rows){
  const { error } = await db.from('presences').insert(rows);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}
async function deletePresenceDay(date){
  const { error } = await db.from('presences').delete().eq('date', date);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}
async function deletePresenceRow(id){
  const { error } = await db.from('presences').delete().eq('id', id);
  if(error){ console.error(error); showToast("Erreur : " + error.message); return false; }
  return true;
}

function groupPresencesByDate(list){
  const groups = {};
  list.forEach(p => {
    if(!groups[p.date]) groups[p.date] = [];
    groups[p.date].push(p);
  });
  return groups;
}

// Enfants dont au moins une présence du mois en cours est marquée "non payée"
function computeWhoOwesThisMonth(list){
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const owed = {};
  list.forEach(p => {
    const d = parseDateLocal(p.date);
    if(d.getFullYear() === y && d.getMonth() === m && !p.paye){
      if(!owed[p.enfant]) owed[p.enfant] = { count: 0, lastDate: p.date };
      owed[p.enfant].count += 1;
      if(p.date > owed[p.enfant].lastDate) owed[p.enfant].lastDate = p.date;
    }
  });
  return Object.entries(owed)
    .map(([enfant, info]) => ({ enfant, ...info }))
    .sort((a,b) => b.count - a.count);
}

/* ============================================================
   GÉNÉRATION DE PDF (jsPDF + autotable)
   ============================================================ */

function pdfHeader(doc, title, subtitle){
  doc.setFillColor(...WINE_RGB);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 34, 'F');
  doc.setTextColor(255,255,255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(BRAND, 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(230,215,190);
  doc.text(title, 14, 23);
  if(subtitle){
    doc.setFontSize(9);
    doc.text(subtitle, 14, 29);
  }
  doc.setTextColor(40,35,30);
}

function pdfFooter(doc){
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1; i<=pageCount; i++){
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    const w = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(140,130,120);
    doc.text(`Généré le ${shortDateLabel(todayISO())} — page ${i}/${pageCount}`, w/2, h - 8, { align: 'center' });
  }
}

function autotableTheme(){
  return {
    headStyles: { fillColor: WINE_RGB, textColor: 255, fontStyle: 'bold', fontSize: 9.5 },
    bodyStyles: { fontSize: 9.5, textColor: [40,35,30] },
    alternateRowStyles: { fillColor: IVORY_RGB },
    styles: { cellPadding: 4, lineColor: [225,215,200], lineWidth: 0.1 },
    margin: { top: 40, left: 14, right: 14 },
  };
}

function downloadPdfDoc(doc, filename){
  pdfFooter(doc);
  doc.save(filename);
}

// ---- PDF : liste de présence du jour ----
function generatePresencePdf(dateStr, children){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  pdfHeader(doc, "Liste de présence", fullDateLabel(dateStr));

  const present = children.length;
  const paid = children.filter(c => c.paye).length;

  doc.autoTable({
    ...autotableTheme(),
    startY: 40,
    head: [["N°", "Nom de l'enfant", "Présent", "Cotisation du jour"]],
    body: children.map((c, i) => [
      String(i+1),
      c.enfant,
      "✓",
      c.paye ? "Payée" : "Non payée"
    ]),
  });

  const y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 40) + 10;
  doc.setFontSize(10);
  doc.setTextColor(60,50,45);
  doc.text(`Total présents : ${present}   •   Cotisations payées : ${paid}   •   En attente : ${present - paid}`, 14, y);

  downloadPdfDoc(doc, `presence-${dateStr}.pdf`);
}

// ---- PDF : historique des classements ----
function generateClassementsPdf(list){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape' });
  pdfHeader(doc, "Classements des lecteurs", `${list.length} classement(s), du plus récent au plus ancien`);

  doc.autoTable({
    ...autotableTheme(),
    startY: 40,
    head: [["Date", "1ère lecture", "2ème lecture", "PU 1", "PU 2", "PU 3", "PU 4", "Monition"]],
    body: list.map(s => [
      shortDateLabel(s.date),
      s.r1 || '—', s.r2 || '—', s.pu1 || '—', s.pu2 || '—', s.pu3 || '—', s.pu4 || '—', s.monition || '—'
    ]),
  });

  downloadPdfDoc(doc, `classements.pdf`);
}

// ---- PDF : rapport de cotisation ----
function generateCotisationReportPdf(list){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const totalGeneral = list.reduce((s,c) => s + (Number(c.montant)||0), 0);
  const now = new Date();
  const totalAnnee = list.filter(c => parseDateLocal(c.date).getFullYear() === now.getFullYear())
                          .reduce((s,c) => s + (Number(c.montant)||0), 0);

  pdfHeader(doc, "Rapport de cotisation", `Total général : ${fmtMoney(totalGeneral)}  •  Année en cours : ${fmtMoney(totalAnnee)}`);

  const byMonth = {};
  list.forEach(c => {
    const d = parseDateLocal(c.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    byMonth[key] = (byMonth[key]||0) + (Number(c.montant)||0);
  });
  const monthRows = Object.keys(byMonth).sort().reverse().map(key => {
    const [y,m] = key.split('-').map(Number);
    return [`${MOIS_LONG[m-1]} ${y}`, fmtMoney(byMonth[key])];
  });

  const byAnimateur = {};
  list.forEach(c => {
    const name = c.animateur || 'Non renseigné';
    byAnimateur[name] = (byAnimateur[name]||0) + (Number(c.montant)||0);
  });
  const animRows = Object.entries(byAnimateur).sort((a,b) => b[1]-a[1]).map(([name,total]) => [name, fmtMoney(total)]);

  doc.autoTable({
    ...autotableTheme(),
    startY: 40,
    head: [["Mois", "Total collecté"]],
    body: monthRows.length ? monthRows : [["Aucune donnée", ""]],
  });

  doc.autoTable({
    ...autotableTheme(),
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Animateur", "Total collecté (toutes périodes)"]],
    body: animRows.length ? animRows : [["Aucune donnée", ""]],
  });

  doc.autoTable({
    ...autotableTheme(),
    startY: doc.lastAutoTable.finalY + 10,
    head: [["Date", "Animateur", "Montant"]],
    body: list.map(c => [shortDateLabel(c.date), c.animateur, fmtMoney(c.montant)]),
  });

  downloadPdfDoc(doc, `rapport-cotisation.pdf`);
}

/* ============================================================
   PWA : service worker + bouton d'installation
   ============================================================ */

function setupPwa(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }
  let deferredPrompt = null;
  const installBtn = document.getElementById('install-btn');
  if(!installBtn) return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
  });
  installBtn.addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
  window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    showToast("Application installée ✓");
  });
}
