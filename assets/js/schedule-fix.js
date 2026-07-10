// Compatibilidade: converte blocos antigos de PRF policial em PRF Administrativo.
(function(){
 const original=App.loadJSON.bind(App);
 const replacements=[
  ['Noções de Administração','Fundamentos de Administração: eficiência, eficácia e efetividade','admin-conceitos'],
  ['Arquivologia','Gestão documental, arquivos e protocolo','arquivologia'],
  ['Noções de Administração','Planejamento, organização, direção e controle (PODC)','admin-podc'],
  ['Arquivologia','Classificação, métodos de arquivamento e protocolo','arquivologia'],
  ['Noções de Administração','Estruturas organizacionais e departamentalização','admin-estrutura'],
  ['Arquivologia','Temporalidade, avaliação e destinação de documentos','arquivologia'],
  ['Noções de Administração','Gestão de pessoas, liderança e motivação','admin-pessoas'],
  ['Legislação PRF','Competências e organização institucional da PRF','leg-prf'],
  ['Noções de Administração','Gestão de processos e qualidade','admin-processos'],
  ['Arquivologia','Preservação, conservação e documentos digitais','arquivologia'],
  ['Noções de Administração','Administração de materiais e patrimônio','admin-materiais'],
  ['Legislação PRF','Decreto 1.655/1995 e atribuições institucionais','leg-prf']
 ];
 const banned=/Legislação de Trânsito|Direito Penal|Primeiros Socorros|Física\/Mecânica|Geografia|CTB|trânsito/i;
 function fix(data){
  if(!data||!Array.isArray(data.days))return data;
  let n=0;
  data={...data,descricao:'Plano pré-edital integrado para INSS e PRF Administrativo. Dias de descanso não contam como falta.'};
  data.days=data.days.map(day=>{
   const tasks=(day.tasks||[]).map(t=>{
    if(t.tipo==='prf'&&(banned.test(t.materia)||banned.test(t.assunto)||banned.test(day.titulo))){
     const [materia,assunto,tag]=replacements[n++%replacements.length];
     return{...t,materia,assunto,questoesTag:tag,aulaId:null,pdfId:null};
    }
    return t;
   });
   const changed=tasks.some((t,i)=>t.materia!==(day.tasks||[])[i]?.materia||t.assunto!==(day.tasks||[])[i]?.assunto);
   return changed?{...day,titulo:`PRF Administrativo — ${tasks[0].assunto}`,tasks}:day;
  });
  // Corrige referência inexistente de prova administrativa.
  data.days=data.days.map(day=>({...day,tasks:(day.tasks||[]).map(t=>t.pdfId==='prova-prf-2019'?{...t,pdfId:'prf-adm-2014-funcab-prova-p'}:t)}));
  return data;
 }
 App.loadJSON=async function(path){const d=await original(path);return path.includes('cronograma.json')?fix(d):d};
 App.cache={};
})();
