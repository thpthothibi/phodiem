import {calculate,annual,className,norm} from './engine.mjs';
export const PERIODS=[{id:'gk1',term:1,key:'mid',label:'Giữa HK1'},{id:'hk1',term:1,key:'final',label:'HK1'},{id:'gk2',term:2,key:'mid',label:'Giữa HK2'},{id:'hk2',term:2,key:'final',label:'HK2'}];
export function fourPeriods(first=[],second=[]){
 const a=first.length?calculate(first):null,b=second.length?calculate(second):null,map=new Map();
 for(let [term,r] of [[1,a],[2,b]])for(let x of r?.rows||[]){let k=x.subject+'|'+x.class;if(!map.has(k))map.set(k,{subject:x.subject,class:x.class,teacher1:'',teacher2:'',gk1:null,hk1:null,gk2:null,hk2:null,dgk1:null,dhk1:null,dgk2:null,dhk2:null,effect1:null,effect2:null,total:null});let row=map.get(k);Object.assign(row,{['teacher'+term]:x.teacher,['gk'+term]:x.mid,['hk'+term]:x.final,['dgk'+term]:x.deltaMid,['dhk'+term]:x.deltaFinal,['effect'+term]:x.effect});}
 for(let r of map.values())r.total=r.effect1===null||r.effect2===null?null:r.effect1+r.effect2;
 const teachers=annual(a,b).map(t=>({...t,term1:t.hk1,term2:t.hk2}));
 // Each period's teacher indicator is the SUM of class deviations, within subject.
 for(let t of teachers)for(let p of PERIODS){let list=(p.term===1?a:b)?.rows.filter(r=>r.subject===t.subject&&r.teacher===t.teacher)||[];let key=p.key==='mid'?'deltaMid':'deltaFinal';t[p.id]=list.length&&list.every(r=>r[key]!==null)?list.reduce((s,r)=>s+r[key],0):null;}
 return {rows:[...map.values()],teachers,first:a,second:b};
}
export function mergeRows(current,incoming,overwrite=false){
 const map=new Map(current.map(r=>[r.subject+'|'+className(r.class),{...r,class:className(r.class)}])),conflicts=[];
 for(let r0 of incoming){let r={...r0,class:className(r0.class),teacher:norm(r0.teacher)},k=r.subject+'|'+r.class,old=map.get(k);if(!old){map.set(k,r);continue;}
 for(let key of ['teacher','mid','final'])if(r[key]!==null&&r[key]!==undefined&&r[key]!==''&&old[key]!==null&&old[key]!==undefined&&old[key]!==''&&r[key]!==old[key]&&!overwrite)conflicts.push(k+' / '+key);
 map.set(k,{...old,teacher:overwrite?r.teacher:old.teacher||r.teacher,mid:r.mid==null?old.mid:r.mid,final:r.final==null?old.final:r.final});}
 if(conflicts.length)throw Error('Dữ liệu khác ô đã nhập: '+conflicts.slice(0,8).join(', ')+'. Chỉ chọn cho phép thay nếu đã kiểm tra nguồn.');return [...map.values()];
}
