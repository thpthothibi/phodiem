'use strict';
let subjectCharts=[], classReportPage=0, reportList=[], pdfBusy=false;
function detailedStats(rows){
  const scores=rows.map(r=>r.score).sort((a,b)=>a-b), n=scores.length, freq=new Map();
  for(const v of scores)freq.set(v,(freq.get(v)||0)+1);
  const peak=n?Math.max(...freq.values()):0,modes=[...freq].filter(e=>e[1]===peak).map(e=>e[0]);
  return {...summary(rows), students:new Set(rows.map(r=>JSON.stringify([r.year,r.class,r.student]))).size,
    median:n?(scores[Math.floor((n-1)/2)]+scores[Math.floor(n/2)])/2:0,
    min:n?scores[0]:0,max:n?scores[n-1]:0,modes,peak,low:rows.filter(r=>r.score<=1).length,
    under5:rows.filter(r=>r.score<5).length,perfect:rows.filter(r=>r.score===10).length};
}
function scoreHistogram(rows,width){const count=Math.round(10/width), values=Array(count+1).fill(0);for(const r of rows)values[Math.min(count,Math.floor((r.score+1e-9)/width))]++;return {labels:values.map((_,i)=>i===count?'10':number(i*width)+'–<'+number((i+1)*width)),values};}
function scopeText(){return [$('year').value,picked('period').join(', ')||'Tất cả các kỳ',picked('grade').length?'Khối '+picked('grade').join(', '):'Tất cả khối',picked('subject').join(', ')||'Tất cả môn',picked('class').length?'Lớp '+picked('class').join(', '):'Tất cả lớp',!$('tnField').hidden?'Thi TN: '+($('thiTN').value||'Tất cả'):'',demo?'Dữ liệu minh họa':''].filter(Boolean).join(' · ');}
function statRows(s,threshold=settings.threshold){const pct=x=>number(x)+' ('+number(x/s.n*100)+'%)';return [
  ['Số lượt điểm',number(s.n)],['Số học sinh có điểm',number(s.students)],['Điểm trung bình',number(s.avg)],['Điểm trung vị',number(s.median)],
  ['Điểm xuất hiện nhiều nhất',s.modes.slice(0,8).map(number).join('; ')+(s.modes.length>8?' … ('+s.modes.length+' mức đồng hạng)':'')],
  ['Tần số của mỗi mức phổ biến',number(s.peak)],['Điểm thấp nhất / cao nhất',number(s.min)+' / '+number(s.max)],
  ['Điểm ≤ 1',pct(s.low)],['Điểm dưới 5',pct(s.under5)],['Điểm 10',pct(s.perfect)],['Điểm ≥ '+number(threshold),pct(s.passed)]];}
