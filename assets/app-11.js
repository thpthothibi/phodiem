'use strict';
const EXCLUSION_KEY='htb.copy.exclusions.v1';
let excludedStudents=[],excludedWorkbook=null,excludedIndex=new Set(),copyExcluded=[],exclusionLoadError=false;
function exclusionName(value){return String(value??'').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g,'').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');}
function exclusionMatchKey(name,klass){return JSON.stringify([exclusionName(name),canonicalClass(klass)]);}
function exclusionActive(){return excludedStudents.length>0;}
function isExcludedStudent(name,klass){return excludedIndex.has(exclusionMatchKey(name,klass));}
function setExcludedStudents(list){localStorage.setItem(EXCLUSION_KEY,JSON.stringify(list));exclusionLoadError=false;excludedStudents=list;excludedIndex=new Set(list.map(r=>exclusionMatchKey(r.name,r.class)));renderExcludedStudents();if(typeof buildCopyPreview==='function')buildCopyPreview();}
function renderExcludedStudents(){
 $('exclusionCount').textContent=number(excludedStudents.length)+' học sinh';$('exclusionClear').disabled=!exclusionActive();$('exclusionExport').disabled=!exclusionActive();
 $('exclusionRows').innerHTML=excludedStudents.slice(0,50).map((r,i)=>'<tr><td>'+(i+1)+'</td><td>'+esc(r.name)+'</td><td>'+esc(r.class)+'</td></tr>').join('')||'<tr><td colspan="3">Chưa có danh sách. Chưa loại học sinh nào khi sao chép.</td></tr>';
}
function parseExclusionRows(rows){
 if(rows.length>50030)throw Error('Danh sách vượt 50.000 dòng.');
 const nameAliases=['hoten','hovaten','tenhocsinh','hovatenhocsinh','fullname'],classAliases=['lop','tenlop','lophoc','class'];let header=-1,nameCol=-1,classCol=-1;
 for(let i=0;i<Math.min(30,rows.length);i++){const keys=rows[i].map(plainKey),n=keys.map((k,j)=>nameAliases.includes(k)?j:-1).filter(j=>j>=0),c=keys.map((k,j)=>classAliases.includes(k)?j:-1).filter(j=>j>=0);if(n.length===1&&c.length===1){header=i;nameCol=n[0];classCol=c[0];break;}}
 if(header<0)throw Error('Không tìm thấy hai cột Họ tên và Lớp trong 30 dòng đầu. Dùng mẫu Ho_ten, Lop hoặc chọn đúng trang Excel.');
 const list=[],seen=new Set(),errors=[];let duplicates=0;
 for(let i=header+1;i<rows.length;i++){const row=rows[i];if(row.every(v=>String(v??'').trim()===''))continue;if(!String(row[nameCol]??'').trim()&&!String(row[classCol]??'').trim())continue;const name=String(row[nameCol]??'').normalize('NFC').trim().replace(/\s+/g,' '),klass=canonicalClass(row[classCol]);if(!name||!klass||name.length>150||klass.length>100){errors.push('Dòng '+(i+1)+': thiếu hoặc quá dài họ tên/lớp.');continue;}const k=exclusionMatchKey(name,klass);if(seen.has(k)){duplicates++;continue;}seen.add(k);list.push({name,class:klass});}
 if(errors.length)throw Error(errors.slice(0,5).join(' ')+' Chưa thay đổi danh sách đã lưu.');if(!list.length)throw Error('Danh sách không có học sinh.');return {list,duplicates};
}
function loadExclusionSheet(){if(!excludedWorkbook)return;try{const rows=XLSX.utils.sheet_to_json(excludedWorkbook.Sheets[$('exclusionSheet').value],{header:1,defval:'',raw:false,blankrows:true}),parsed=parseExclusionRows(rows);if(exclusionActive()&&!confirm('Thay danh sách '+excludedStudents.length+' học sinh không tính điểm bằng '+parsed.list.length+' học sinh trong trang vừa chọn?'))return;setExcludedStudents(parsed.list);$('exclusionStatus').textContent='Đã lưu '+number(parsed.list.length)+' học sinh. '+(parsed.duplicates?'Gộp '+parsed.duplicates+' dòng trùng tên và lớp. ':'')+'Danh sách được áp dụng ngay khi sao chép điểm.';$('exclusionStatus').classList.remove('has-error');}catch(e){$('exclusionStatus').textContent=e.message;$('exclusionStatus').classList.add('has-error');}}
$('exclusionPick').onclick=()=>$('exclusionFile').click();
$('exclusionFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('File vượt quá 10 MB.');if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw Error('Chọn file Excel hoặc CSV.');excludedWorkbook=XLSX.read(await file.arrayBuffer(),{type:'array',raw:true});opts('exclusionSheet',excludedWorkbook.SheetNames,[excludedWorkbook.SheetNames.includes('Khong_tinh_diem')?'Khong_tinh_diem':excludedWorkbook.SheetNames[0]]);$('exclusionSheetWrap').hidden=false;loadExclusionSheet();}catch(e){$('exclusionStatus').textContent=e.message;$('exclusionStatus').classList.add('has-error');}finally{e.target.value='';}};
$('exclusionSheet').onchange=loadExclusionSheet;
$('exclusionClear').onclick=()=>{if(!exclusionActive()||!confirm('Xóa danh sách học sinh không tính điểm? Các điểm đã nhập vào thống kê không thay đổi.'))return;try{setExcludedStudents([]);$('exclusionStatus').textContent='Đã xóa danh sách. Các dòng điểm sẽ không bị loại theo tên/lớp khi sao chép.';$('exclusionStatus').classList.remove('has-error');}catch{toast('Không lưu được thay đổi danh sách.');}};
$('exclusionExport').onclick=()=>exportBook([['Ho_ten','Lop'],...excludedStudents.map(r=>[r.name,r.class])],'Danh_sach_khong_tinh_diem.xlsx','Khong_tinh_diem');
$('copyExcludedDownload').onclick=()=>{if(copyExcluded.length)exportBook([['Dong_nguon','Ho_ten','Lop','Diem_nguon'],...copyExcluded.map(r=>[r.row,r.name,r.class,r.score])],'Hoc_sinh_da_bo_qua.xlsx','Da_bo_qua');};
try{const list=JSON.parse(localStorage.getItem(EXCLUSION_KEY)||'[]');if(!Array.isArray(list)||list.length>50000||list.some(r=>!r||typeof r.name!=='string'||typeof r.class!=='string'||!exclusionName(r.name)||!canonicalClass(r.class)))throw Error();excludedStudents=list;excludedIndex=new Set(list.map(r=>exclusionMatchKey(r.name,r.class)));}catch{exclusionLoadError=true;$('exclusionStatus').textContent='Không đọc được danh sách đã lưu. Hãy nhập lại trước khi sao chép điểm.';$('exclusionStatus').classList.add('has-error');}
renderExcludedStudents();
