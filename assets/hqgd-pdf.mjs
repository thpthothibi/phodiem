import {buildHQGD,missingTeacher} from './hqgd-data.mjs';
import {selectPeriod,periodLabel} from './hqgd-period.mjs';
const cmp=(a,b)=>String(a).localeCompare(String(b),'vi',{numeric:true});
const format=v=>v===null||v===undefined?'':Number(Math.abs(v)<0.005?0:v).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2});
const displayTeacher=t=>!t||missingTeacher(t)?'Chưa phân công':t;
const rank=(v,all)=>v===null?null:1+all.filter(x=>x!==null&&x>v+1e-10).length;
export function makePDFJobs(records,assignments,{year,grades,subjects,period,combined,klass='',tn=''}){
 const jobs=[];for(const subject of [...new Set(subjects)].sort(cmp)){
  const sections=[];for(const grade of grades){for(const p of buildHQGD(records,assignments,year,grade)){
   if(tn&&p.group!=='Chung'&&p.group!==tn)continue;
   const model=selectPeriod(p,period,combined),full=model.rows.filter(r=>r.subject===subject),rows=full.filter(r=>!klass||r.class===klass);
   if(rows.length)sections.push({grade:String(grade),group:p.group,model,rows,counts:p.counts.filter(r=>r.subject===subject),baseline:model.baselines.find(r=>r.subject===subject),teachers:model.teachers.filter(r=>r.subject===subject)});
  }}if(sections.length)jobs.push({subject,sections,year,period,combined,label:periodLabel(period,combined),klass});
 }return jobs;
}
function studentCount(section,row,period,combined){const c=section.counts.find(x=>x.class===row.class)?.counts||[0,0,0,0];if(period==='annual')return c.join('/');const i=period.endsWith('2')?2:0;return period.startsWith('gk')?String(c[i]):combined?(c[i]===c[i+1]?String(c[i]):c[i]+'/'+c[i+1]):String(c[i+1]);}
function classTable(section,job){
 const {model}=section,annual=model.kind==='annual',term=job.period.endsWith('2')?2:1;
 if(annual){return {head:[[{content:'Lớp',rowSpan:2},{content:'Giáo viên HK1 / HK2',rowSpan:2},{content:'HS có điểm',rowSpan:2},{content:'Học kỳ 1',colSpan:3},{content:'Học kỳ 2',colSpan:3},{content:'HQ cả năm',rowSpan:2},{content:'Hạng',rowSpan:2}],['ĐL GK','ĐL HK','HQ HK1','ĐL GK','ĐL HK','HQ HK2']],body:section.rows.sort((a,b)=>cmp(a.class,b.class)).map(r=>[r.class,displayTeacher(r.teacher1)+(r.teacher1===r.teacher2?'':' / '+displayTeacher(r.teacher2)),studentCount(section,r,job.period,job.combined),...['dgk1','dhk1','effect1','dgk2','dhk2','effect2','effect','rank'].map(k=>k==='rank'?r[k]??'':format(r[k]))]),widths:[16,44,19,14,14,15,14,14,15,16,13]};}
 const mid=job.period.startsWith('gk'),both=model.kind==='combined',b=section.baseline;
 const body=section.rows.sort((a,b)=>cmp(a.class,b.class)).map(r=>[r.class,displayTeacher(r.teacher),studentCount(section,r,job.period,job.combined),...(both||mid?[format(r.mid),format(r.deltaMid),both?r.rankMid??'':r.rank??'']:['','','']),...(!mid?[format(r.final),format(r.deltaFinal),both?r.rankFinal??'':r.rank??'']:['','','']),format(r.effect),r.rank??'']);
 body.push([{content:'K'+section.grade,colSpan:3,styles:{halign:'left'}},both||mid?format(b?.mid):'','','',!mid?format(b?.final):'','','','','']);
 return {head:[[{content:'Lớp',rowSpan:2},{content:'Giáo viên',rowSpan:2},{content:'HS có điểm',rowSpan:2},{content:'Điểm kiểm tra giữa kỳ '+term,colSpan:3},{content:'Điểm kiểm tra học kỳ '+term,colSpan:3},{content:'Hiệu quả',rowSpan:2},{content:'Hạng',rowSpan:2}],['BQ','ĐL','XH','BQ','ĐL','XH']],body,widths:[17,48,15,15,15,10,15,15,10,17,12]};
}
function teacherGroups(job){const groups=new Map();for(const section of job.sections){if(!groups.has(section.group))groups.set(section.group,[]);groups.get(section.group).push(section);}return [...groups].map(([group,sections])=>{
 const byTeacher=new Map();for(const s of sections)for(const t of s.teachers){if(job.klass&&!s.rows.some(r=>r.teacher===t.teacher||r.teacher1===t.teacher||r.teacher2===t.teacher))continue;if(!byTeacher.has(t.teacher))byTeacher.set(t.teacher,{teacher:t.teacher,effect:0,rank:null,details:[],complete:true});const item=byTeacher.get(t.teacher);item.complete&&=t.effect!==null;if(t.effect!==null)item.effect+=t.effect;
 // Keep teacher totals over all classes in the export grade scope; class filter changes visible detail only.
 const source=s.model.rows.filter(r=>r.subject===job.subject&&(r.teacher===t.teacher||r.teacher1===t.teacher||r.teacher2===t.teacher)&&(!job.klass||r.class===job.klass));item.details.push(...source);}
 const teachers=[...byTeacher.values()].sort((a,b)=>cmp(a.teacher,b.teacher));for(const t of teachers)if(!t.complete)t.effect=null;
 const complete=sections.every(s=>s.model.rows.filter(r=>r.subject===job.subject).every(r=>r.complete&&r.assigned))&&teachers.every(t=>t.complete);
 for(const t of teachers)t.rank=complete?rank(t.effect,teachers.map(x=>x.effect)):null;
 return {group,teachers,complete};});}
