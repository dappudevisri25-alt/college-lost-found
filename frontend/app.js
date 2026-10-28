const API = '/api';
let session = null, authMode = 'signin', listings = [];
const $ = (s) => document.querySelector(s);
const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function request(path, options={}) {
  const headers = {'Content-Type':'application/json', ...(options.headers||{})};
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const res = await fetch(API+path, {...options, headers});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function setAuthUI() {
  $('#authButton').textContent = session ? 'Account' : 'Sign in';
  $('#reportMessage').textContent = session ? `Signed in as ${session.user.email}` : 'Sign in to submit a report.';
}
function renderItems() {
  const search = $('#searchInput').value.toLowerCase(), type = $('#typeFilter').value, cat = $('#categoryFilter').value;
  const filtered = listings.filter(x => (!type||x.type===type)&&(!cat||x.category===cat)&&[x.title,x.description,x.location,x.category].join(' ').toLowerCase().includes(search));
  $('#totalCount').textContent = listings.length;
  $('#itemsGrid').innerHTML = filtered.length ? filtered.map(x=>`<article class="item-card"><div class="card-top"><span class="pill ${x.type==='found'?'found':''}">${escapeHtml(x.type)}</span><span class="muted">${escapeHtml(x.category)}</span></div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.description||'No additional description provided.')}</p><div class="meta">📍 ${escapeHtml(x.location)} · ${escapeHtml(x.item_date||'Date not specified')}</div>${x.contact?`<div class="contact">Contact: ${escapeHtml(x.contact)}</div>`:''}</article>`).join('') : '<p class="muted">No listings match those filters.</p>';
}
async function loadListings() {
  $('#itemsGrid').innerHTML='<p class="muted">Loading listings…</p>';
  try { const data=await request('/items'); listings=data.items||[]; renderItems(); }
  catch(e){ $('#itemsGrid').innerHTML=`<p class="muted">${escapeHtml(e.message)}. Check that the server and Supabase are configured.</p>`; }
}
function openAuth() {
  $('#authMessage').textContent='';
  $('#nameLabel').hidden=authMode!=='signup';
  $('#authTitle').textContent=authMode==='signup'?'Create account':'Sign in';
  $('#authSubmit').textContent=authMode==='signup'?'Create account':'Sign in';
  $('#showSignup').classList.toggle('selected',authMode==='signup');
  $('#showSignin').classList.toggle('selected',authMode==='signin');
  $('#signoutButton').hidden=!session;
  $('#authDialog').showModal();
}
$('#authButton').addEventListener('click',openAuth);
$('#closeAuth').addEventListener('click',()=>$('#authDialog').close());
$('#showSignin').addEventListener('click',()=>{authMode='signin';openAuth()});
$('#showSignup').addEventListener('click',()=>{authMode='signup';openAuth()});
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault(); const f=new FormData(e.currentTarget), email=f.get('email'), password=f.get('password');
 $('#authMessage').textContent='Please wait…';
 try {
  if(authMode==='signup') { await request('/auth/signup',{method:'POST',body:JSON.stringify({email,password,full_name:f.get('full_name')})}); $('#authMessage').textContent='Account created. Check your email if confirmation is enabled, then sign in.'; }
  else { const data=await request('/auth/signin',{method:'POST',body:JSON.stringify({email,password})}); session=data.session; setAuthUI(); $('#authDialog').close(); }
 } catch(err){$('#authMessage').textContent=err.message;}
});
$('#signoutButton').addEventListener('click',async()=>{try{await request('/auth/signout',{method:'POST'});}catch{} session=null;setAuthUI();$('#authDialog').close();});
$('#reportForm').addEventListener('submit',async e=>{
 e.preventDefault(); if(!session){authMode='signin';openAuth();return;}
 const body=Object.fromEntries(new FormData(e.currentTarget).entries());
 $('#reportMessage').textContent='Submitting…';
 try{await request('/items',{method:'POST',body:JSON.stringify(body)});$('#reportMessage').textContent='Report submitted successfully.';e.currentTarget.reset();await loadListings();}
 catch(err){$('#reportMessage').textContent=err.message;}
});
['searchInput','typeFilter','categoryFilter'].forEach(id=>$('#'+id).addEventListener('input',renderItems));
$('#reportForm').elements.item_date.value=new Date().toISOString().slice(0,10);
setAuthUI(); loadListings();