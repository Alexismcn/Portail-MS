async function loadData(){
  try{
    const res = await fetch('data/tools.json');
    return await res.json();
  }catch(e){
    console.error('Impossible de charger data/tools.json', e);
    return {tools:[], tree:[]};
  }
}

function el(q){return document.querySelector(q)}

// --- Simple client-side auth helpers (NOT secure; demo only) ---
const AUTH_ID = 'MS2025P';
const AUTH_PW = 'MS2025P';
function isAuthenticated(){ return sessionStorage.getItem('ms_auth') === 'true'; }
function requireAuth(){
  // protect tools and explorer pages
  const p = location.pathname.split('/').pop();
  if((p === 'tools.html' || p === 'explorer.html') && !isAuthenticated()){
    const next = encodeURIComponent(p || 'index.html');
    location.href = `login.html?next=${next}`;
  }
}


// Modal helpers (global scope so table row handlers can call them)
function showToolModal(tool){
  const modal = el('#tool-modal');
  if(!modal) return;
  modal.setAttribute('aria-hidden','false');
  el('#modal-logo').src = tool.logo || 'Images/logomsbleu.png';
  el('#modal-logo').alt = tool.name || 'logo';
  el('#modal-title').textContent = tool.name || '';
  el('#modal-specialty').textContent = tool.specialty || '';
  el('#modal-sensitivity').textContent = tool.sensitivity || 'Non renseigné';
  el('#modal-access').innerHTML = (tool.access||[]).map(a=>`<span class="access-badge">${a}</span>`).join(' ');
  el('#modal-description').textContent = tool.description || '';
  const link = el('#modal-link');
  if(link) { link.href = tool.link || '#'; link.target = '_blank'; }
}

function hideToolModal(){
  const modal = el('#tool-modal');
  if(!modal) return;
  modal.setAttribute('aria-hidden','true');
}

// Close handlers (global)
document.addEventListener('click', (e)=>{
  if(e.target.matches('[data-close]')) hideToolModal();
});
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') hideToolModal(); });

function renderToolsTable(tools){
  const tbody = el('#tools-table tbody');
  tbody.innerHTML = '';
  tools.forEach((t, idx)=>{
    const tr = document.createElement('tr');
    tr.dataset.index = idx;
    tr.innerHTML = `
      <td><img src="${t.logo||'Images/logomsbleu.png'}" alt="${t.name}"></td>
      <td><strong>${t.name}</strong></td>
      <td>${t.specialty||''}</td>
      <td>${t.description||''}</td>
      <td>${t.part||''}</td>
    `;
    tr.addEventListener('click', ()=>{ showToolModal(t); });
    tbody.appendChild(tr);
  });
}

function populateSpecialtyFilter(tools){
  const sel = el('#filter-specialty');
  const set = new Set();
  tools.forEach(t=>{ if(t.specialty) set.add(t.specialty); });
  const arr = Array.from(set).sort();
  sel.innerHTML = '<option value="">Toutes les spécialités</option>' + arr.map(s=>`<option value="${s}">${s}</option>`).join('');
}

function applyFilters(all){
  const q = el('#search')?.value?.toLowerCase()||'';
  const part = el('#filter-part')?.value||'';
  const specialty = el('#filter-specialty')?.value||'';
  const filtered = all.filter(t=>{
    if(part && t.part !== part) return false;
    if(specialty && t.specialty !== specialty) return false;
    if(!q) return true;
    return [t.name, t.description, t.specialty, t.part].join(' ').toLowerCase().includes(q);
  });
  renderToolsTable(filtered);
}

function buildTree(container, treeData, onClick){
  container.innerHTML = '';
  const ul = document.createElement('ul');
  treeData.forEach(node=> ul.appendChild(makeNode(node, onClick, [], container)) );
  container.appendChild(ul);
}

