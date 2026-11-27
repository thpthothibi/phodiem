'use strict';
(() => {
  const panel = $('deletePanel');
  const fields = ['delYear', 'delPeriod', 'delGrade', 'delSubject'].map($);
  const box = $('delClasses');
  const button = $('delSubmit');
  let shownRecords;
  let groups = new Map();

  function options(field, values, prompt, keep) {
    const old = field.value;
    field.replaceChildren(new Option(prompt, ''), ...values.map(value => new Option(value, value)));
    if (keep && values.includes(old)) field.value = old;
  }

  function selected() {
    return [...box.querySelectorAll('input:checked')].map(input => input.value);
  }

  function updateStatus() {
    const names = selected();
    const total = names.reduce((sum, name) => sum + groups.get(name), 0);
    const allowed = cloudRole === 'editor' && cloudActive && KEY === 'hoclieu.v1';
    button.disabled = !allowed || cloudBusy || cloudConflict || loading || !total;
    $('delStatus').textContent = !allowed ? 'Vào Kho dữ liệu Cloudflare và xác thực bằng mã quản lý để xóa điểm.'
      : cloudConflict ? 'Có xung đột đồng bộ. Kiểm tra Kho dữ liệu Cloudflare trước khi xóa.'
      : 'Đã chọn ' + names.length + ' lớp · ' + number(total) + ' lượt điểm.';
  }

  function rebuild(changed = -1) {
    shownRecords = records;
    let rows = records;
    const keys = ['year', 'period', 'grade', 'subject'];
    fields.forEach((field, i) => {
      const values = [...new Set(rows.map(row => String(row[keys[i]])))].sort((a,b) =>
        i === 1 ? PERIODS.indexOf(a) - PERIODS.indexOf(b) : a.localeCompare(b,'vi',{numeric:true}));
      if (i > changed) {
        options(field, values, ['Chọn năm học','Chọn kỳ','Chọn khối','Chọn môn'][i], changed === -1);
        if (i === 3 && values.length) field.add(new Option('Tất cả môn trong khối', '*'), 1);
      }
      const value = field.value;
      if (!(i === 3 && value === '*')) rows = rows.filter(row => String(row[keys[i]]) === value);
    });
    groups = new Map();
    for (const row of rows) groups.set(row.class, (groups.get(row.class) || 0) + 1);
    box.replaceChildren();
    for (const name of [...groups.keys()].sort((a,b) => a.localeCompare(b,'vi',{numeric:true}))) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = name;
      label.append(input, ' ' + name + ' (' + groups.get(name) + ' lượt)');
      box.append(label);
    }
    $('delAll').disabled = $('delNone').disabled = !groups.size;
    updateStatus();
  }

  fields.forEach((field, index) => field.onchange = () => rebuild(index));
  box.onchange = updateStatus;
  for (const id of ['delAll','delNone']) $(id).onclick = () => {
    for (const input of box.querySelectorAll('input')) input.checked = id === 'delAll';
    updateStatus();
  };
  panel.ontoggle = () => { if (panel.open) rebuild(); };
  new MutationObserver(() => {
    if (!panel.open) return;
    if (shownRecords !== records) rebuild();
    else updateStatus();
  }).observe($('cloudBadge'), {childList:true, subtree:true});

  button.onclick = () => {
    if (shownRecords !== records) { rebuild(); return toast('Dữ liệu vừa thay đổi. Vui lòng chọn lại lớp.'); }
    updateStatus();
    if (button.disabled) return;
    const [year, period, grade, subject] = fields.map(field => field.value);
    const classes = new Set(selected());
    const remaining = records.filter(r => !(r.year === year && r.period === period &&
      String(r.grade) === grade && (subject === '*' || r.subject === subject) && classes.has(r.class)));
    const count = records.length - remaining.length;
    const scope = [year, period, 'Khối ' + grade, subject === '*' ? 'Tất cả môn' : subject].join(' · ');
    const details = [...classes].map(name => name + ' (' + groups.get(name) + ')').join(', ');
    if (!count || !confirm('Xóa ' + count + ' lượt điểm?\n' + scope + '\n' + details)) return;
    if (!save(remaining)) return;
    records = remaining;
    demo = false;
    refreshFilters(false);
    render();
    renderRaw();
    rebuild();
    toast('Đã xóa ' + count + ' lượt điểm trên máy. Theo dõi trạng thái đồng bộ Cloudflare.');
  };
})();
