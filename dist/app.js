(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = 'nfh-demo-bookings-v1';
  const modalityFilter = $('#modality-filter');
  const levelFilter = $('#level-filter');
  const timeFilter = $('#time-filter');
  const coachFilter = $('#coach-filter');
  const datePicker = $('#date-picker');
  const calendarGrid = $('#calendar-grid');
  const dialog = $('#booking-dialog');
  const bookingContent = $('#booking-content');
  const today = startOfDay(new Date());
  const todayISO = toISO(today);
  let selectedDate = new Date(today);
  let view = 'week';
  let selectedSession = null;
  let formValues = null;
  let toastTimer;

  const modalities = {
    feminino: { name: 'Muay Thai Feminino', short: 'Muay Thai Feminino' },
    muay: { name: 'Muay Thai Geral', short: 'Muay Thai Geral' },
    bjj: { name: 'Jiu-Jitsu · BJJ', short: 'Jiu-Jitsu · BJJ' },
  };

  // Grade fictícia para demonstrar filtros, lotação e reserva. Substituir por dados da academia.
  const classes = [
    { id: 'f-1', modality: 'feminino', weekday: 2, time: '19:00', level: 'Iniciante', coach: 'Equipe Muay Thai', capacity: 18, booked: 11, duration: 60 },
    { id: 'f-2', modality: 'feminino', weekday: 4, time: '19:00', level: 'Todos os níveis', coach: 'Equipe Muay Thai', capacity: 18, booked: 13, duration: 60 },
    { id: 'f-3', modality: 'feminino', weekday: 6, time: '09:00', level: 'Intermediário', coach: 'Equipe Muay Thai', capacity: 18, booked: 8, duration: 60 },
    { id: 'm-1', modality: 'muay', weekday: 1, time: '20:00', level: 'Todos os níveis', coach: 'Equipe Muay Thai', capacity: 20, booked: 14, duration: 60 },
    { id: 'm-2', modality: 'muay', weekday: 3, time: '20:00', level: 'Intermediário', coach: 'Equipe Muay Thai', capacity: 20, booked: 12, duration: 60 },
    { id: 'm-3', modality: 'muay', weekday: 5, time: '19:00', level: 'Avançado', coach: 'Equipe Muay Thai', capacity: 18, booked: 18, duration: 60 },
    { id: 'b-1', modality: 'bjj', weekday: 2, time: '12:00', level: 'Iniciante', coach: 'Equipe Jiu-Jitsu', capacity: 20, booked: 15, duration: 60 },
    { id: 'b-2', modality: 'bjj', weekday: 3, time: '20:00', level: 'Todos os níveis', coach: 'Equipe Jiu-Jitsu', capacity: 20, booked: 16, duration: 60 },
    { id: 'b-3', modality: 'bjj', weekday: 6, time: '10:00', level: 'Intermediário', coach: 'Equipe Jiu-Jitsu', capacity: 20, booked: 12, duration: 60 },
  ];

  function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
  function toISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function fromISO(value) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  function addDays(date, days) { const result = new Date(date); result.setDate(result.getDate() + days); return result; }
  function mondayOf(date) { const result = startOfDay(date); result.setDate(result.getDate() - ((result.getDay() + 6) % 7)); return result; }
  function sameDate(a, b) { return toISO(a) === toISO(b); }
  function dateLabel(date, options = { weekday: 'short', day: '2-digit', month: 'short' }) {
    return new Intl.DateTimeFormat('pt-BR', options).format(date).replace('.', '');
  }
  function getBookings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  }
  function saveBookings(bookings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings)); return true; }
    catch { return false; }
  }
  function dayPart(time) {
    const hour = Number(time.slice(0, 2));
    return hour < 12 ? 'Manhã' : hour < 18 ? 'Tarde' : 'Noite';
  }
  function className(template) {
    return template.modality === 'bjj' ? 'Jiu-Jitsu · BJJ' : template.modality === 'feminino' ? 'Muay Thai Feminino' : 'Muay Thai Geral';
  }
  function sessionKey(template, date) { return `${template.id}_${toISO(date)}`; }
  function bookedCount(template, date) {
    return template.booked + getBookings().filter((booking) => booking.sessionKey === sessionKey(template, date)).length;
  }
  function getRange() {
    if (view === 'day') return [startOfDay(selectedDate), startOfDay(selectedDate)];
    if (view === 'week') {
      const start = mondayOf(selectedDate);
      return [start, addDays(start, 6)];
    }
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    return [start, new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)];
  }
  function makeSessions() {
    const modality = modalityFilter.value;
    if (!modality) return [];
    const [start, end] = getRange();
    const result = [];
    for (let date = new Date(start); date <= end; date = addDays(date, 1)) {
      if (date < today) continue;
      classes.forEach((template) => {
        if (template.modality !== modality || template.weekday !== date.getDay()) return;
        if (levelFilter.value !== 'all' && template.level !== 'Todos os níveis' && template.level !== levelFilter.value) return;
        if (timeFilter.value !== 'all' && dayPart(template.time) !== timeFilter.value) return;
        if (coachFilter.value !== 'all' && template.coach !== coachFilter.value) return;
        const [hour, minute] = template.time.split(':').map(Number);
        const startAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute);
        if (startAt <= new Date()) return;
        result.push({ template, date: new Date(date), startAt, key: sessionKey(template, date) });
      });
    }
    return result.sort((a, b) => a.startAt - b.startAt);
  }
  function updatePeriodLabel() {
    const [start, end] = getRange();
    let label = '';
    if (view === 'day') label = dateLabel(start, { weekday: 'long', day: 'numeric', month: 'long' });
    else if (view === 'week') label = `${dateLabel(start, { day: 'numeric', month: 'short' })} — ${dateLabel(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    else label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(start);
    $('#period-label').textContent = label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
    $('#previous-period').disabled = end < today || (view === 'month' && new Date(start.getFullYear(), start.getMonth() + 1, 0) < today);
  }
  function refreshCoachOptions() {
    const selected = coachFilter.value || 'all';
    const modality = modalityFilter.value;
    const coaches = [...new Set(classes.filter((item) => !modality || item.modality === modality).map((item) => item.coach))];
    coachFilter.innerHTML = '<option value="all">Todos os coaches</option>';
    coaches.forEach((coach) => {
      const option = document.createElement('option'); option.value = coach; option.textContent = coach; coachFilter.append(option);
    });
    coachFilter.value = coaches.includes(selected) ? selected : 'all';
  }
  function sessionCard(session) {
    const { template, date, key } = session;
    const spots = Math.max(0, template.capacity - bookedCount(template, date));
    const full = spots <= 0;
    const level = template.level;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `class-card${template.modality === 'bjj' ? ' bjj-class' : ''}${full ? ' full-class' : ''}`;
    card.disabled = full;
    card.setAttribute('aria-label', `${template.time}, ${className(template)}, ${level}, ${full ? 'lotada' : `${spots} vagas`}${full ? '' : ', reservar aula'}`);
    card.innerHTML = `<span class="class-time">${template.time}</span><span class="class-name">${className(template)}</span><span class="class-meta">${level} · ${template.coach}</span><span class="class-spots">${full ? 'Lotada' : `${spots} ${spots === 1 ? 'vaga' : 'vagas'} disponíveis`}</span>`;
    if (!full) card.addEventListener('click', () => openBooking({ template, date, key }));
    return card;
  }
  function renderEmpty(message, description) {
    calendarGrid.className = `calendar-grid${view === 'day' ? ' day-view' : ''}${view === 'month' ? ' month-view' : ''}`;
    calendarGrid.innerHTML = `<div class="calendar-empty"><strong>${message}</strong><p>${description}</p></div>`;
  }
  function renderCalendar() {
    datePicker.value = toISO(selectedDate);
    datePicker.min = todayISO;
    updatePeriodLabel();
    if (!modalityFilter.value) {
      renderEmpty('Escolha uma modalidade para ver a agenda', 'O calendário vai mostrar apenas as aulas da turma que você selecionou.');
      return;
    }
    const sessions = makeSessions();
    const [start, end] = getRange();
    const days = [];
    if (view === 'day') days.push(new Date(start));
    else if (view === 'week') for (let date = new Date(start); date <= end; date = addDays(date, 1)) days.push(new Date(date));
    else for (let date = new Date(start); date <= end; date = addDays(date, 1)) days.push(new Date(date));
    if (!sessions.length) {
      const past = end < today;
      renderEmpty(past ? 'Este período já passou' : 'Nenhuma aula encontrada', past ? 'Escolha uma data de hoje em diante para consultar a agenda.' : 'Não encontramos aulas com esta combinação de filtros. Tente mudar o nível ou o período.');
      return;
    }
    calendarGrid.className = `calendar-grid${view === 'day' ? ' day-view' : ''}${view === 'month' ? ' month-view' : ''}`;
    calendarGrid.replaceChildren();
    if (view === 'month') {
      const offset = (start.getDay() + 6) % 7;
      for (let i = 0; i < offset; i++) {
        const spacer = document.createElement('div'); spacer.className = 'calendar-day month-spacer'; spacer.setAttribute('aria-hidden', 'true'); calendarGrid.append(spacer);
      }
    }
    days.forEach((date) => {
      const day = document.createElement('div');
      const todaysSessions = sessions.filter((session) => sameDate(session.date, date));
      day.className = `calendar-day${sameDate(date, today) ? ' is-today' : ''}`;
      day.innerHTML = `<div class="calendar-day-head"><span>${dateLabel(date, { weekday: 'short' })}</span><strong>${String(date.getDate()).padStart(2, '0')}</strong></div><div class="calendar-day-items"></div>`;
      const list = $('.calendar-day-items', day);
      todaysSessions.forEach((session) => list.append(sessionCard(session)));
      calendarGrid.append(day);
    });
    if (view === 'month') {
      const remainder = calendarGrid.children.length % 7;
      if (remainder) for (let i = 0; i < 7 - remainder; i++) {
        const spacer = document.createElement('div'); spacer.className = 'calendar-day month-spacer'; spacer.setAttribute('aria-hidden', 'true'); calendarGrid.append(spacer);
      }
    }
  }
  function formatFullDate(date) {
    return new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }
  function openBooking(session) {
    selectedSession = session;
    formValues = null;
    renderBookingForm();
    dialog.showModal();
  }
  function bookingSummary(session) {
    const { template, date } = session;
    return `<div class="booking-summary"><div><span>Modalidade</span><strong>${className(template)}</strong></div><div><span>Data e horário</span><strong>${formatFullDate(date)} · ${template.time}</strong></div><div><span>Nível</span><strong>${template.level}</strong></div><div><span>Coach</span><strong>${template.coach}</strong></div></div>`;
  }
  function renderBookingForm() {
    bookingContent.innerHTML = `<h2 id="booking-title" tabindex="-1">Sua primeira aula<br /><em>começa aqui.</em></h2><p class="dialog-intro">Preencha seus dados para reservar uma vaga nesta aula experimental.</p>${bookingSummary(selectedSession)}<form class="booking-form" id="booking-form"><label>Seu nome<input name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Como podemos chamar você?" autofocus /></label><label>E-mail<input name="email" type="email" autocomplete="email" required maxlength="120" placeholder="voce@email.com" /></label><label>Celular<input name="phone" type="tel" autocomplete="tel" required minlength="8" maxlength="20" placeholder="(21) 99999-0000" /></label><p class="form-error" id="form-error" role="alert"></p><div class="dialog-actions"><span class="step-label">PASSO 1 DE 2</span><button class="button button-ink" type="submit">Revisar reserva <span aria-hidden="true">→</span></button></div></form><p class="confirm-note">Demonstração: os dados ficam armazenados somente neste navegador.</p>`;
    $('#booking-form').addEventListener('submit', (event) => {
      event.preventDefault();
      if (!event.currentTarget.reportValidity()) return;
      const data = new FormData(event.currentTarget);
      formValues = { name: String(data.get('name')).trim(), email: String(data.get('email')).trim().toLowerCase(), phone: String(data.get('phone')).trim() };
      renderBookingReview();
    });
    $('#booking-title').focus();
  }
  function renderBookingReview(error = '') {
    bookingContent.innerHTML = `<h2 id="booking-title" tabindex="-1">Confira os<br /><em>detalhes.</em></h2><p class="dialog-intro">Sua vaga só será confirmada depois que você concluir esta etapa.</p>${bookingSummary(selectedSession)}<div class="booking-summary"><div><span>Aluno(a)</span><strong>${escapeHTML(formValues.name)}</strong></div><div><span>E-mail</span><strong>${escapeHTML(formValues.email)}</strong></div><div><span>Celular</span><strong>${escapeHTML(formValues.phone)}</strong></div></div><p class="form-error" id="form-error" role="alert">${error}</p><div class="dialog-actions"><button class="button button-outline" type="button" id="edit-booking">Voltar</button><button class="button button-ink" type="button" id="confirm-booking">Confirmar reserva <span aria-hidden="true">→</span></button></div><p class="confirm-note">A demonstração verifica novamente as vagas e evita duas reservas no mesmo horário para o mesmo e-mail.</p>`;
    $('#edit-booking').addEventListener('click', renderBookingForm);
    $('#confirm-booking').addEventListener('click', confirmBooking);
    $('#booking-title').focus();
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function confirmBooking() {
    const { template, date, key } = selectedSession;
    const bookings = getBookings();
    const occupied = template.booked + bookings.filter((booking) => booking.sessionKey === key).length;
    if (occupied >= template.capacity) {
      renderBookingReview('Esta aula acabou de lotar. Escolha outro horário para continuar.');
      renderCalendar();
      return;
    }
    const startAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), ...template.time.split(':').map(Number)).getTime();
    const duplicate = bookings.some((booking) => booking.email === formValues.email && booking.startAt === startAt);
    if (duplicate) {
      renderBookingReview('Este e-mail já tem uma reserva nesse horário. Escolha outra aula ou use um e-mail diferente.');
      return;
    }
    const ticketCode = `NFH-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const booking = { ticketCode, name: formValues.name, email: formValues.email, phone: formValues.phone, sessionKey: key, startAt, createdAt: Date.now() };
    if (!saveBookings([...bookings, booking])) {
      renderBookingReview('Não foi possível salvar neste navegador. Tente novamente.');
      return;
    }
    renderTicket(booking);
    renderCalendar();
    showToast('Reserva confirmada neste navegador.');
  }
  function renderTicket(booking) {
    const { template, date } = selectedSession;
    bookingContent.innerHTML = `<div class="ticket-state"><span class="ticket-icon" aria-hidden="true">✓</span><p class="section-kicker">RESERVA CONFIRMADA · DEMONSTRAÇÃO</p><h2 id="booking-title" tabindex="-1">Até breve,<br /><em>${escapeHTML(booking.name.split(' ')[0])}.</em></h2><p>Apresente este ticket à equipe da academia.</p><div class="ticket-code">${booking.ticketCode}</div><div class="qr-wrap" id="qr-code" aria-label="QR Code do ticket"><span class="qr-fallback">Gerando QR Code…</span></div>${bookingSummary(selectedSession)}<div class="ticket-actions"><button type="button" class="button button-ink" id="download-ticket">Baixar ticket</button><button type="button" class="button button-outline" id="close-ticket">Concluir</button></div><p class="confirm-note">Reserva de demonstração gravada somente neste navegador; não envia confirmação à academia.</p></div>`;
    const qrTarget = $('#qr-code');
    const qrPayload = `NFH:${booking.ticketCode}`;
    if (window.QRCode) {
      qrTarget.replaceChildren();
      new window.QRCode(qrTarget, { text: qrPayload, width: 156, height: 156, colorDark: '#111111', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
    } else {
      qrTarget.innerHTML = '<span class="qr-fallback">QR indisponível sem acesso ao serviço externo.<br />Use o código do ticket.</span>';
    }
    $('#booking-title').focus();
    $('#close-ticket').addEventListener('click', () => dialog.close());
    $('#download-ticket').addEventListener('click', () => downloadTicket(booking, template, date));
  }
  function downloadTicket(booking, template, date) {
    const canvas = document.createElement('canvas');
    canvas.width = 700; canvas.height = 370;
    const context = canvas.getContext('2d');
    context.fillStyle = '#0a0a0b'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ed2429'; context.fillRect(0, 0, 10, canvas.height);
    context.fillStyle = '#f5f4f2'; context.font = 'bold 20px Arial'; context.fillText('NITERÓI FIGHT HOUSE', 36, 48);
    context.fillStyle = '#aaaaaa'; context.font = '14px Arial'; context.fillText('TICKET DE AULA EXPERIMENTAL · DEMONSTRAÇÃO', 36, 78);
    context.fillStyle = '#ffffff'; context.font = 'bold 28px Arial'; context.fillText(booking.ticketCode, 36, 145);
    context.font = '17px Arial'; context.fillText(className(template), 36, 193);
    context.fillStyle = '#cccccc'; context.font = '15px Arial'; context.fillText(`${dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${template.time}`, 36, 224);
    context.fillText(booking.name, 36, 265);
    const qrImage = $('#qr-code canvas, #qr-code img');
    if (qrImage && (qrImage.tagName !== 'IMG' || qrImage.complete)) context.drawImage(qrImage, 510, 105, 154, 154);
    const link = document.createElement('a'); link.download = `${booking.ticketCode.toLowerCase()}.png`; link.href = canvas.toDataURL('image/png'); link.click();
  }
  function changePeriod(direction) {
    if (view === 'day') selectedDate = addDays(selectedDate, direction);
    else if (view === 'week') selectedDate = addDays(selectedDate, direction * 7);
    else selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + direction, 1);
    if (selectedDate < today) selectedDate = new Date(today);
    renderCalendar();
  }
  function showToast(message) {
    const toast = $('#toast'); toast.textContent = message; toast.classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }

  modalityFilter.addEventListener('change', () => { refreshCoachOptions(); renderCalendar(); });
  [levelFilter, timeFilter, coachFilter].forEach((filter) => filter.addEventListener('change', renderCalendar));
  datePicker.addEventListener('change', () => {
    if (!datePicker.value) return;
    const next = fromISO(datePicker.value);
    if (next < today) { datePicker.value = todayISO; selectedDate = new Date(today); showToast('Escolha uma data de hoje ou futura.'); }
    else selectedDate = next;
    renderCalendar();
  });
  $('#previous-period').addEventListener('click', () => changePeriod(-1));
  $('#next-period').addEventListener('click', () => changePeriod(1));
  $('#today-button').addEventListener('click', () => { selectedDate = new Date(today); renderCalendar(); });
  $('#reset-filters').addEventListener('click', () => {
    modalityFilter.value = ''; levelFilter.value = 'all'; timeFilter.value = 'all'; refreshCoachOptions();
    coachFilter.value = 'all'; selectedDate = new Date(today); view = 'week';
    $$('[data-view]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
    renderCalendar();
  });
  $$('[data-view]').forEach((button) => button.addEventListener('click', () => {
    view = button.dataset.view;
    $$('[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderCalendar();
  }));
  $$('[data-select-program]').forEach((link) => link.addEventListener('click', () => {
    const modality = link.dataset.selectProgram;
    document.querySelectorAll('[data-modality-panel]').forEach((panel) => panel.classList.toggle('is-selected', panel.dataset.modalityPanel === modality));
  }));
  $$('[data-set-modality]').forEach((link) => link.addEventListener('click', () => {
    modalityFilter.value = link.dataset.setModality; refreshCoachOptions(); renderCalendar();
  }));
  $('.close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  $('.menu-toggle').addEventListener('click', (event) => {
    const button = event.currentTarget; const nav = $('#primary-nav');
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
  });
  $$('.primary-nav a').forEach((link) => link.addEventListener('click', () => {
    $('#primary-nav').classList.remove('is-open'); $('.menu-toggle').setAttribute('aria-expanded', 'false');
  }));
  window.addEventListener('storage', (event) => { if (event.key === STORAGE_KEY) renderCalendar(); });

  refreshCoachOptions();
  renderCalendar();
})();
