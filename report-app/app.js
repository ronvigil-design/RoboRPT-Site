const STORAGE = {
  reports: 'roborpt_reports_v1',
  properties: 'roborpt_properties_v1',
  questions: 'roborpt_questions_v1',
  hrChat: 'roborpt_hr_chat_v1',
  settings: 'roborpt_settings_v1'
};

const incidentTypes = [
  ['Noise / Disturbance', 'Loud music, parties, or disruptive behavior'],
  ['Suspicious Activity', 'Unusual behavior, persons, or vehicles'],
  ['Resident / Guest Conduct', 'Conduct complaints or property rule violations'],
  ['Trespassing / Unauthorized Access', 'Unapproved entry or restricted-area access'],
  ['Pool / Spa / Amenity', 'Amenity access, safety, noise, or rule concerns'],
  ['Parking / Vehicle', 'Parking violations, blocked access, or vehicle concerns'],
  ['Property Damage / Vandalism', 'Damage, graffiti, or vandalism'],
  ['Building / Maintenance / Safety Hazard', 'Leaks, hazards, or unsafe conditions'],
  ['Theft / Property Crime', 'Theft, burglary, or missing property'],
  ['Drugs / Alcohol / Smoking', 'Substance use, open containers, smoking, or vaping'],
  ['Medical / Welfare', 'Medical aid, welfare checks, or EMS response'],
  ['Fire / Alarm / Life Safety', 'Fire, alarms, evacuation, or life-safety concerns'],
  ['Assault / Violence', 'Threats, fights, or physical violence'],
  ['Animal / Pet', 'Loose animals, bites, or pet-related complaints'],
  ['Other', 'Any other security incident']
];

const defaultQuestions = [
  'What type of incident happened?',
  'Where exactly did it happen?',
  'What did you personally observe?',
  'Who was involved, if known?',
  'What action did you take?',
  'Did the person or group comply?',
  'What was the final result?',
  'Were police, fire, EMS, or maintenance notified?',
  'Were photos or video available?',
  'Is there anything else that should be documented?'
];

const hrWelcome = 'Hi, I’m HR Bot. Ask me a workplace question and I’ll help you identify practical next steps. I provide general guidance, so always follow your company policy.';

const interviewQuestions = [
  { key:'incidentType', q:'What type of incident happened?', replies: incidentTypes.map(x=>x[0]) },
  { key:'location', q:'Where exactly did it happen? Include the floor, room, amenity, or nearby landmark if you know it.' },
  { key:'observations', q:'What did you personally observe? Stick to what you saw, heard, or were told directly.' },
  { key:'people', q:'Who was involved, if known? You can include resident, guest, vehicle, room number, or a description.' },
  { key:'action', q:'What action did you take?' },
  { key:'compliance', q:'Did the person or group comply?', replies:['Yes, without a problem','Yes, after a second request','No','Partially','Not applicable'] },
  { key:'result', q:'What was the final result of the incident?' },
  { key:'notifications', q:'Were police, fire, EMS, maintenance, or management notified? If not, type “No.”' },
  { key:'evidence', q:'Were photos or video available?', replies:['Photos taken','Video available','Too dark for photos','No photos or video','Not applicable'] },
  { key:'extra', q:'Anything else that should be documented? If not, type “No.”' }
];

const state = {
  reports: load(STORAGE.reports, []),
  properties: load(STORAGE.properties, []),
  questions: load(STORAGE.questions, defaultQuestions),
  hrChat: load(STORAGE.hrChat, [{role:'bot',text:hrWelcome}]),
  settings: load(STORAGE.settings, { officerName:'', companyName:'', defaultProperty:'', reportTone:'objective', includeBullets:true }),
  interview: null
};

