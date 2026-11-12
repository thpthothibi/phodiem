'use strict';
const filterNames={period:'Kỳ đánh giá',grade:'Khối',subject:'Môn học',class:'Lớp'};
function syncFilterMenu(id){
 if(!filterNames[id])return;
 const select=document.getElementById(id);if(!select)return;
 let menu=document.getElementById('menu-'+id);if(!menu){menu=document.createElement('details');menu.id='menu-'+id;menu.className='filter-menu';select.after(menu);}
 const wasOpen=menu.open;
 menu.innerHTML='<summary aria-label="Chọn '+filterNames[id]+'"><span></span><b>⌄</b></summary><div class="filter-popover"><div class="filter-tools"><button type="button" data-all>Chọn tất cả</button><button type="button" data-clear>Bỏ chọn</button></div><input class="filter-search" type="search" placeholder="Tìm '+filterNames[id].toLowerCase()+'…" aria-label="Tìm '+filterNames[id]+'"><div class="filter-checks"></div></div>';
 const list=menu.querySelector('.filter-checks');
 for(const option of select.options){const label=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');input.type='checkbox';input.value=option.value;input.checked=option.selected;input.setAttribute('aria-label',filterNames[id]+' '+option.textContent);span.textContent=option.textContent;label.append(input,span);list.append(label);input.onchange=()=>{option.selected=input.checked;select.dispatchEvent(new Event('change',{bubbles:true}));};}
 if(!select.options.length)list.textContent='Chưa có dữ liệu';
 menu.querySelector('[data-all]').onclick=()=>{for(const o of select.options)o.selected=true;select.dispatchEvent(new Event('change',{bubbles:true}));};
 menu.querySelector('[data-clear]').onclick=()=>{for(const o of select.options)o.selected=false;select.dispatchEvent(new Event('change',{bubbles:true}));};
 menu.querySelector('.filter-search').oninput=e=>{const q=e.target.value.toLocaleLowerCase('vi');for(const l of list.querySelectorAll('label'))l.hidden=!l.textContent.toLocaleLowerCase('vi').includes(q);};
 menu.ontoggle=()=>{if(menu.open)for(const other of document.querySelectorAll('.filter-menu'))if(other!==menu)other.open=false;};menu.open=wasOpen;
 refreshFilterLabels();
}
function refreshFilterLabels(){for(const [id,name] of Object.entries(filterNames)){const select=document.getElementById(id),menu=document.getElementById('menu-'+id);if(!menu)continue;const chosen=[...select.selectedOptions].map(x=>x.textContent),summary=menu.querySelector('summary span');summary.textContent=!chosen.length?'Tất cả':chosen.length===1?chosen[0]:chosen.length+' '+({period:'kỳ',grade:'khối',subject:'môn',class:'lớp'}[id]);summary.title=chosen.join(', ')||'Tất cả '+name.toLowerCase();for(const input of menu.querySelectorAll('input[type=checkbox]'))input.checked=[...select.selectedOptions].some(o=>o.value===input.value);}}
document.addEventListener('click',e=>{for(const menu of document.querySelectorAll('.filter-menu'))if(!menu.contains(e.target))menu.open=false;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')for(const menu of document.querySelectorAll('.filter-menu'))menu.open=false;});
