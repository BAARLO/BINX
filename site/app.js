const data = window.POULE_DATA || {};

const els = {
  matchesContainer: document.getElementById('matchesContainer'),
  bonusContainer: document.getElementById('bonusContainer'),
  standBody: document.querySelector('#standTable tbody'),
  matchesView: document.getElementById('matchesView'),
  bonusView: document.getElementById('bonusView')
};

function init() {
  renderStand();
  renderMatches();
  renderBonus();
  bindToggle();
}

function bindToggle() {
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.toggle('active', b === btn));
      els.matchesView.classList.toggle('active-view', view === 'matches');
      els.bonusView.classList.toggle('active-view', view === 'bonus');
    });
  });
}

function renderStand() {
  const rows = [...(data.stand || [])].sort((a, b) =>
    Number(b.totaal) - Number(a.totaal) ||
    Number(b.punten_wedstrijden) - Number(a.punten_wedstrijden) ||
    a.deelnemer.localeCompare(b.deelnemer)
  );

  els.standBody.innerHTML = rows.map((row, index) => `
    <tr>
      <td>${e(String(index + 1))}</td>
      <td>${e(row.deelnemer)}</td>
      <td>${e(String(row.punten_wedstrijden ?? 0))}</td>
      <td>${e(String(row.punten_bonus ?? 0))}</td>
      <td>${e(String(row.totaal ?? 0))}</td>
    </tr>
  `).join('');
}

function renderMatches() {
  const phaseOrder = ['Groepsfase', 'Zestiende finales', 'Achtste finales', 'Kwartfinales', 'Halve finales', 'Troostfinale', 'Finale'];
  const targetPhases = new Set(['Groepsfase', 'Zestiende finales', 'Achtste finales', 'Kwartfinales', 'Halve finales']);

  const matches = [...(data.matches || [])];
  const groupedByPhase = groupBy(matches, m => m.fase || 'Wedstrijden');

  const sortedPhaseEntries = Object.entries(groupedByPhase).sort((a, b) => {
    const ai = phaseOrder.indexOf(a[0]);
    const bi = phaseOrder.indexOf(b[0]);
    const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
    const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
    return av - bv || a[0].localeCompare(b[0]);
  });

  els.matchesContainer.innerHTML = sortedPhaseEntries.map(([phase, phaseMatches]) => {
    const byDate = groupBy(phaseMatches, m => `${m.datum_iso || ''}||${m.datum || 'Onbekende datum'}`);

    const sortedDateEntries = Object.entries(byDate).sort((a, b) => {
      const [aIso, aLabel] = a[0].split('||');
      const [bIso, bLabel] = b[0].split('||');

      if (targetPhases.has(phase)) {
        return compareDateDesc(aIso, bIso, aLabel, bLabel);
      }
      return compareDateAsc(aIso, bIso, aLabel, bLabel);
    });

    return `
      <section class="group">
        <div class="bar red group-header">
          <span>${e(phase)}</span>
        </div>
        ${sortedDateEntries.map(([dateKey, dateMatches]) => {
          const [, dateLabel] = dateKey.split('||');
          const sortedMatches = [...dateMatches].sort((a, b) => compareTimeAsc(a.tijd, b.tijd));

          return `
            <div class="card-shell">
              <div class="bar blue group-header">
                <span>${e(dateLabel)}</span>
                <span class="fase">${e(phase)}</span>
              </div>
              <div class="cards-grid">
                ${sortedMatches.map(renderMatchCard).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </section>
    `;
  }).join('');
}

function compareDateDesc(aIso, bIso, aLabel = '', bLabel = '') {
  const aVal = aIso || '';
  const bVal = bIso || '';
  return bVal.localeCompare(aVal) || bLabel.localeCompare(aLabel);
}

function compareDateAsc(aIso, bIso, aLabel = '', bLabel = '') {
  const aVal = aIso || '';
  const bVal = bIso || '';
  return aVal.localeCompare(bVal) || aLabel.localeCompare(bLabel);
}

function compareTimeAsc(a, b) {
  const aVal = (a || '').padStart(5, '0');
  const bVal = (b || '').padStart(5, '0');
  return aVal.localeCompare(bVal);
}

function renderMatchCard(match) {
  const result = match.uitslag || '–';
  const rows = (data.participants || []).map(name => {
    const prediction = match.predictions?.[name];
    const points = match.points?.[name] ?? 0;
    const cls = prediction == null || prediction === ''
      ? 'points-zero'
      : (points >= 10 ? 'points-good' : points > 0 ? 'points-mid' : 'points-zero');

    return `
      <tr>
        <td>${e(name)}</td>
        <td>${e(prediction || '—')}</td>
        <td class="${cls}">${e(String(points || 0))}</td>
      </tr>
    `;
  }).join('');

  return `
    <article class="card">
      <div class="bar blue match-bar">
        <div class="match-item">${e(match.tijd || '')}</div>
        <div class="match-item match-home">${e(match.thuis)}</div>
        <div class="match-item">${e(result)}</div>
        <div class="match-item match-away">${e(match.uit)}</div>
      </div>
      <table class="data-table">
        <tr>
          <th>Deelnemer</th>
          <th>Voorspelling</th>
          <th>Punten</th>
        </tr>
        ${rows}
      </table>
    </article>
  `;
}

function renderBonus() {
  els.bonusContainer.innerHTML = `
    <section class="group">
      <div class="bar red">Bonusvragen</div>
      ${(data.bonus_questions || []).map(renderBonusCard).join('')}
    </section>
  `;
}

function renderBonusCard(question) {
  const rows = (data.participants || []).map(name => {
    const answer = question.antwoorden?.[name] ?? '—';
    const points = question.punten?.[name] ?? 0;
    const cls = points >= 10 ? 'points-good' : points > 0 ? 'points-mid' : 'points-zero';

    return `
      <tr>
        <td>${e(name)}</td>
        <td>${e(String(answer))}</td>
        <td class="${cls}">${e(String(points))}</td>
      </tr>
    `;
  }).join('');

  return `
    <article class="card-shell">
      <div class="bar blue bonus-question-bar">Bonusvraag ${e(String(question.nr || ''))}: ${e(question.vraag || '')}</div>
      <div class="correct-answer">Correct antwoord: ${e(question.correct_antwoord || 'nog niet ingevuld')}</div>
      <table class="data-table">
        <tr>
          <th>Deelnemer</th>
          <th>Antwoord</th>
          <th>Punten</th>
        </tr>
        ${rows}
      </table>
    </article>
  `;
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});
}

function e(v) {
  const str = String(v);
  if (str === 'Roland') return 'Roland';
  if (str === 'Nederland') return 'Nederland';
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

init();
