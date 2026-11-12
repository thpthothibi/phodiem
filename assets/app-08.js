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
function scopeText(){return [$('year').value,picked('period').join(', ')||'Tất cả các kỳ',picked('grade').length?'Khối '+picked('grade').join(', '):'Tất cả khối',picked('subject').join(', ')||'Tất cả môn',picked('class').length?'Lớp '+picked('class').join(', '):'Tất cả lớp',isGrade12Scope()?'Thi TN: '+($('thiTN').value||'Tất cả'):'',demo?'Dữ liệu minh họa':''].filter(Boolean).join(' · ');}
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
async function exportPDF(options=null){
 const custom=options&&Array.isArray(options.rows);
 if(pdfBusy)throw Error("Đang tạo PDF khác, hãy thử lại.");if(!(custom?options.rows:filtered()).length)return;
 if(!window.jspdf)return toast('Chưa tải được bộ tạo PDF. Hãy tải lại trang.');
 pdfBusy=true;$('exportPdf').disabled=true;$('exportPdf').textContent='Đang tạo PDF…';
 const allData=(custom?options.rows:filtered()).map(r=>({...r})),scope=custom?options.scopeParts.join(" · "):scopeText(),kind=chartType,metric=$('metric').value,threshold=settings.threshold,isDemo=custom?false:demo,title=custom?options.title:$('customTitle').value.trim()||'PHỔ ĐIỂM & BÁO CÁO TỔNG',width=Number($('binWidth').value);
 const jobs=unique(allData.map(r=>r.subject)).map(subject=>{const data=allData.filter(r=>r.subject===subject);return {subject,data,stats:detailedStats(data),hist:scoreHistogram(data,width)};});
 const concise=(id,all,noun)=>{const chosen=picked(id);return chosen.length>3?chosen.length+' '+noun+' đã chọn':chosen.length?(noun+' '+chosen.join(', ')):all;};
 const scopeParts=custom?options.scopeParts:[$('year').value,concise('period','Tất cả kỳ','kỳ'),concise('grade','Tất cả khối','khối'),concise('class','Tất cả lớp','lớp'),isGrade12Scope()?'Thi TN: '+($('thiTN').value||'Tất cả'):''].filter(Boolean);
 try{
  if(!pdfFont&&window.HTB_PDF_FONT)pdfFont=window.HTB_PDF_FONT;
if(!pdfFont){const res=await fetch('vendor/DejaVuSans.ttf');if(!res.ok)throw Error('Không tải được phông chữ tiếng Việt.');const bytes=new Uint8Array(await res.arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));pdfFont=btoa(str);}
  const doc=new jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});doc.addFileToVFS('DejaVuSans.ttf',pdfFont);doc.addFont('DejaVuSans.ttf','VN','normal');doc.setFont('VN','normal');doc.setProperties({title,subject:scope,creator:'HTB Phổ Điểm'});
  for(let i=0;i<jobs.length;i++){const {subject,data,stats,hist}=jobs[i];if(i)doc.addPage();doc.setFont('VN','normal');const pageTitle=title+' · '+subject,printedScope=[...scopeParts,'Môn: '+subject].join(' · ');
  doc.setFontSize(13);const titleLines=doc.splitTextToSize(pageTitle+(isDemo?' · DỮ LIỆU MINH HỌA':''),269),headerHeight=24+titleLines.length*5.5;doc.setFillColor(20,66,140);doc.rect(0,0,297,headerHeight,'F');doc.setTextColor(255,255,255);
  doc.setFontSize(18);doc.text('TRƯỜNG THPT HỒ THỊ BI',14,12);doc.setFontSize(13);doc.text(titleLines,14,21);
  doc.setTextColor(40,70,110);doc.setFontSize(8);const scopeLines=doc.splitTextToSize(printedScope,269);doc.text(scopeLines,14,headerHeight+6);const chartY=headerHeight+8+scopeLines.length*3.5;
  const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=400;const temp=new Chart(canvas,histogramConfig(hist,kind,true,metric));try{doc.addImage(canvas.toDataURL('image/png'),'PNG',14,chartY,269,72);}finally{temp.destroy();}
  const y=chartY+77,base={styles:{font:'VN',fontStyle:'normal',fontSize:8,cellPadding:1.2,textColor:[30,58,95],overflow:'linebreak'},headStyles:{fillColor:[28,83,170],textColor:[255,255,255],fontStyle:'normal'},alternateRowStyles:{fillColor:[238,245,255]},margin:{left:14,right:14,bottom:13}};
  const reportRows=[['Số lớp / Số môn',unique(data.map(r=>r.class)).length+' / '+unique(data.map(r=>r.subject)).length],...statRows(stats,threshold)];
  doc.autoTable({...base,startY:y,tableWidth:142,margin:{left:14,right:141,bottom:13},head:[['Báo cáo tổng','Số liệu']],body:reportRows,columnStyles:{0:{cellWidth:83},1:{cellWidth:59}}});
  const pairs=hist.labels.length>25?3:2,binRows=[];for(let i=0;i<hist.labels.length;i+=pairs){const row=[];for(let j=0;j<pairs;j++)row.push(hist.labels[i+j]??'',hist.values[i+j]??'');binRows.push(row);}
  doc.autoTable({...base,startY:y,tableWidth:119,margin:{left:164,right:14,bottom:13},head:[Array.from({length:pairs},()=>['Điểm thi','Số lượt']).flat()],body:binRows,styles:{...base.styles,fontSize:7.5,cellPadding:1},columnStyles:pairs===3?{0:{cellWidth:27},1:{cellWidth:12.66},2:{cellWidth:27},3:{cellWidth:12.66},4:{cellWidth:27},5:{cellWidth:12.68}}:{}});
  doc.setFont('VN','normal');doc.setFontSize(7.5);doc.setTextColor(65,92,128);doc.text('Tỷ lệ tính trên lượt điểm. Một học sinh có thể có nhiều lượt khi chọn nhiều môn hoặc kỳ.',14,203);doc.text('Mỗi môn 1 trang A4 · Trang '+(i+1)+' / '+jobs.length,283,203,{align:'right'});
  if(doc.getNumberOfPages()!==i+1)throw Error('Tên biểu đồ hoặc phạm vi quá dài để môn '+subject+' vừa một trang. Hãy rút gọn tiêu đề hoặc bộ lọc.');
  }
  if(custom)return doc.output('blob');
  doc.save((isDemo?'Minh_hoa_':'')+'Pho_diem_Bao_cao_theo_mon.pdf');toast('Đã tạo '+jobs.length+' trang PDF cho '+jobs.length+' môn, mỗi môn một trang.');
 }catch(e){if(custom)throw e;toast('Không tạo được PDF: '+e.message);}finally{pdfBusy=false;$('exportPdf').textContent='↓ PDF: mỗi môn 1 trang';$('exportPdf').disabled=!filtered().length;}
}
$('exportPdf').onclick=exportPDF;
render();