function makeNode(node, onClick, ancestors, container){
  const li = document.createElement('li');
  li.dataset.id = node.id || node.title;
  const row = document.createElement('div'); row.className='node-row';

  // Toggle button
  const toggle = document.createElement('button');
  toggle.className = 'toggle-button';
  toggle.type = 'button';
  toggle.setAttribute('aria-label','Ouvrir/fermer');
  toggle.setAttribute('aria-expanded','false');
  toggle.innerHTML = node.children && node.children.length ? '+' : '';
  row.appendChild(toggle);

  const label = document.createElement('span');
  label.className = 'node-label';
  label.textContent = node.title;
  row.appendChild(label);

  if(node.resources && node.resources.length){
    const cnt = document.createElement('span'); cnt.className='node-count'; cnt.textContent = `(${node.resources.length})`; row.appendChild(cnt);
  }

  li.appendChild(row);

  const path = ancestors.concat(node.title);

  // children container
  let childrenContainer = null;
  if(node.children && node.children.length){
    childrenContainer = document.createElement('div');
    childrenContainer.className = 'node-children';
    node.children.forEach(c=> childrenContainer.appendChild(makeNode(c,onClick,path,container)) );
    li.appendChild(childrenContainer);
  }

  function collapse(){
    if(childrenContainer){ childrenContainer.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); toggle.innerHTML = '+'; }
  }
  function expand(){
    if(childrenContainer){ childrenContainer.classList.add('open'); toggle.setAttribute('aria-expanded','true'); toggle.innerHTML = '−'; }
  }

  function selectNode(e){
    e.stopPropagation();
    container.querySelectorAll('li.selected').forEach(x=>x.classList.remove('selected'));
    li.classList.add('selected');
    onClick(Object.assign({}, node, {__path: path}));
    updateBreadcrumb(path, node);
  }

  label.addEventListener('click', selectNode);
  label.tabIndex = 0;
  label.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' ') selectNode(e); });

  toggle.addEventListener('click',(e)=>{ e.stopPropagation(); const expanded = toggle.getAttribute('aria-expanded') === 'true'; if(expanded) collapse(); else expand(); });

  // If there are no children, hide toggle element styling
  if(!childrenContainer){ toggle.style.visibility = 'hidden'; }

  return li;
}

function updateBreadcrumb(path, node){
  const bc = el('#breadcrumb');
  if(!bc) return;
  bc.innerHTML = '';
  path.forEach((p, idx)=>{
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = p;
    a.addEventListener('click',(e)=>{
      e.preventDefault();
      // simulate clicking the corresponding node in the tree
      const targetText = path.slice(0, idx+1).join(' > ');
      // find li where __path matches
      const list = document.querySelectorAll('.tree-root li');
      for(const li of list){
        const spans = li.querySelectorAll('div.node-row span');
        if(!spans.length) continue;
        if(spans[spans.length-1].textContent === p){ spans[0].click(); break; }
      }
    });
    bc.appendChild(a);
    if(idx < path.length-1){
      const sep = document.createElement('span'); sep.textContent = '›'; sep.className='muted';
      bc.appendChild(sep);
    }
  });
}

function renderCards(targetEl, items){
  targetEl.innerHTML = '';
  if(!items || !items.length){ targetEl.innerHTML = '<p class="muted">Aucune ressource trouvée.</p>'; return; }
  items.forEach(it=>{
    const d = document.createElement('div'); d.className='card';
    d.innerHTML = `
      <h4>${it.title||it.name}</h4>
      <p class="muted">${it.subtitle|| (it.specialty || '')}</p>
      <p>${it.description||''}</p>
      <div class="tags">${(it.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    `;
    // Make the card clickable if a link is provided
    if(it.link){
      d.style.cursor = 'pointer';
      d.setAttribute('role','link');
      d.tabIndex = 0;
      d.addEventListener('click', ()=>{ window.open(it.link, '_blank', 'noopener'); });
      d.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(it.link, '_blank', 'noopener'); } });
    }
    targetEl.appendChild(d);
  });
}

