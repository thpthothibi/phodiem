// Reporting selection over original HQGD results. No original source formulas are changed.
export const PERIOD_OPTIONS=[['gk1','Giữa HK1'],['hk1','HK1'],['gk2','Giữa HK2'],['hk2','HK2'],['annual','Cả năm']];
export function periodLabel(id,combined){const label=PERIOD_OPTIONS.find(p=>p[0]===id)?.[1]||id;return id==='annual'?'Cả năm · đủ bốn đợt':id.startsWith('hk')?label+(combined?' · Chung với giữa kỳ':' · Riêng học kỳ'):label;}
const rank=(v,all)=>v==null?null:1+all.filter(x=>x!=null&&x>v+1e-10).length;
export function selectPeriod(partition,id='hk1',combined=true){
 const report=partition.report,year=id==='annual',term=id.endsWith('2')?2:1,base=term===1?report.first:report.second;
 if(!PERIOD_OPTIONS.some(p=>p[0]===id))throw Error('Kỳ HQGD không hợp lệ.');
 if(!year&&id.startsWith('hk')&&combined)return {...base,kind:'combined',label:periodLabel(id,true),term};
 if(year){
  const rows=report.rows.map(r=>({...r,teacher:r.teacher1===r.teacher2?r.teacher1:r.teacher1+' / '+r.teacher2,assigned:!r.teacher1.startsWith('[Chưa phân công] ')&&!r.teacher2.startsWith('[Chưa phân công] '),effect:r.total,rank:null}));
  for(const r of rows){const peers=rows.filter(x=>x.subject===r.subject);r.complete=peers.every(x=>x.total!==null);r.rank=r.complete?rank(r.total,peers.map(x=>x.total)):null;}
  const teachers=report.teachers.map(r=>({...r,effect:r.total,classes:[...new Set(report.rows.filter(x=>x.subject===r.subject&&(x.teacher1===r.teacher||x.teacher2===r.teacher)).map(x=>x.class))],rank:null,complete:r.total!==null}));
  for(const r of teachers){const peers=teachers.filter(x=>x.subject===r.subject);if(rows.filter(x=>x.subject===r.subject).every(x=>x.complete&&x.assigned)&&peers.every(x=>x.complete))r.rank=rank(r.effect,peers.map(x=>x.effect));}
  const baselines=report.first.baselines.map(a=>{const b=report.second.baselines.find(x=>x.subject===a.subject&&x.grade===a.grade);return {...a,gk1:a.mid,hk1:a.final,gk2:b?.mid??null,hk2:b?.final??null,complete:a.complete&&!!b?.complete};});
  return {rows,teachers,baselines,kind:'annual',label:periodLabel(id,true),term:0};
 }
 const mid=id.startsWith('gk'),key=mid?'mid':'final',delta=mid?'deltaMid':'deltaFinal',benchmark=mid?'baseMid':'baseFinal';
 const rows=base.rows.map(r=>({...r,score:r[key],benchmark:r[benchmark],effect:r[delta],rank:null}));
 for(const r of rows){const peers=rows.filter(x=>x.subject===r.subject);r.complete=peers.every(x=>x.effect!==null);r.rank=r.complete?rank(r.effect,peers.map(x=>x.effect)):null;}
 const teachers=base.teachers.map(r=>{const classes=rows.filter(x=>x.subject===r.subject&&x.teacher===r.teacher);return {...r,complete:classes.length>0&&classes.every(x=>x.effect!==null),effect:classes.length&&classes.every(x=>x.effect!==null)?classes.reduce((s,x)=>s+x.effect,0):null,rank:null};});
 for(const r of teachers){const peers=teachers.filter(x=>x.subject===r.subject);if(rows.filter(x=>x.subject===r.subject).every(x=>x.complete&&x.assigned)&&peers.every(x=>x.complete))r.rank=rank(r.effect,peers.map(x=>x.effect));}
 const baselines=base.baselines.map(r=>({...r,score:r[key],complete:rows.filter(x=>x.subject===r.subject).every(x=>x.effect!==null)}));
 return {rows,teachers,baselines,kind:'single',label:periodLabel(id,false),term};
}
export function classTable(model,teacher=x=>x){
 if(model.kind==='combined')return {headers:['Môn','Lớp','Giáo viên','BQ giữa kỳ','BQ khối GK','ĐL giữa kỳ','Hạng GK','BQ cuối kỳ','BQ khối CK','ĐL cuối kỳ','Hạng CK','HQ học kỳ (chung)','Hạng HQ'],rows:model.rows.map(r=>[r.subject,r.class,teacher(r.teacher),r.mid,r.baseMid,r.deltaMid,r.rankMid,r.final,r.baseFinal,r.deltaFinal,r.rankFinal,r.effect,r.rank])};
 if(model.kind==='annual')return {headers:['Môn','Lớp','GV HK1','GV HK2','ĐL Giữa HK1','ĐL HK1','ĐL Giữa HK2','ĐL HK2','HQ HK1 (chung)','HQ HK2 (chung)','HQ cả năm','Hạng'],rows:model.rows.map(r=>[r.subject,r.class,teacher(r.teacher1),teacher(r.teacher2),r.dgk1,r.dhk1,r.dgk2,r.dhk2,r.effect1,r.effect2,r.effect,r.rank])};
 return {headers:['Môn','Lớp','Giáo viên','BQ lớp kỳ chọn','BQ khối kỳ chọn','HQ riêng (độ lệch)','Hạng'],rows:model.rows.map(r=>[r.subject,r.class,teacher(r.teacher),r.score,r.benchmark,r.effect,r.rank])};
}
export function baselineTable(model){
 if(model.kind==='annual')return {headers:['Môn','Khối','Số lớp','BQ Giữa HK1','BQ HK1','BQ Giữa HK2','BQ HK2','Trạng thái'],rows:model.baselines.map(r=>[r.subject,r.grade,r.classes,r.gk1,r.hk1,r.gk2,r.hk2,r.complete?'Đủ điểm':'Chưa đủ điểm'])};
 if(model.kind==='combined')return {headers:['Môn','Khối','Số lớp','BQ giữa kỳ','BQ cuối kỳ','Trạng thái'],rows:model.baselines.map(r=>[r.subject,r.grade,r.classes,r.mid,r.final,r.complete?'Đủ điểm':'Chưa đủ điểm'])};
 return {headers:['Môn','Khối','Số lớp','BQ kỳ đã chọn','Trạng thái'],rows:model.baselines.map(r=>[r.subject,r.grade,r.classes,r.score,r.complete?'Đủ điểm':'Chưa đủ điểm'])};
}
