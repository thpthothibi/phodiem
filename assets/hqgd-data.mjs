// Adapter only. The original HQGD engine and four-period formula modules remain unchanged.
import {SUBJECTS,className} from './hqgd-source/engine.mjs';
import {fourPeriods} from './hqgd-source/four-periods.mjs';
export const PERIODS=['Giữa HK1','HK1','Giữa HK2','HK2'];
export const missingTeacher=t=>t.startsWith('[Chưa phân công] ');
const core=s=>['Toán','Ngữ văn','Văn'].includes(s);
export function cohort(r){return Number(r.grade)!==12||core(r.subject)?'Chung':r.thiTN==='Chọn'?'Chọn TN':r.thiTN==='Không chọn'?'Không chọn TN':'Chưa khai báo';}
export function buildHQGD(records,assignments,year,grade){
 if(!grade)return [];
 const rows=records.filter(r=>r.year===year&&String(r.grade)===String(grade));
 const partitions=new Map();
 for(const r of rows){const group=cohort(r);if(!partitions.has(group))partitions.set(group,[]);partitions.get(group).push(r);if(!SUBJECTS.includes(r.subject))SUBJECTS.push(r.subject);}
 return [...partitions].map(([group,marks])=>{
  const classes=new Map();for(const r of marks){const k=JSON.stringify([r.subject,className(r.class)]);if(!classes.has(k))classes.set(k,{subject:r.subject,class:className(r.class),values:[[],[],[],[]]});const i=PERIODS.indexOf(r.period);if(i>=0&&Number.isFinite(r.score))classes.get(k).values[i].push(r.score);}
  const terms={1:[],2:[]},counts=[];
  for(const row of classes.values()){
   const assignment=assignments.find(a=>a.year===year&&a.subject===row.subject&&className(a.class)===row.class);
   const means=row.values.map(v=>v.length?v.reduce((s,n)=>s+n,0)/v.length:null);
   counts.push({subject:row.subject,class:row.class,counts:row.values.map(v=>v.length)});
   for(const t of [1,2]){
    // Include the union of classes across four periods so missing periods stay blank and block ranks.
    terms[t].push({subject:row.subject,class:row.class,teacher:assignment?.['teacher'+t]||'[Chưa phân công] '+row.class,mid:means[(t-1)*2],final:means[(t-1)*2+1]});
   }
  }
  const report=fourPeriods(terms[1],terms[2]);
  const unassigned=new Set();for(const t of [1,2]){
   const term=t===1?report.first:report.second;
   for(const r of term.rows){r.assigned=!missingTeacher(r.teacher);if(!r.assigned)unassigned.add(r.subject);}
   term.teachers=term.teachers.filter(r=>!missingTeacher(r.teacher));
   // Unassigned classes must not make a teacher ranking look complete.
   for(const r of term.teachers)if(term.rows.some(x=>x.subject===r.subject&&!x.assigned))r.rank=null;
  }
  report.teachers=report.teachers.filter(r=>!missingTeacher(r.teacher));
  return {group,report,counts,unassigned:[...unassigned]};
 });
}