function histogramConfig(hist,kind='bar',pdf=false,metric=$('metric').value){const total=hist.values.reduce((a,b)=>a+b,0),percent=metric==='percent',values=hist.values.map(v=>percent?(total?v/total*100:0):v),unit=percent?'Tỷ lệ lượt điểm (%)':'Số lượt điểm';return {type:kind,data:{labels:hist.labels,datasets:[{label:unit,data:values,backgroundColor:kind==='pie'?hist.labels.map((_,i)=>colors[i%colors.length]):'#2563eb',borderColor:'#fff',borderWidth:1,borderRadius:kind==='bar'?3:0}]},options:{responsive:!pdf,maintainAspectRatio:false,animation:false,devicePixelRatio:pdf?1:undefined,plugins:{legend:{display:kind==='pie',position:'bottom',labels:{boxWidth:10,font:{size:pdf?13:12}}},tooltip:{callbacks:{label:ctx=>number(hist.values[ctx.dataIndex])+' lượt điểm ('+number(total?hist.values[ctx.dataIndex]/total*100:0)+'%)'}}},scales:kind==='pie'?{}:{x:{title:{display:true,text:'Điểm thi',color:'#1e3a8a'},ticks:{color:'#334155',font:{size:pdf?14:12},autoSkip:true,maxRotation:60},grid:{display:false}},y:{beginAtZero:true,max:percent?100:undefined,title:{display:true,text:unit,color:'#1e3a8a'},ticks:{precision:percent?1:0,color:'#334155',font:{size:pdf?14:12}},grid:{color:'#dbeafe'}}}}};}
function renderReports(){
  for(const c of subjectCharts)c.destroy();subjectCharts=[];
  const rows=filtered(),subjects=unique(rows.map(r=>r.subject)),width=Number($('binWidth').value);
  reportList=subjects.map(subject=>{const data=rows.filter(r=>r.subject===subject);return {subject,data,stats:detailedStats(data),hist:scoreHistogram(data,width)};});
  $('reportScope').textContent=scopeText();$('exportPdf').disabled=!rows.length;if($('schoolYear'))$('schoolYear').textContent=$('year').value.replace('-','–');if($('totalStats')){$('totalStats').innerHTML=rows.length?'<table><tbody>'+statRows(detailedStats(rows)).map(v=>'<tr><th scope="row">'+esc(v[0])+'</th><td>'+esc(v[1])+'</td></tr>').join('')+'</tbody></table>':'<p class="total-note">Chọn bộ lọc hoặc nhập dữ liệu để xem báo cáo tổng.</p>';}
  $('subjectReports').innerHTML=reportList.length?reportList.map((r,i)=>`<article class="card subject-report"><div class="cardtitle"><div><h2>${esc(r.subject)}</h2><p>${number(r.stats.n)} lượt điểm · ${number(r.stats.students)} học sinh · ${unique(r.data.map(x=>x.class)).length} lớp${demo?' · Minh họa':''}</p></div><span class="subjectbadge">Phổ điểm 0–10</span></div><div class="subject-content"><div><div class="histogram"><canvas id="hist-${i}" role="img" aria-label="Phổ điểm ${esc(r.subject)}"></canvas></div><details><summary>Xem tần số từng khoảng điểm</summary><div class="tablewrap"><table><thead><tr><th>Khoảng điểm</th><th>Số lượt</th><th>Tỷ lệ (%)</th></tr></thead><tbody>${r.hist.labels.map((label,j)=>`<tr><td>${esc(label)}</td><td>${r.hist.values[j]}</td><td>${number(r.hist.values[j]/r.stats.n*100)}</td></tr>`).join('')}</tbody></table></div></details></div><div class="subject-statistics"><table><caption>Thống kê ${esc(r.subject)}</caption><tbody>${statRows(r.stats).map(v=>`<tr><th scope="row">${esc(v[0])}</th><td>${esc(v[1])}</td></tr>`).join('')}</tbody></table></div></div><p class="reportfoot">Các tỷ lệ tính trên lượt điểm. Khi chọn nhiều kỳ, một học sinh có thể có nhiều lượt điểm. Các mức điểm đồng tần số cùng được tính là mức phổ biến.</p></article>`).join(''):'<div class="card no-report">Chưa có dữ liệu theo bộ lọc. Chọn khối hoặc nhập Excel để xem phổ điểm từng môn.</div>';
  for(let i=0;i<reportList.length;i++)subjectCharts.push(new Chart($('hist-'+i),histogramConfig(reportList[i].hist,chartType)));
  classReportPage=0;renderClassDetails();
}
function classRows(){return filtered().sort((a,b)=>a.class.localeCompare(b.class,'vi',{numeric:true})||a.student.localeCompare(b.student,'vi',{numeric:true})||a.subject.localeCompare(b.subject,'vi')||PERIODS.indexOf(a.period)-PERIODS.indexOf(b.period));}
function renderClassDetails(){const selected=picked('class');$('classDetails').hidden=!selected.length;const a=classRows();$('classDetailScope').textContent=selected.join(', ')+' · '+number(a.length)+' lượt điểm · '+(picked('subject').join(', ')||'Tất cả môn');classReportPage=Math.min(classReportPage,Math.max(0,Math.ceil(a.length/50)-1));$('classDetailBody').innerHTML=a.slice(classReportPage*50,classReportPage*50+50).map(r=>'<tr>'+[r.class,r.student,r.subject,r.period,number(r.score),tnValue(r)].map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="6">Chưa có điểm trong phạm vi đang chọn.</td></tr>';$('classPageInfo').textContent='Trang '+(classReportPage+1)+' / '+Math.max(1,Math.ceil(a.length/50));$('classPrev').disabled=classReportPage===0;$('classNext').disabled=(classReportPage+1)*50>=a.length;$('exportClass').disabled=!a.length;}
$('classPrev').onclick=()=>{classReportPage--;renderClassDetails();};$('classNext').onclick=()=>{classReportPage++;renderClassDetails();};$('exportClass').onclick=()=>exportBook([HEADERS,...classRows().map(r=>[r.year,r.period,r.grade,r.class,r.subject,r.student,r.score,r.thiTN||''])],(demo?'Minh_hoa_':'')+'Diem_lop.xlsx');$('binWidth').onchange=render;
let pdfFont=null;
function buildExportJobs(rows){
 const jobs=[];for(const grade of unique(rows.map(r=>Number(r.grade))).sort((a,b)=>a-b))for(const subject of unique(rows.filter(r=>Number(r.grade)===grade).map(r=>r.subject))){
  const data=rows.filter(r=>Number(r.grade)===grade&&r.subject===subject),eligible=grade===12&&!isCommonTNSubject(subject),chosen=data.filter(r=>r.thiTN==='Chọn'),notChosen=data.filter(r=>r.thiTN==='Không chọn'),unmarked=eligible?data.filter(r=>!['Chọn','Không chọn'].includes(r.thiTN)):[],split=eligible&&(chosen.length+notChosen.length)>0;
  jobs.push({grade,subject,data,split,panels:split?[{label:'CHỌN THI TN',data:chosen},{label:'KHÔNG CHỌN THI TN',data:notChosen}]:[{label:eligible?'TOÀN BỘ ĐIỂM - CHƯA PHÂN NHÓM TN':grade===12?'THỐNG KÊ CHUNG — KHÔNG TÁCH THI TN':'THỐNG KÊ CHUNG',data}],unmarked});
 }return jobs;
}

async function exportPDF(options=null){
 const custom=options&&Array.isArray(options.rows),dataSource=custom?options.rows:hasChosenReportScope()?baseFiltered():[];
 if(pdfBusy)throw Error('Đang tạo PDF khác, hãy thử lại.');if(!dataSource.length)return;
 if(!window.jspdf)return toast('Chưa tải được bộ tạo PDF. Hãy tải lại trang.');
 pdfBusy=true;$('exportPdf').disabled=true;$('exportPdf').textContent='Đang tạo PDF…';
 const allData=dataSource.map(r=>({...r})),jobs=buildExportJobs(allData),kind=chartType,metric=$('metric').value,threshold=settings.threshold,isDemo=custom?false:demo,title=custom?options.title:$('customTitle').value.trim()||'PHỔ ĐIỂM & BÁO CÁO TỔNG',width=Number($('binWidth').value),scopeParts=custom?options.scopeParts:[$('year').value,picked('period').join(', ')||'Tất cả kỳ',picked('class').length?'Lớp '+picked('class').join(', '):'Tất cả lớp'];
 try{
  if(!pdfFont&&window.HTB_PDF_FONT)pdfFont=window.HTB_PDF_FONT;
  if(!pdfFont){const res=await fetch('vendor/DejaVuSans.ttf');if(!res.ok)throw Error('Không tải được phông chữ tiếng Việt.');const bytes=new Uint8Array(await res.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));pdfFont=btoa(str);}
  const doc=new jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});doc.addFileToVFS('DejaVuSans.ttf',pdfFont);doc.addFont('DejaVuSans.ttf','VN','normal');doc.setFont('VN','normal');doc.setProperties({title,subject:scopeParts.join(' · '),creator:'HTB Phổ Điểm'});
  let headerFonts=window.HTB_HQGD_SERIF;try{const saved=JSON.parse(localStorage.getItem('htb.hqgd.pdf.fonts')||'null');if(saved?.normal&&saved?.bold)headerFonts=saved;}catch{}
  const headerFamily=headerFonts?'ReportHeader':'VN';if(headerFonts){doc.addFileToVFS('ReportHeader-Regular.ttf',headerFonts.normal);doc.addFileToVFS('ReportHeader-Bold.ttf',headerFonts.bold);doc.addFont('ReportHeader-Regular.ttf',headerFamily,'normal');doc.addFont('ReportHeader-Bold.ttf',headerFamily,'bold');}

  async function plot(rows,x,y,w,h){
   if(!rows.length){doc.setDrawColor(200,215,235);doc.rect(x,y,w,h);doc.setTextColor(90,110,140);doc.setFontSize(10);doc.text('Chưa có điểm trong nhóm này',x+w/2,y+h/2,{align:'center'});return;}
   const canvas=document.createElement('canvas');canvas.width=w<200?850:1500;canvas.height=Math.round(canvas.width*h/w);canvas.style.position='fixed';canvas.style.left='-10000px';document.body.appendChild(canvas);let temp;
   try{temp=new Chart(canvas,histogramConfig(scoreHistogram(rows,width),kind,true,metric));temp.update('none');await new Promise(resolve=>requestAnimationFrame(resolve));doc.addImage(canvas.toDataURL('image/png'),'PNG',x,y,w,h);}finally{if(temp)temp.destroy();canvas.remove();}
  }
  const tableBase={styles:{font:'VN',fontStyle:'normal',fontSize:8,cellPadding:1.2,textColor:[30,58,95],overflow:'linebreak'},headStyles:{fillColor:[28,83,170],textColor:[255,255,255],fontStyle:'normal'},alternateRowStyles:{fillColor:[238,245,255]},margin:{left:14,right:14,bottom:13}};
  for(let index=0;index<jobs.length;index++){
   const job=jobs[index];if(index)doc.addPage();
   doc.setTextColor(0,0,0);doc.setFont(headerFamily,headerFonts?'bold':'normal');doc.setFontSize(12);doc.text('TRƯỜNG THPT HỒ THỊ BI',14,12);
   const reportHeading=(title==='PHỔ ĐIỂM & BÁO CÁO TỔNG'?'KẾT QUẢ DẠY - HỌC MÔN ':title+' - MÔN ')+job.subject.toLocaleUpperCase('vi')+(isDemo?' - MINH HỌA':'');
   doc.setFontSize(14);const titleLines=doc.splitTextToSize(reportHeading,269);doc.text(titleLines,148.5,21,{align:'center'});
   const reportYears=unique(job.data.map(r=>r.year)).join(', '),reportPeriods=PERIODS.filter(p=>job.data.some(r=>r.period===p)).join(', '),periodY=21+titleLines.length*5.5;
   doc.setFontSize(10);const periodLines=doc.splitTextToSize((reportPeriods||'Tất cả kỳ')+' ('+reportYears+')',269);doc.text(periodLines,148.5,periodY,{align:'center'});
   doc.setFont(headerFamily,'normal');doc.setFontSize(8);const classScope=unique(job.data.map(r=>r.class)),scopeLabel='Khối '+job.grade+(classScope.length===1?' - Lớp '+classScope[0]:''),scopeY=periodY+periodLines.length*4.5;doc.text(scopeLabel,148.5,scopeY,{align:'center'});
   doc.setFont('VN','normal');doc.setTextColor(40,70,110);let y=scopeY+7;

   if(job.split){
    const full=detailedStats(job.data),meta='Tổng toàn môn: '+number(full.n)+' lượt điểm · ĐTB '+number(full.avg)+' · Chọn TN: '+number(job.panels[0].data.length)+' · Không chọn TN: '+number(job.panels[1].data.length)+' · Chưa khai báo: '+number(job.unmarked.length);
    doc.text(doc.splitTextToSize(meta,269),14,y);y+=7;
    for(let j=0;j<2;j++){const panel=job.panels[j],x=14+j*137,w=132;doc.setFontSize(11);doc.setTextColor(25,70,140);doc.text(panel.label,x,y);await plot(panel.data,x,y+4,w,57);const stat=panel.data.length?statRows(detailedStats(panel.data),threshold):[['Số lượt điểm','0'],['Điểm trung bình','—'],['Trạng thái','Chưa có dữ liệu']];doc.autoTable({...tableBase,startY:y+65,tableWidth:w,margin:{left:x,right:297-x-w,bottom:20},head:[['Thống kê nhóm','Số liệu']],body:stat,styles:{...tableBase.styles,fontSize:7.5,cellPadding:1.2},columnStyles:{0:{cellWidth:78},1:{cellWidth:54}}});}

   }else{
    doc.setFontSize(9);doc.text(job.panels[0].label,14,y);await plot(job.data,14,y+3,269,64);const stats=detailedStats(job.data),hist=scoreHistogram(job.data,width),tableY=y+73;doc.autoTable({...tableBase,startY:tableY,tableWidth:142,margin:{left:14,right:141,bottom:15},head:[['Báo cáo khối '+job.grade,'Số liệu']],body:[['Số lớp',String(unique(job.data.map(r=>r.class)).length)],...statRows(stats,threshold)],columnStyles:{0:{cellWidth:83},1:{cellWidth:59}}});
    const pairs=hist.labels.length>25?3:2,binRows=[];for(let i=0;i<hist.labels.length;i+=pairs){const line=[];for(let j=0;j<pairs;j++)line.push(hist.labels[i+j]??'',hist.values[i+j]??'');binRows.push(line);}doc.autoTable({...tableBase,startY:tableY,tableWidth:119,margin:{left:164,right:14,bottom:15},head:[Array.from({length:pairs},()=>['Điểm','Số lượt']).flat()],body:binRows,styles:{...tableBase.styles,fontSize:7.2,cellPadding:1}});
   }
   doc.setFont('VN','normal');doc.setFontSize(7);doc.setTextColor(65,92,128);doc.text('Trang '+(index+1)+' / '+jobs.length,283,203,{align:'right'});
   if(doc.getNumberOfPages()!==index+1)throw Error('Tiêu đề hoặc thống kê quá dài ở '+job.subject+' khối '+job.grade+'. Rút gọn tiêu đề hoặc chọn phạm vi hẹp hơn.');
  }
  if(custom)return doc.output('blob');doc.save((isDemo?'Minh_hoa_':'')+'Pho_diem_Theo_khoi_va_mon.pdf');toast('Đã xuất '+jobs.length+' trang, tách khối và môn; khối 12 tách Thi TN theo quy định.');
 }catch(e){if(custom)throw e;toast('Không tạo được PDF: '+e.message);}finally{pdfBusy=false;$('exportPdf').textContent='↓ PDF theo khối / môn';$('exportPdf').disabled=!filtered().length;}
}

$('exportPdf').onclick=exportPDF;
render();
