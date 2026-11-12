export const VERSION='hqgd-3.0.0';
export const SUBJECTS=['Toán','Lý','Văn','Sử','Hóa','Địa','Tiếng anh','Sinh','KTPL','Tin học','Công nghệ','Thể dục','GDQP'];
export const SCHOOL_YEARS={'2026-2027':{'10':19,'11':13,'12':13}};
export function schoolClasses(year){const counts=SCHOOL_YEARS[year];return counts?Object.entries(counts).flatMap(([grade,count])=>Array.from({length:count},(_,i)=>grade+'A'+String(i+1).padStart(2,'0'))):[];}
export function validateScope(rows,year){const classes=schoolClasses(year);return classes.length?rows.filter(r=>!classes.includes(className(r.class))).map(r=>`${r.subject} ${r.class}: nằm ngoài danh mục lớp năm học ${year}`):[];}
export const norm=s=>String(s??'').normalize('NFC').trim().replace(/\s+/g,' ');
export function className(s){return norm(s).toUpperCase().replace(/^(10|11|12)A0*(\d+)$/,'$1A$2').replace(/A(\d)$/,'A0$1');}
export function number(s){if(s===null||s===undefined||s==='')return null;let n=Number(String(s).replace(',','.'));return Number.isFinite(n)?n:null;}
const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:null;
// Excel RANK.EQ descending: ties share rank; the next rank has a gap.
const rank=(v,all)=>v===null?null:1+all.filter(x=>x!==null&&x>v+1e-10).length;
export function validate(rows){
 const seen=new Set(),errors=[];
 rows.forEach((r,i)=>{let label=`Dòng ${i+1}`;if(!SUBJECTS.includes(r.subject))errors.push(`${label}: chưa xác nhận môn`);if(!/^(10|11|12)[A-Z]{1,5}\d{1,3}$/.test(className(r.class)))errors.push(`${label}: lớp không hợp lệ`);if(!norm(r.teacher))errors.push(`${label}: thiếu giáo viên`);
 for(let k of ['mid','final'])if(r[k]!==null&&r[k]!==undefined&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0||r[k]>10))errors.push(`${label}: điểm ${k} phải từ 0 đến 10 hoặc để trống`);
 let key=r.subject+'|'+className(r.class);if(seen.has(key))errors.push(`${label}: trùng môn/lớp ${key}`);seen.add(key);});return errors;
}
export function calculate(input){
 const errors=validate(input);if(errors.length)throw Error(errors.slice(0,12).join('\n'));
 const rows=input.map(r=>({...r,class:className(r.class),teacher:norm(r.teacher),mid:r.mid??null,final:r.final??null}));
 const groups=new Map();for(let r of rows){let key=r.subject+'|'+r.class.slice(0,2);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const baselines=[];
 for(let [key,a] of groups){let mid=mean(a.filter(r=>r.mid!==null).map(r=>r.mid)),final=mean(a.filter(r=>r.final!==null).map(r=>r.final));let complete=a.every(r=>r.mid!==null&&r.final!==null);
 baselines.push({subject:a[0].subject,grade:a[0].class.slice(0,2),mid,final,classes:a.length,complete});
 for(let r of a){r.baseMid=mid;r.baseFinal=final;r.deltaMid=r.mid===null?null:r.mid-mid;r.deltaFinal=r.final===null?null:r.final-final;r.effect=r.deltaMid===null||r.deltaFinal===null?null:r.deltaMid+r.deltaFinal;r.complete=complete;}
 for(let r of a){r.rankMid=complete?rank(r.deltaMid,a.map(x=>x.deltaMid)):null;r.rankFinal=complete?rank(r.deltaFinal,a.map(x=>x.deltaFinal)):null;r.rank=complete?rank(r.effect,a.map(x=>x.effect)):null;}}
 const t=new Map();for(let r of rows){let key=r.subject+'|'+r.teacher;if(!t.has(key))t.set(key,{subject:r.subject,teacher:r.teacher,classes:[],effect:0,complete:true});let x=t.get(key);x.classes.push(r.class);x.complete&&=r.complete&&r.effect!==null;if(r.effect!==null)x.effect+=r.effect;}
 const teachers=[...t.values()];for(let x of teachers){if(!x.complete)x.effect=null;let a=teachers.filter(y=>y.subject===x.subject);x.rank=a.every(y=>y.complete)?rank(x.effect,a.map(y=>y.effect)):null;}
 return {version:VERSION,rows,teachers,baselines,complete:rows.length>0&&rows.every(r=>r.complete)};
}
export function annual(h1,h2){
 const keys=new Map();for(let [term,report] of [[1,h1],[2,h2]])for(let t of report?.teachers||[]){let k=t.subject+'|'+t.teacher;if(!keys.has(k))keys.set(k,{subject:t.subject,teacher:t.teacher,hk1:null,hk2:null});keys.get(k)['hk'+term]=t.effect;}
 return [...keys.values()].map(t=>({...t,total:t.hk1===null||t.hk2===null?null:t.hk1+t.hk2,hsdt:t.hk1===null||t.hk2===null?null:t.hk1-t.hk2}));
}