function load(key, fallback){
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
function save(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
function qs(s){ return document.querySelector(s); }
function qsa(s){ return [...document.querySelectorAll(s)]; }
function showToast(text){ const t=qs('#toast'); t.textContent=text; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1800); }
function formatDate(iso){ return new Date(iso).toLocaleString([], {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}); }
function escapeHtml(v=''){ return String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }

const viewMeta = {
  dashboard:['Dashboard','Create clear, objective security reports faster.'],
  reports:['Reports','Review and manage incident documentation.'],
  properties:['Properties','Manage the locations where you work.'],
  questions:['Questions','Customize the Robo Buddy interview.'],
  hrQuestions:['HR Bot','Ask a workplace question and get practical next steps.'],
  settings:['Settings','Set default officer and report preferences.']
};
function switchView(name){
  qsa('.view').forEach(v=>v.classList.remove('active'));
  qs(`#${name}View`).classList.add('active');
  qsa('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  qs('#pageTitle').textContent=viewMeta[name][0];
  qs('#pageSubtitle').textContent=viewMeta[name][1];
  qs('#topNav').classList.remove('open');
  qs('#menuBtn').setAttribute('aria-expanded','false');
  if(name==='reports') renderReports();
  if(name==='properties') renderProperties();
  if(name==='questions') renderQuestions();
  if(name==='hrQuestions') renderHrChat();
  if(name==='settings') renderSettings();
}

function renderDashboard(){
  qs('#reportCount').textContent=state.reports.length;
  qs('#propertyCount').textContent=state.properties.length;
  const weekAgo = Date.now()-7*24*60*60*1000;
  qs('#weekCount').textContent=state.reports.filter(r=>new Date(r.createdAt).getTime()>=weekAgo).length;
  qs('#completionRate').textContent='100%';
  const recent=qs('#recentReports');
  if(!state.reports.length){ recent.className='list-empty'; recent.innerHTML='No reports yet. Start with Robo Buddy.'; }
  else {
    recent.className='';
    recent.innerHTML=state.reports.slice().sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5).map(r=>`<div class="recent-item"><div><strong>${escapeHtml(r.incidentType)}</strong><span>${escapeHtml(r.location||'Location not entered')} • ${formatDate(r.createdAt)}</span></div><span class="recent-pill">Complete</span></div>`).join('');
  }
}

function renderReports(){
  const search=(qs('#reportSearch')?.value||'').toLowerCase();
  const filter=qs('#reportFilter')?.value||'all';
  const filtered=state.reports.filter(r => (filter==='all'||r.incidentType===filter) && `${r.incidentType} ${r.location} ${r.reportText}`.toLowerCase().includes(search));
  const wrap=qs('#reportsTableWrap');
  if(!filtered.length){ wrap.innerHTML='<div class="list-empty">No matching reports.</div>'; return; }
  wrap.innerHTML=filtered.map(r=>`<article class="report-card"><div class="report-card-head"><div><h3>${escapeHtml(r.incidentType)}</h3><p>${escapeHtml((r.observations||'No observation summary').slice(0,90))}</p></div><span class="recent-pill">Complete</span></div><div class="report-card-meta">${escapeHtml(r.location||'Location not entered')} · ${formatDate(r.createdAt)}${r.officerName ? ` · ${escapeHtml(r.officerName)}`:''}</div><div class="table-actions"><button class="mini-btn" data-view-report="${r.id}">View</button><button class="mini-btn" data-copy-report="${r.id}">Copy</button><button class="mini-btn danger-btn" data-delete-report="${r.id}">Delete</button></div></article>`).join('');
  qsa('[data-copy-report]').forEach(b=>b.onclick=()=>copyReport(b.dataset.copyReport));
  qsa('[data-view-report]').forEach(b=>b.onclick=()=>viewSavedReport(b.dataset.viewReport));
  qsa('[data-delete-report]').forEach(b=>b.onclick=()=>deleteReport(b.dataset.deleteReport));
}

function populateReportFilter(){
  const sel=qs('#reportFilter');
  const types=[...new Set(state.reports.map(r=>r.incidentType))];
  const current=sel.value;
  sel.innerHTML='<option value="all">All incidents</option>'+types.map(t=>`<option>${escapeHtml(t)}</option>`).join('');
  if([...sel.options].some(o=>o.value===current)) sel.value=current;
}

function renderProperties(){
  const grid=qs('#propertiesGrid');
  if(!state.properties.length){grid.innerHTML='<div class="list-empty">No properties added yet.</div>'; return;}
  grid.innerHTML=state.properties.map(p=>`<article class="property-card"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.address||'No address entered')}</p><div class="property-meta">${escapeHtml(p.notes||'No notes')}</div><div class="table-actions" style="margin-top:14px"><button class="mini-btn danger-btn" data-delete-property="${p.id}">Delete</button></div></article>`).join('');
  qsa('[data-delete-property]').forEach(b=>b.onclick=()=>{state.properties=state.properties.filter(p=>p.id!==b.dataset.deleteProperty);save(STORAGE.properties,state.properties);renderProperties();renderDashboard();renderSettings();showToast('Property deleted');});
}

function renderQuestions(){
  qs('#questionsList').innerHTML=state.questions.map((q,i)=>`<div class="question-row"><span>${i+1}</span><input data-question-index="${i}" value="${escapeHtml(q)}" /><button class="mini-btn danger-btn" data-remove-question="${i}">Remove</button></div>`).join('')+`<button class="secondary" id="addQuestionBtn">+ Add Question</button>`;
  qsa('[data-question-index]').forEach(inp=>inp.onchange=()=>{state.questions[Number(inp.dataset.questionIndex)]=inp.value;save(STORAGE.questions,state.questions);showToast('Question saved');});
  qsa('[data-remove-question]').forEach(b=>b.onclick=()=>{state.questions.splice(Number(b.dataset.removeQuestion),1);save(STORAGE.questions,state.questions);renderQuestions();});
  qs('#addQuestionBtn').onclick=()=>{state.questions.push('New security report question');save(STORAGE.questions,state.questions);renderQuestions();};
}

function renderHrChat(){
  const stream=qs('#hrChatStream');
  if(!Array.isArray(state.hrChat)||!state.hrChat.length) state.hrChat=[{role:'bot',text:hrWelcome}];
  stream.innerHTML=state.hrChat.map(m=>`<div class="hr-message ${m.role==='user'?'user':'bot'}">${escapeHtml(m.text)}</div>`).join('');
  requestAnimationFrame(()=>{stream.scrollTop=stream.scrollHeight;});
}

function getHrAnswer(question){
  const q=question.toLowerCase();
  if(/immediate danger|threat|violence|weapon/.test(q)) return 'If anyone may be in immediate danger, contact emergency services and follow the site emergency plan. Move people to safety when you can do so without increasing risk, notify management, and document only what you directly observed.';
  if(/harass|discriminat|retaliat|hostile/.test(q)) return 'Document the specific words, actions, dates, locations, and witnesses without adding conclusions. Preserve messages or other evidence, report the concern through the company’s HR or management channel, and avoid promising complete confidentiality. Retaliation concerns should be reported immediately.';
  if(/attendance|tardy|late|absence|call.?out/.test(q)) return 'Check the written attendance policy first. Document dates and prior coaching, speak with the employee privately, ask whether there is information HR needs to consider, and apply expectations consistently. Refer possible medical, disability, pregnancy, or protected-leave issues to HR instead of requesting detailed medical information.';
  if(/injur|accident|hurt|medical|workers.?comp|safety/.test(q)) return 'Address urgent medical and safety needs first. Notify the supervisor, secure the area if necessary, document the facts and witnesses, and complete the required incident or workers’ compensation process promptly. Do not diagnose the injury or discourage medical care.';
  if(/write.?up|disciplin|performance|coach/.test(q)) return 'A useful write-up identifies the policy or expectation, describes objective examples with dates, notes prior coaching, states the required improvement and timeline, and records the employee’s response. Review it with HR or the authorized manager before issuing discipline.';
  if(/terminat|fire|dismiss|separat/.test(q)) return 'Do not make the decision alone. Confirm the documented reason, policy, prior action, consistency, approvals, final-pay requirements, property return, and access removal with HR or authorized leadership. Employment rules vary by location, so HR or counsel should review the plan.';
  if(/leave|fmla|sick|pregnan|disab|accommodat|religio/.test(q)) return 'Refer the request or related concern to HR promptly. Keep medical and personal information confidential, avoid deciding eligibility yourself, and focus on the employee’s work limitations or requested change. HR can guide the required leave or accommodation process.';
  if(/pay|wage|overtime|break|payroll|timesheet/.test(q)) return 'Record the employee’s concern and the hours or pay periods involved, preserve timekeeping records, and send it to payroll or HR promptly. Do not ask an employee to work off the clock or guess at wage rules, which vary by jurisdiction.';
  if(/conflict|bully|argument|complaint|report/.test(q)) return 'Listen without taking sides, capture the person’s own words and specific examples, identify any immediate safety concern, and notify the proper supervisor or HR contact. Interview people separately when assigned to gather facts, and share information only with those who need it.';
  if(/privacy|confidential|record|personnel/.test(q)) return 'Limit HR information to people with a legitimate need to know. Store notes and records securely, avoid discussing the matter in public or group messages, and never promise absolute confidentiality. Follow the company’s retention and access rules.';
  return 'Start by documenting the facts: who was involved, what happened, when and where it occurred, witnesses, evidence, actions already taken, and any immediate safety concern. Then check the applicable company policy and route the issue to the authorized supervisor or HR contact. For legal, medical, pay, leave, discrimination, or termination questions, get qualified HR or legal review before acting.';
}

function askHr(question){
  const clean=String(question||'').trim();
  if(!clean)return;
  state.hrChat.push({role:'user',text:clean},{role:'bot',text:getHrAnswer(clean)});
  save(STORAGE.hrChat,state.hrChat);
  qs('#hrChatInput').value='';
  renderHrChat();
}

function renderSettings(){
  qs('#officerName').value=state.settings.officerName||'';
  qs('#companyName').value=state.settings.companyName||'';
  qs('#reportTone').value=state.settings.reportTone||'objective';
  qs('#includeBullets').checked=state.settings.includeBullets!==false;
  const sel=qs('#defaultProperty');
  sel.innerHTML='<option value="">None selected</option>'+state.properties.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  sel.value=state.settings.defaultProperty||'';
}

function openModal(id){ const m=qs('#'+id); m.classList.add('open');m.setAttribute('aria-hidden','false'); }
function closeModal(id){ const m=qs('#'+id); m.classList.remove('open');m.setAttribute('aria-hidden','true'); }

function startInterview(prefillType=''){
  state.interview={step:0,answers:{},createdAt:new Date().toISOString()};
  qs('#reportModal').classList.remove('preview-mode');
  qs('#chatStream').innerHTML='';
  qs('#reportPreview').textContent="Answer Robo Buddy's questions to build your report.";
  qs('#reportStatus').textContent='Collecting details';
  qs('#saveReport').disabled=true;
  openModal('reportModal');
  addBot('Tell me what happened and I’ll turn it into a professional security report.');
  if(prefillType){
    state.interview.answers.incidentType=prefillType;
    state.interview.step=1;
    addUser(prefillType);
  }
  askCurrent();
}

function askCurrent(){
  const i=state.interview.step;
  if(i>=interviewQuestions.length){ finishInterview(); return; }
  const q=interviewQuestions[i];
  setTimeout(()=>addBot(q.q),120);
  renderReplies(q.replies||[]);
}
function addBot(text){ const d=document.createElement('div');d.className='message bot';d.textContent=text;qs('#chatStream').appendChild(d);qs('#chatStream').scrollTop=qs('#chatStream').scrollHeight; }
function addUser(text){ const d=document.createElement('div');d.className='message user';d.textContent=text;qs('#chatStream').appendChild(d);qs('#chatStream').scrollTop=qs('#chatStream').scrollHeight; }
function renderReplies(items){ qs('#quickReplies').innerHTML=items.map(v=>`<button type="button">${escapeHtml(v)}</button>`).join(''); qsa('#quickReplies button').forEach(b=>b.onclick=()=>submitInterviewAnswer(b.textContent)); }
function submitInterviewAnswer(text){
  const clean=text.trim(); if(!clean||!state.interview)return;
  const q=interviewQuestions[state.interview.step];
  state.interview.answers[q.key]=clean;
  addUser(clean);
  state.interview.step++;
  qs('#chatInput').value='';
  renderReplies([]);
  updatePreview();
  askCurrent();
}

function cleanNo(value){ return !value || /^no\.?$/i.test(value.trim()) ? '' : value.trim(); }
function generateReportText(a){
  const officer=state.settings.officerName||'';
  const company=state.settings.companyName||'';
  const property=state.properties.find(p=>p.id===state.settings.defaultProperty);
  const header=[];
  if(officer) header.push(`Officer: ${officer}`);
  if(company) header.push(`Company: ${company}`);
  if(property) header.push(`Property: ${property.name}`);
  header.push(`Incident Type: ${a.incidentType||'Security Incident'}`);
  header.push(`Location: ${a.location||'Not specified'}`);

  let summary=`While on duty, I addressed a ${String(a.incidentType||'security incident').toLowerCase()} at ${a.location||'the property'}. `;
  if(a.observations) summary+=a.observations.trim().replace(/\s+/g,' ').replace(/(^.|[.!?]\s+.?)/g,s=>s.toUpperCase());
  if(a.people && !/^no\.?$/i.test(a.people)) summary+=` Individuals involved: ${a.people.trim()}.`;

  const action=a.action||'No additional action documented.';
  const compliance=cleanNo(a.compliance);
  const result=a.result||'Incident concluded without further information.';
  const notifications=cleanNo(a.notifications);
  const evidence=cleanNo(a.evidence);
  const extra=cleanNo(a.extra);

  if(state.settings.includeBullets!==false){
    return `${header.join('\n')}\n\nSUMMARY OF SITUATION\n${summary}\n\nACTION TAKEN\n• ${action}${compliance ? `\n• Compliance: ${compliance}`:''}${notifications ? `\n• Notifications: ${notifications}`:''}${evidence ? `\n• Evidence: ${evidence}`:''}\n\nRESULTS\n• ${result}${extra ? `\n• Additional information: ${extra}`:''}`;
  }
  return `${header.join('\n')}\n\n${summary}\n\nAction taken: ${action}${compliance ? ` Compliance: ${compliance}.`:''}${notifications ? ` Notifications: ${notifications}.`:''} Final result: ${result}${evidence ? ` Evidence: ${evidence}.`:''}${extra ? ` Additional information: ${extra}.`:''}`;
}

function updatePreview(){
  const text=generateReportText(state.interview.answers);
  qs('#reportPreview').textContent=text;
}
function finishInterview(){
  updatePreview();
  qs('#reportStatus').textContent='Ready to save';
  qs('#saveReport').disabled=false;
  addBot('I have enough information to build the report. Review the preview, then save it.');
  qs('#reportModal').classList.add('preview-mode');
}

function saveCurrentReport(){
  if(!state.interview)return;
  const a=state.interview.answers;
  const report={
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    createdAt:state.interview.createdAt,
    incidentType:a.incidentType||'Security Incident',
    location:a.location||'', observations:a.observations||'', people:a.people||'', action:a.action||'', compliance:a.compliance||'', result:a.result||'', notifications:a.notifications||'', evidence:a.evidence||'', extra:a.extra||'',
    officerName:state.settings.officerName||'',
    reportText:generateReportText(a)
  };
  state.reports.unshift(report);save(STORAGE.reports,state.reports);populateReportFilter();renderDashboard();renderReports();closeModal('reportModal');showToast('Report saved');
}
async function copyText(text){ try{await navigator.clipboard.writeText(text);showToast('Copied to clipboard');}catch{showToast('Copy failed — select the text manually');} }
function copyReport(id){ const r=state.reports.find(x=>x.id===id); if(r)copyText(r.reportText); }
function deleteReport(id){ state.reports=state.reports.filter(r=>r.id!==id);save(STORAGE.reports,state.reports);populateReportFilter();renderReports();renderDashboard();showToast('Report deleted'); }
function viewSavedReport(id){
  const r=state.reports.find(x=>x.id===id); if(!r)return;
  state.interview={step:interviewQuestions.length,answers:r,createdAt:r.createdAt};
  qs('#chatStream').innerHTML='';
  qs('#quickReplies').innerHTML='';
  qs('#reportPreview').textContent=r.reportText;
  qs('#reportStatus').textContent='Saved report';
  qs('#saveReport').disabled=true;
  addBot('This is a saved report. You can copy it from the preview.');
  qs('#reportModal').classList.add('preview-mode');
  openModal('reportModal');
}

qsa('.nav-item').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
qs('#menuBtn').onclick=()=>{const open=qs('#topNav').classList.toggle('open');qs('#menuBtn').setAttribute('aria-expanded',String(open));};
qs('#startReport').onclick=()=>startInterview();
qs('#newReportTop').onclick=()=>startInterview();
qs('#newReportReports').onclick=()=>startInterview();
qs('#viewReportsBtn').onclick=()=>switchView('reports');
qs('#seeAllReports').onclick=()=>switchView('reports');
qsa('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
qsa('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));
qs('#chatForm').addEventListener('submit',e=>{e.preventDefault();submitInterviewAnswer(qs('#chatInput').value);});
qs('#saveReport').onclick=saveCurrentReport;
qs('#copyPreview').onclick=()=>copyText(qs('#reportPreview').textContent);
qs('#reportSearch').addEventListener('input',renderReports);
qs('#reportFilter').addEventListener('change',renderReports);
qs('#addPropertyBtn').onclick=()=>openModal('propertyModal');
qs('#propertyForm').addEventListener('submit',e=>{e.preventDefault();const p={id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:qs('#propertyName').value.trim(),address:qs('#propertyAddress').value.trim(),notes:qs('#propertyNotes').value.trim()};state.properties.push(p);save(STORAGE.properties,state.properties);e.target.reset();closeModal('propertyModal');renderProperties();renderDashboard();renderSettings();showToast('Property saved');});
qs('#resetQuestionsBtn').onclick=()=>{state.questions=[...defaultQuestions];save(STORAGE.questions,state.questions);renderQuestions();showToast('Default questions restored');};
qs('#hrChatForm').addEventListener('submit',e=>{e.preventDefault();askHr(qs('#hrChatInput').value);});
qsa('[data-hr-prompt]').forEach(b=>b.onclick=()=>askHr(b.dataset.hrPrompt));
qs('#clearHrChatBtn').onclick=()=>{state.hrChat=[{role:'bot',text:hrWelcome}];save(STORAGE.hrChat,state.hrChat);renderHrChat();showToast('HR chat cleared');};
qs('#settingsForm').addEventListener('submit',e=>{e.preventDefault();state.settings={officerName:qs('#officerName').value.trim(),companyName:qs('#companyName').value.trim(),defaultProperty:qs('#defaultProperty').value,reportTone:qs('#reportTone').value,includeBullets:qs('#includeBullets').checked};save(STORAGE.settings,state.settings);showToast('Settings saved');});

populateReportFilter();renderDashboard();renderProperties();renderQuestions();renderHrChat();renderSettings();
