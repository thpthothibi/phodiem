import {SUBJECTS,norm,className,number,schoolClasses} from './engine.mjs';
const key=s=>norm(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={toan:'Toán',ly:'Lý',vatly:'Lý',vatli:'Lý',van:'Văn',nguvan:'Văn',su:'Sử',lichsu:'Sử',hoa:'Hóa',hoahoc:'Hóa',dia:'Địa',dialy:'Địa',diali:'Địa',tienganh:'Tiếng anh',anh:'Tiếng anh',sinh:'Sinh',sinhhoc:'Sinh',ktpl:'KTPL',gdktpl:'KTPL',giaoduckinhtevaphapluat:'KTPL',tinhoc:'Tin học',tin:'Tin học',congnghe:'Công nghệ',theduc:'Thể dục',gdtc:'Thể dục',gdqp:'GDQP',gdqpan:'GDQP'};
const subject=s=>aliases[key(s)]||SUBJECTS.find(x=>key(x)===key(s))||'';
function score(value,context){let v=number(value);if(value!==null&&value!==undefined&&value!==''&&(v===null||v<0||v>10))throw Error(context+': điểm phải từ 0 đến 10 hoặc để trống');return v;}
export function readWorkbook(wb,XLSX,{term=1,year='2026-2027',templateOnly=false,allowYearMismatch=false}={}){
 const rows={1:[],2:[]},templates=[],warnings=[],years=new Set();
 for(let name of wb.SheetNames){let ws=wb.Sheets[name],table=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  for(let r of table.slice(0,7))for(let v of r){let m=String(v??'').match(/(20\d{2})\s*[-–]\s*(20\d{2})/);if(m)years.add(m[1]+'-'+m[2]);}
  let hi=table.findIndex(r=>r.some(c=>key(c)==='lop')&&r.some(c=>key(c)==='giuahk1'));
  if(hi>=0){let header=table[hi],find=k=>header.findIndex(c=>key(c)===k),ci=find('lop'),ti=find('giaovien'),si=find('mon'),pi=['giuahk1','hk1','giuahk2','hk2'].map(find);if(ti<0||pi.some(i=>i<0))throw Error('Thiếu cột trong mẫu bốn đợt: '+name);
   for(let i=hi+1;i<table.length;i++){let r=table[i],cl=className(r[ci]);if(!/^(10|11|12)[A-Z]{1,5}\d{1,3}$/.test(cl))continue;let sub=subject(r[si]||name),teacher=norm(r[ti]),v=pi.map((j,n)=>score(r[j],name+' dòng '+(i+1)+' '+['Giữa HK1','HK1','Giữa HK2','HK2'][n]));if(!teacher&&v.every(x=>x===null))continue;if(!sub)throw Error('Không nhận diện môn ở '+name+' dòng '+(i+1));
    for(let t of [1,2])if(v[(t-1)*2]!==null||v[(t-1)*2+1]!==null)rows[t].push({subject:sub,class:cl,teacher,mid:v[(t-1)*2],final:v[(t-1)*2+1]});
   }templates.push({subject:subject(name)||name,format:'four',classes:table.length-hi-1});continue;
  }
  let sub=subject(name);if(!sub)continue;let count=0;
  for(let i=0;i<table.length;i++){let r=table[i];if(/2\s*\.\s*Kết quả giáo viên/i.test(String(r[0])))break;let cl=className(r[0]);if(!/^(10|11|12)[A-Z]{1,5}\d{1,3}$/.test(cl))continue;count++;
   if(!templateOnly){let m=score(r[3],name+'!D'+(i+1)),f=score(r[6],name+'!G'+(i+1));if(m!==null||f!==null)rows[term].push({subject:sub,class:cl,teacher:norm(r[1]),mid:m,final:f});}
  }if(count)templates.push({subject:sub,format:'legacy',classes:count});
 }
 if(!templates.length)throw Error('Không nhận diện được Excel HQGD. Dùng mẫu cũ D/G hoặc mẫu bốn đợt của ứng dụng.');
 if(!templateOnly&&years.size&&[...years].some(y=>y!==year)&&!allowYearMismatch)throw Error('Excel ghi năm '+[...years].join(', ')+', khác năm đang chọn '+year+'. Chọn chỉ đọc cấu trúc cho mẫu cũ; không tự dùng điểm cũ làm điểm năm nay.');
 if(templateOnly){rows[1]=[];rows[2]=[];warnings.push('Chỉ đọc cấu trúc. Không nhập điểm và phân công giáo viên của năm cũ.');}
 return {rows,templates,years:[...years],warnings};
}
export function makeTemplate(XLSX,year){let wb=XLSX.utils.book_new(),classes=schoolClasses(year);if(!classes.length)throw Error('Chưa có danh mục lớp cho năm '+year);for(let sub of SUBJECTS){let data=[['THPT HỒ THỊ BI – MẪU HQGD BỐN ĐỢT'],['Năm học',year],['Điền GV và điểm thật. Lớp không học môn này: để trống toàn bộ GV/điểm. Không dùng 0 thay ô trống.'],['Môn','Lớp','Giáo viên','Giữa HK1','HK1','Giữa HK2','HK2'],...classes.map(c=>[sub,c,'',null,null,null,null])],ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=[{wch:18},{wch:12},{wch:32},...Array(4).fill({wch:16})];XLSX.utils.book_append_sheet(wb,ws,sub);}return wb;}
export function exportResults(XLSX,report,year){let wb=XLSX.utils.book_new();function sheet(name,headers,data){let ws=XLSX.utils.aoa_to_sheet([['THPT HỒ THỊ BI – HIỆU QUẢ GIẢNG DẠY'],['Năm học',year],['Chưa đủ điểm: ô kết quả để trống. Phạm vi tính là các lớp đã nhập.'],[],headers,...data]);ws['!cols']=headers.map((_,i)=>({wch:i<4?24:17}));XLSX.utils.book_append_sheet(wb,ws,name);}
 sheet('BON_DOT',['Môn','Lớp','GV HK1','GV HK2','Giữa HK1','HK1','Giữa HK2','HK2','ĐL GHK1','ĐL HK1','ĐL GHK2','ĐL HK2','HQ HK1','HQ HK2','HQ cả năm'],report.rows.map(r=>[r.subject,r.class,r.teacher1,r.teacher2,r.gk1,r.hk1,r.gk2,r.hk2,r.dgk1,r.dhk1,r.dgk2,r.dhk2,r.effect1,r.effect2,r.total]));
 sheet('GIAO_VIEN',['Môn','Giáo viên','HQ Giữa HK1','HQ HK1 riêng','HQ Giữa HK2','HQ HK2 riêng','HQ học kỳ 1','HQ học kỳ 2','HQ cả năm','HSĐT HK1-HK2'],report.teachers.map(r=>[r.subject,r.teacher,r.gk1,r.hk1,r.gk2,r.hk2,r.hk1Term??r.term1,r.hk2Term??r.term2,r.total,r.hsdt]));
 for(let [t,r] of [[1,report.first],[2,report.second]])if(r){sheet('HK'+t,['Môn','Lớp','Giáo viên','BQ Giữa HK'+t,'ĐL GK','Hạng GK','BQ HK'+t,'ĐL HK','Hạng HK','HQ học kỳ','Hạng'],r.rows.map(x=>[x.subject,x.class,x.teacher,x.mid,x.deltaMid,x.rankMid,x.final,x.deltaFinal,x.rankFinal,x.effect,x.rank]));sheet('BQ_KHOI_HK'+t,['Môn','Khối','Số lớp','BQ giữa kỳ','BQ cuối kỳ','Đủ điểm'],r.baselines.map(x=>[x.subject,x.grade,x.classes,x.mid,x.final,x.complete?'Có':'Chưa']));}
 return wb;}
function resultSheet(XLSX,wb,name,title,year,term,headers,rows){
 const data=[[title],['Năm học',year,'Học kỳ',term],['Theo bộ lọc hiển thị. BQ/HQ và hạng giữ theo toàn bộ phạm vi dữ liệu đã nhập; chưa đủ dữ liệu để trống.'],[],headers,...rows];
 const ws=XLSX.utils.aoa_to_sheet(data);ws['!cols']=headers.map(h=>({wch:/Giáo viên|Các lớp/.test(h)?34:/Môn|Trạng thái/.test(h)?20:17}));
 ws['!autofilter']={ref:XLSX.utils.encode_range({r:4,c:0},{r:Math.max(4,data.length-1),c:headers.length-1})};
 XLSX.utils.book_append_sheet(wb,ws,name);
}
export function exportClassWorkbook(XLSX,selected,baselines,year,term){
 const wb=XLSX.utils.book_new();resultSheet(XLSX,wb,'KET_QUA_LOP','THPT HỒ THỊ BI – KẾT QUẢ LỚP',year,term,
 ['STT','Môn','Lớp','Giáo viên','BQ giữa kỳ','BQ khối giữa kỳ','ĐL giữa kỳ','Hạng giữa kỳ','BQ cuối kỳ','BQ khối cuối kỳ','ĐL cuối kỳ','Hạng cuối kỳ','HQ học kỳ','Hạng HQ','Trạng thái'],
 selected.map((r,i)=>[i+1,r.subject,r.class,r.teacher,r.mid,r.baseMid,r.deltaMid,r.rankMid,r.final,r.baseFinal,r.deltaFinal,r.rankFinal,r.effect,r.rank,r.complete?'Đủ điểm trong phạm vi nhập':'Nháp']));
 const keys=new Set(selected.map(r=>r.subject+'|'+r.class.slice(0,2)));resultSheet(XLSX,wb,'BQ_KHOI','BÌNH QUÂN KHỐI TỪ TOÀN BỘ DỮ LIỆU ĐÃ NHẬP',year,term,['Môn','Khối','Số lớp','BQ giữa kỳ','BQ cuối kỳ','Trạng thái'],baselines.filter(r=>keys.has(r.subject+'|'+r.grade)).map(r=>[r.subject,r.grade,r.classes,r.mid,r.final,r.complete?'Đủ điểm':'Nháp']));return wb;
}
export function exportTeacherWorkbook(XLSX,selected,classes,year,term){
 const wb=XLSX.utils.book_new();resultSheet(XLSX,wb,'KET_QUA_GV','THPT HỒ THỊ BI – KẾT QUẢ GIÁO VIÊN',year,term,['STT','Môn','Giáo viên','Các lớp dạy','Số lớp','HQ học kỳ','Hạng trong môn','Trạng thái'],selected.map((r,i)=>[i+1,r.subject,r.teacher,r.classes.join(', '),r.classes.length,r.effect,r.rank,r.complete?'Đủ điểm trong phạm vi nhập':'Nháp']));
 const keys=new Set(selected.map(r=>r.subject+'|'+r.teacher));resultSheet(XLSX,wb,'CHI_TIET_LOP','CHI TIẾT CÁC LỚP CỦA GIÁO VIÊN ĐÃ CHỌN',year,term,['Môn','Lớp','Giáo viên','BQ giữa kỳ','ĐL giữa kỳ','BQ cuối kỳ','ĐL cuối kỳ','HQ lớp'],classes.filter(r=>keys.has(r.subject+'|'+r.teacher)).map(r=>[r.subject,r.class,r.teacher,r.mid,r.deltaMid,r.final,r.deltaFinal,r.effect]));return wb;
}
