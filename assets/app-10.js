'use strict';
let comparisonChart=null,comparisonRows=[];
function renderComparison(){
 const data=filtered(),subjects=unique(data.map(r=>r.subject)),periods=PERIODS.filter(p=>data.some(r=>r.period===p)),metric=$('compareMetric').value;
 if(comparisonChart)comparisonChart.destroy();comparisonRows=[];
 const datasets=periods.map((period,i)=>({label:period,backgroundColor:colors[i%colors.length],borderRadius:3,data:subjects.map(subject=>{const rows=data.filter(r=>r.subject===subject&&r.period===period);if(!rows.length)return null;const d=detailedStats(rows);comparisonRows.push([subject,period,d.n,d.avg,d.passed/d.n*100]);return metric==='avg'?d.avg:metric==='pass'?d.passed/d.n*100:d.n;})}));
 $('compareScope').textContent=scopeText()+' · '+periods.length+' kỳ có dữ liệu';$('compareExport').disabled=!data.length;
 comparisonChart=new Chart($('compareChart'),{type:'bar',data:{labels:subjects,datasets},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>c.dataset.label+': '+number(c.raw)}}},scales:{x:{ticks:{color:'#345677'},grid:{display:false}},y:{beginAtZero:true,max:metric==='avg'?10:metric==='pass'?100:undefined,ticks:{precision:metric==='count'?0:1},title:{display:true,text:metric==='avg'?'Điểm trung bình':metric==='pass'?'Tỷ lệ đạt ngưỡng (%)':'Số lượt điểm'}}}}});
 if(!$('comparisonPanel').open)comparisonChart.stop();
}
$('comparisonPanel').addEventListener('toggle',e=>{if(e.target.open)comparisonChart?.resize();});$('compareMetric').onchange=renderComparison;
$('compareExport').onclick=()=>exportBook([['So sánh các kỳ'],[scopeText()],['Môn','Kỳ','Số lượt điểm','Điểm trung bình','Đạt ngưỡng (%)'],...comparisonRows],(demo?'Minh_hoa_':'')+'So_sanh_cac_ky.xlsx','So_sanh');
renderComparison();
