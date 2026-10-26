const form = document.querySelector('#booking');
form?.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const labels = {name:'Meno / produkcia',email:'E-mail',event:'Akcia',location:'Miesto',date:'Termín',service:'Služba',details:'Podrobnosti'};
  const text = 'DOPYT PRE MAŤA — TECHNIK FESTIVALOV\n\n' + Object.entries(labels).map(([key,label]) => label + ': ' + String(data.get(key) || '').trim()).join('\n\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', text], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url; link.download = 'dopyt-pre-mata.txt'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector('#form-status').textContent = 'Zadanie je pripravené na stiahnutie. Maťovi zatiaľ nebolo odoslané.';
});