function teacherTable(group,job){const annual=job.period==='annual',mid=job.period.startsWith('gk'),both=job.period.startsWith('hk')&&job.combined,body=[];
 group.teachers.forEach((t,i)=>{t.details.sort((a,b)=>cmp(a.class,b.class));t.details.forEach((r,j)=>{const row=[];if(j===0)row.push({content:String(i+1),rowSpan:t.details.length},{content:t.teacher,rowSpan:t.details.length});row.push(r.class);
 if(annual){row.push(format(r.teacher1===t.teacher?r.effect1:null),format(r.teacher2===t.teacher?r.effect2:null),format(r.total));}
 else row.push(both||mid?format(r.mid):'',!mid?format(r.final):'',both||mid?format(r.deltaMid):'',!mid?format(r.deltaFinal):'',format(r.effect));
 if(j===0)row.push({content:format(t.effect),rowSpan:t.details.length},{content:t.rank??'',rowSpan:t.details.length});body.push(row);});});
 if(annual)return {head:[['TT','Giáo viên','Lớp','HQ HK1','HQ HK2','HQ lớp cả năm','HQ GV cả năm','Hạng']],body,widths:[9,50,18,23,23,23,25,18]};
 return {head:[[{content:'TT',rowSpan:2},{content:'Giáo viên',rowSpan:2},{content:'Lớp',rowSpan:2},{content:'Bình quân điểm số',colSpan:2},{content:'Hiệu quả giảng dạy',colSpan:2},{content:'Hiệu quả lớp',rowSpan:2},{content:'Hiệu quả chung',rowSpan:2},{content:'Hạng',rowSpan:2}],['GK','HK','GK','HK']],body,widths:[9,45,17,17,17,17,17,18,19,13]};
}
export function createHQGDPDF(jobs,{jsPDF,font}){
 if(!jobs.length)throw Error('Không có dữ liệu phù hợp để xuất.');if(!font||!jsPDF)throw Error('Chưa tải đủ thư viện PDF hoặc phông tiếng Việt.');
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});doc.addFileToVFS('HTB-VN.ttf',font);doc.addFont('HTB-VN.ttf','VN','normal');doc.addFont('HTB-VN.ttf','VN','bold');doc.setFont('VN');doc.setProperties({title:'Báo cáo HQGD theo môn',creator:'HTB Phổ Điểm'});
 const blue=[236,241,248],green=[219,232,187],pages=new Map();let currentJob=null;
 const pageHeader=()=>{const n=doc.getCurrentPageInfo().pageNumber;pages.set(n,currentJob);doc.setTextColor(0);doc.setFont('VN','bold');doc.setFontSize(10);doc.text('TRƯỜNG THPT HỒ THỊ BI',12,11);doc.setFontSize(11);const title=`KẾT QUẢ DẠY - HỌC MÔN ${currentJob.subject.toLocaleUpperCase('vi')}`;doc.text(title,105,18,{align:'center'});doc.setFont('VN','normal');doc.setFontSize(8.5);doc.text(`${currentJob.label} (${currentJob.year})`,105,24,{align:'center'});};
 function runTable(spec,startY,highlight=false){const sum=spec.widths.reduce((a,b)=>a+b,0);doc.autoTable({startY,margin:{top:32,bottom:19,left:12,right:12},tableWidth:186,theme:'grid',head:spec.head,body:spec.body,styles:{font:'VN',fontStyle:'normal',fontSize:7.6,cellPadding:1.1,lineColor:[30,30,30],lineWidth:.15,textColor:[0,0,0],halign:'center',valign:'middle',overflow:'linebreak'},headStyles:{font:'VN',fontStyle:'bold',fillColor:[255,255,255],textColor:[0,0,0]},columnStyles:Object.fromEntries(spec.widths.map((w,i)=>[i,{cellWidth:w*186/sum,...(i===1?{halign:'left'}:{})}])),rowPageBreak:'avoid',showHead:'everyPage',didParseCell(data){if(highlight&&currentJob.period!=='annual'&&data.section==='body'&&data.row.index===spec.body.length-1)data.cell.styles.fillColor=green;else if(!highlight&&data.section==='head')data.cell.styles.fillColor=blue;if(highlight&&currentJob.period!=='annual'&&data.column.index>=6&&data.column.index<=8)data.cell.styles.fillColor=green;},didDrawPage:pageHeader});return doc.lastAutoTable.finalY;}
 jobs.forEach((job,index)=>{if(index)doc.addPage();currentJob=job;pageHeader();let y=33;doc.setFontSize(9);doc.setFont('VN','bold');doc.text('1. Kết quả khối, lớp',12,y);y+=5;
 for(const section of job.sections){if(y>244){doc.addPage();pageHeader();y=34;}doc.setFont('VN','bold');doc.setFontSize(8.5);doc.text('Khối '+section.grade+' - '+section.group,12,y);y=runTable(classTable(section,job),y+2,true)+8;}
 doc.addPage();pageHeader();y=34;doc.setFont('VN','bold');doc.setFontSize(9);doc.text('2. Kết quả giáo viên',12,y);y+=6;
 for(const group of teacherGroups(job)){if(y>242){doc.addPage();pageHeader();y=34;}doc.setFontSize(8.5);doc.text(group.group+' - Tổng hợp trong các khối xuất báo cáo',12,y);y+=3;
 if(!group.teachers.length){doc.setFont('VN','normal');doc.text('Chưa có phân công giáo viên trong phạm vi này.',12,y+4);y+=12;}else y=runTable(teacherTable(group,job),y+1)+8;
 }
 });
 const total=doc.getNumberOfPages();for(let page=1;page<=total;page++){doc.setPage(page);const job=pages.get(page);doc.setFont('VN','normal');doc.setFontSize(6.5);doc.setTextColor(70);doc.text('HS có điểm theo đợt; không phải sĩ số chính thức. Ô thiếu để trống; BQ khối không nhân sĩ số.',12,282);doc.text(job?.period==='annual'?'Số HS: Giữa HK1/HK1/Giữa HK2/HK2. Hạng GV theo môn/nhóm trong phạm vi khối xuất.':'GK/HK: số HS từng đợt nếu khác nhau. Hạng GV theo môn/nhóm trong phạm vi khối xuất báo cáo.',12,286);doc.text(`Trang ${page}/${total}`,198,290,{align:'right'});}
 return doc;
}
