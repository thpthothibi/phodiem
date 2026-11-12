// Some exported XLSX files use Windows backslashes in ZIP entry names.
// Repackage entries in memory before reading. The uploaded file is never modified.
export async function readAssignmentWorkbook(buffer,X){
 const b=new Uint8Array(buffer),d=new DataView(b.buffer,b.byteOffset,b.byteLength);let end=-1;
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--)if(d.getUint32(i,true)===0x06054b50){end=i;break;}
 if(end<0)throw Error('File không phải XLSX hợp lệ. Hãy lưu lại thành .xlsx trong Excel.');
 const count=d.getUint16(end+10,true);let at=d.getUint32(end+16,true),total=0;const files=[];if(count>2000)throw Error('File Excel có quá nhiều thành phần.');
 for(let n=0;n<count;n++){
  if(at+46>b.length||d.getUint32(at,true)!==0x02014b50)throw Error('Cấu trúc ZIP Excel không hợp lệ.');
  const flag=d.getUint16(at+8,true),method=d.getUint16(at+10,true),crc=d.getUint32(at+16,true),nl=d.getUint16(at+28,true),extra=d.getUint16(at+30,true),comment=d.getUint16(at+32,true);
  let size=d.getUint32(at+20,true),raw=d.getUint32(at+24,true),offset=d.getUint32(at+42,true);
  for(let ep=at+46+nl;ep+4<=at+46+nl+extra;){const tag=d.getUint16(ep,true),len=d.getUint16(ep+2,true);if(tag===1){let zp=ep+4;const next=()=>{const v=Number(d.getBigUint64(zp,true));zp+=8;if(!Number.isSafeInteger(v))throw Error('Excel ZIP64 vượt giới hạn.');return v;};if(raw===0xffffffff)raw=next();if(size===0xffffffff)size=next();if(offset===0xffffffff)offset=next();}ep+=4+len;}
  total+=raw;if(total>50*1024*1024||flag&1)throw Error('Excel vượt giới hạn giải nén hoặc có mật khẩu.');
  const name=new TextDecoder().decode(b.slice(at+46,at+46+nl)).replace(/\\/g,'/');
  if(offset+30>b.length||d.getUint32(offset,true)!==0x04034b50)throw Error('Thiếu thành phần trong file Excel.');
  const start=offset+30+d.getUint16(offset+26,true)+d.getUint16(offset+28,true);if(start+size>b.length)throw Error('File Excel bị thiếu dữ liệu.');
  let data=b.slice(start,start+size);if(method===8){try{data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());}catch{throw Error('Không giải nén được Excel. Hãy mở Excel và Lưu thành .xlsx rồi nhập lại.');}}else if(method!==0)throw Error('Kiểu nén Excel chưa được hỗ trợ.');
  if(data.length!==raw)throw Error('Kích thước dữ liệu Excel không khớp.');
  files.push({name,data,crc});at+=46+nl+extra+comment;
 }
 // Stored ZIP avoids the legacy ZIP reader's incompatibility with this export format.
 const chunks=[],central=[];let position=0,cs=0;const make=n=>{const a=new Uint8Array(n);return [a,new DataView(a.buffer)];};
 for(const f of files){const name=new TextEncoder().encode(f.name),[local,v]=make(30+name.length);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,f.crc,true);v.setUint32(18,f.data.length,true);v.setUint32(22,f.data.length,true);v.setUint16(26,name.length,true);local.set(name,30);
 const [c,cv]=make(46+name.length);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,f.crc,true);cv.setUint32(20,f.data.length,true);cv.setUint32(24,f.data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,position,true);c.set(name,46);chunks.push(local,f.data);central.push(c);position+=local.length+f.data.length;cs+=c.length;}
 const [tail,tv]=make(22);tv.setUint32(0,0x06054b50,true);tv.setUint16(8,files.length,true);tv.setUint16(10,files.length,true);tv.setUint32(12,cs,true);tv.setUint32(16,position,true);
 const out=new Uint8Array(position+cs+22);let p=0;for(const c of [...chunks,...central,tail]){out.set(c,p);p+=c.length;}
 return X.read(out,{type:'array'});
}
export function parseAssignments(wb,X,{year,canonicalSubject,className,key}){
 const map=new Map(),warnings=[],add=(subject,klass,t1,t2,sheet)=>{klass=className(klass);if(!/^(10|11|12)[A-Z]{1,5}\d{1,3}$/.test(klass))return;subject=canonicalSubject(subject);if(!subject)return;const k=JSON.stringify([year,subject,klass]);if(!map.has(k))map.set(k,{year,subject,class:klass,candidates1:[],candidates2:[]});const a=map.get(k);for(const [values,t] of [[a.candidates1,t1],[a.candidates2,t2]]){const name=String(t??'').trim().normalize('NFC').replace(/\s+/g,' ');if(name&&!values.includes(name))values.push(name);}};
 for(const name of wb.SheetNames){const rows=X.utils.sheet_to_json(wb.Sheets[name],{header:1,range:0,defval:''});const hi=rows.findIndex(r=>r.some(c=>key(c)==='lop')&&r.some(c=>['giaovienhk1','giaovien','hotengiaovien'].includes(key(c))));
 if(hi>=0){const headers=rows[hi].map(key),index=k=>headers.indexOf(k),ci=index('lop'),si=index('mon'),yi=index('namhoc'),t1=index('giaovienhk1'),t2=index('giaovienhk2'),single=Math.max(index('giaovien'),index('hotengiaovien'));for(const r of rows.slice(hi+1)){if(yi>=0&&r[yi]&&String(r[yi]).trim()!==year)throw Error('Phân công ghi năm '+r[yi]+', khác năm đang chọn '+year);add(si>=0?r[si]:name,r[ci],t1>=0?r[t1]:r[single],t2>=0?r[t2]:single>=0?r[single]:'',name);}}
 else {let count=0;for(const r of rows){if(/^(10|11|12)[A-Z]{1,5}\d{1,3}$/.test(className(r[0]))){add(name,r[0],r[1],r[1],name);count++;}}if(!count)warnings.push(name+': không nhận diện dòng lớp.');}
 }
 const rows=[...map.values()].filter(a=>a.candidates1.length||a.candidates2.length);if(!rows.length)throw Error('Không nhận diện được phân công. Dùng sheet theo môn với cột A=Lớp, B=Giáo viên; hoặc bảng có tiêu đề Môn, Lớp, Giáo viên HK1, Giáo viên HK2.');
 return {rows,warnings};
}