document.addEventListener('DOMContentLoaded', async ()=>{
  // Enforce simple auth for protected pages
  requireAuth();
  const data = await loadData();
  const pathname = location.pathname.split('/').pop();

  // Tools page
  if(document.body.id === 'page-tools'){
    populateSpecialtyFilter(data.tools);
    renderToolsTable(data.tools);
    el('#search').addEventListener('input', ()=> applyFilters(data.tools));
    el('#filter-part').addEventListener('change', ()=> applyFilters(data.tools));
    el('#filter-specialty').addEventListener('change', ()=> applyFilters(data.tools));
  }

  // Explorer page
  if(document.body.id === 'page-explorer'){
    const treeRoot = el('#tree-root');
    const cards = el('#cards');
    const search = el('#explorer-search');
    const clearBtn = el('#clear-selection');

    buildTree(treeRoot, data.tree, (node)=>{
      // node may contain resources
      const res = node.resources || node.flatResources || [];
      if(res.length) renderCards(cards, res);
      else cards.innerHTML = '<p class="muted">Aucune ressource dans cette section.</p>';
      const title = el('#content-title'); if(title) title.textContent = node.title || node.name || 'Ressources';
    });

    // Explorer search: filter visible nodes by title and auto-expand parents
    search.addEventListener('input', ()=>{
      const q = search.value.trim().toLowerCase();
      if(!q){
        // clear matches and collapse all
        treeRoot.querySelectorAll('.node-match').forEach(n=>n.classList.remove('node-match'));
        treeRoot.querySelectorAll('.node-children').forEach(c=>c.classList.remove('open'));
        treeRoot.querySelectorAll('.toggle-button').forEach(t=>{ t.setAttribute('aria-expanded','false'); t.innerHTML = '+'; });
        treeRoot.querySelectorAll('li').forEach(li=>li.style.display='');
        return;
      }

      // walk nodes and mark matches
      const lis = Array.from(treeRoot.querySelectorAll('li'));
      lis.forEach(li=> li.style.display = 'none');

      function markMatches(nodeEl){
        const label = nodeEl.querySelector('.node-label');
        const text = label?.textContent?.toLowerCase() || '';
        const match = text.includes(q);
        let childMatch = false;
        const children = nodeEl.querySelectorAll(':scope > .node-children > li');
        children.forEach(c=>{ if(markMatches(c)) childMatch = true; });
        if(match || childMatch){
          nodeEl.style.display = '';
          if(match) nodeEl.querySelector('.node-row')?.classList.add('node-match');
          // ensure parents are visible and expanded
          const parent = nodeEl.parentElement.closest('li');
          if(parent){
            const parentChildren = parent.querySelector(':scope > .node-children');
            if(parentChildren){ parentChildren.classList.add('open'); const t = parent.querySelector('.toggle-button'); if(t){ t.setAttribute('aria-expanded','true'); t.innerHTML = '−'; } }
            parent.style.display = '';
          }
          return true;
        } else {
          nodeEl.querySelector('.node-row')?.classList.remove('node-match');
          return false;
        }
      }

      // top-level lis
      const topLis = Array.from(treeRoot.querySelectorAll(':scope > ul > li'));
      topLis.forEach(li=> markMatches(li));
    });

    clearBtn.addEventListener('click', ()=>{
      search.value = '';
      el('#content-title').textContent = 'Ressources';
      cards.innerHTML = '<p class="muted">Sélectionnez une section dans l\'explorateur pour afficher les cartes de ressources.</p>';
      treeRoot.querySelectorAll('li').forEach(li=>{ li.classList.remove('selected'); li.style.display=''; const sub = li.querySelector('ul'); if(sub) sub.style.display='none'; const toggle = li.querySelector('.toggle'); if(toggle) toggle.classList.remove('rotate'); });
      el('#breadcrumb').innerHTML = '';
    });
  }


});

// Dropdown behavior for nav menus (unified nav-button)
document.addEventListener('click', (e)=>{
  const navBtn = e.target.closest('.nav-button');
  if(navBtn){
    const item = navBtn.closest('.nav-item');
    if(item && item.querySelector('.dropdown-menu')){
      e.preventDefault();
      const expanded = navBtn.getAttribute('aria-expanded') === 'true';
      // close other open dropdowns
      document.querySelectorAll('.nav-item.open').forEach(n=>{
        if(n!==item){ n.classList.remove('open'); const b = n.querySelector('.nav-button'); if(b) b.setAttribute('aria-expanded','false'); }
      });
      if(expanded){ item.classList.remove('open'); navBtn.setAttribute('aria-expanded','false'); }
      else { item.classList.add('open'); navBtn.setAttribute('aria-expanded','true'); }
      return;
    }
  }

  // click outside: close dropdowns
  if(!e.target.closest('.nav-item')){
    document.querySelectorAll('.nav-item.open').forEach(n=>{ n.classList.remove('open'); const b = n.querySelector('.nav-button'); if(b) b.setAttribute('aria-expanded','false'); });
  }
});
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ document.querySelectorAll('.nav-item.open').forEach(n=>{ n.classList.remove('open'); const b = n.querySelector('.nav-button'); if(b) b.setAttribute('aria-expanded','false'); }); } });
