// Adapter only. The original HQGD engine and four-period formula modules remain unchanged.
import {SUBJECTS,className} from './hqgd-source/engine.mjs?v=tn-cn-complete-v8-4';
import {fourPeriods} from './hqgd-source/four-periods.mjs?v=tn-cn-complete-v8-4';
export const PERIODS=['Giữa HK1','HK1','Giữa HK2','HK2'];
export const missingTeacher=t=>t.startsWith('[Chưa phân công] ');
const core=s=>['Toán','Ngữ văn','Văn','Giáo dục quốc phòng và an ninh'].includes(s);
export function cohort(r,useTNClasses=false){const selected=r.thiTN==='Chọn'||(useTNClasses&&r.tnReportChoice==='Chọn');return Number(r.grade)!==12||core(r.subject)?'Chung':useTNClasses&&selected&&r.year==='2026-2027'&&!r.tnClass?'Chọn TN — chưa ghép lớp':selected?'Chọn TN':r.thiTN==='Không chọn'?'Không chọn TN':'Chưa khai báo';}
export function buildHQGD(records,assignments,year,grade,{useTNClasses=false}={}){
 if(!grade)return [];
 records=useTNClasses?(globalThis.HTB_TN2027?.hqRows(records)||records):records.map(r=>globalThis.HTB_TN2027?.resolve(r)||r);
 assignments=globalThis.HTB_TN2027?.assignments(assignments)||assignments;
 const rows=records.filter(r=>!r.tnExcluded&&r.year===year&&String(r.grade)===String(grade));
 const partitions=new Map();
 for(const r of rows){const group=cohort(r,useTNClasses);if(!partitions.has(group))partitions.set(group,[]);partitions.get(group).push(r);if(!SUBJECTS.includes(r.subject))SUBJECTS.push(r.subject);}
 if(useTNClasses&&String(grade)==='12'&&year===globalThis.HTB_TN2027?.data.year&&!partitions.has('Chọn TN'))partitions.set('Chọn TN',[]);
 return [...partitions].map(([group,marks])=>{
  const classes=new Map();for(const r of marks){const k=JSON.stringify([r.subject,className(r.class)]);if(!classes.has(k))classes.set(k,{subject:r.subject,class:className(r.class),values:[[],[],[],[]],students:[[],[],[],[]]});const i=PERIODS.indexOf(r.period);if(i>=0&&Number.isFinite(r.score)){classes.get(k).values[i].push(r.score);classes.get(k).students[i].push(r.student);}}
  if(useTNClasses&&group==='Chọn TN')for(const a of globalThis.HTB_TN2027?.data.assignments||[]){if(a.year!==year||!a.sourceClass||!rows.some(r=>r.subject===a.subject))continue;const k=JSON.stringify([a.subject,className(a.class)]);if(!classes.has(k))classes.set(k,{subject:a.subject,class:className(a.class),values:[[],[],[],[]],students:[[],[],[],[]]});}
  const terms={1:[],2:[]},counts=[];
  for(const row of classes.values()){
   let assignment=assignments.find(a=>a.year===year&&a.subject===row.subject&&className(a.class)===row.class);
   if(group==='Chọn TN'&&row.subject==='Công nghệ'&&!assignment?.teacher1){const admins=[...new Set(marks.filter(r=>r.subject===row.subject&&className(r.class)===row.class).map(r=>r.adminClass).filter(Boolean))];const choices=admins.map(c=>assignments.find(a=>a.year===year&&a.subject===row.subject&&className(a.class)===className(c)));const names=[...new Set(choices.map(a=>a?.teacher1).filter(Boolean))];if(choices.length&&choices.every(a=>a?.teacher1)&&names.length===1)assignment={...assignment,teacher1:names[0]};}
   const means=row.values.map(v=>!group.includes('chưa ghép lớp')&&v.length?v.reduce((s,n)=>s+n,0)/v.length:null);
   const sourceClass=globalThis.HTB_TN2027?.data.assignments.find(a=>a.year===year&&a.subject===row.subject&&a.class===row.class)?.sourceClass;const rosterCount=group==='Chọn TN'&&sourceClass?(globalThis.HTB_TN2027?.data.counts[row.subject]?.[sourceClass]??null):null;counts.push({subject:row.subject,class:row.class,counts:row.values.map(v=>v.length),distinctCounts:{gk1:new Set(row.students[0]).size,hk1:new Set(row.students[1]).size,gk2:new Set(row.students[2]).size,hk2:new Set(row.students[3]).size,hk1Combined:new Set([...row.students[0],...row.students[1]]).size,hk2Combined:new Set([...row.students[2],...row.students[3]]).size,annual:new Set(row.students.flat()).size},rosterCount});
   for(const t of [1,2]){
    // Include the union of classes across four periods so missing periods stay blank and block ranks.
    terms[t].push({subject:row.subject,class:row.class,teacher:(group.includes('chưa ghép lớp')?'':assignment?.['teacher'+t])||'[Chưa phân công] '+row.class,mid:means[(t-1)*2],final:means[(t-1)*2+1]});
   }
  }
  const report=fourPeriods(terms[1],terms[2]);
  const unassigned=new Set();for(const t of [1,2]){
   const term=t===1?report.first:report.second;
   for(const r of term.rows){r.assigned=!missingTeacher(r.teacher);if(!r.assigned)unassigned.add(r.subject);}
   term.teachers=term.teachers.filter(r=>!missingTeacher(r.teacher));
   // Unassigned classes must not make a teacher ranking look complete.
   for(const r of term.teachers)if(r.referenceByTeacher||term.rows.some(x=>x.subject===r.subject&&!x.assigned))r.rank=null;
  }
  report.teachers=report.teachers.filter(r=>!missingTeacher(r.teacher));
  return {group,report,counts,unassigned:[...unassigned]};
 });
}
