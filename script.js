/* script.js - main app logic for FADs by PHURAY */
const ADMIN_EMAIL = "admin@fadsbyphuray.com"; // change to your admin email
const FLW_PUBLIC_KEY = "FLWPUBK-6fc28cdcef00d1baf67eeef4010d608b-X";

const REFERRAL_BONUS = 500;
const WITHDRAWAL_MIN = 5000;

function el(id){ return document.getElementById(id) }
function uid(n=6){ return Math.random().toString(36).slice(2,2+n) }
function money(n){ return '₦' + Number(n).toLocaleString() }

// DOM ready
document.addEventListener('DOMContentLoaded', ()=>{
  el('year').textContent = new Date().getFullYear();
  init();
});

// helpers: show/hide sections
function hideAllSections(){ ['homeView','shopView','productView','cartView','accountView','adminView'].forEach(id=>{ const e=el(id); if(e) e.classList.add('hidden'); }) }
function showHome(){ hideAllSections(); el('homeView').classList.remove('hidden'); renderHomeGrids(); }
function showShop(){ hideAllSections(); el('shopView').classList.remove('hidden'); renderShop(); }
function showAccount(){ hideAllSections(); el('accountView').classList.remove('hidden'); renderAccount(); }
function showCart(){ hideAllSections(); el('cartView').classList.remove('hidden'); renderCart(); }
function showAdmin(){ hideAllSections(); el('adminView').classList.remove('hidden'); renderAdmin(); }
function scrollToSection(id){ document.getElementById(id).scrollIntoView({behavior:'smooth'}); }

/* ========== Firebase Auth state ========= */
auth.onAuthStateChanged(user=>{
  renderAccount();
  renderAdmin();
  renderHomeGrids();
  renderShop();
});

/* ========== Products rendering ========== */
async function renderHomeGrids(){
  const clothingGrid = el('clothingGrid'), jewelryGrid = el('jewelryGrid');
  if(!clothingGrid || !jewelryGrid) return;
  clothingGrid.innerHTML = ''; jewelryGrid.innerHTML = '';
  const snap = await db.collection('products').orderBy('createdAt','desc').get();
  snap.forEach(doc=>{
    const p = doc.data(); p.id = doc.id;
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<img src="${p.img||'https://via.placeholder.com/600x400'}" alt=""><h3>${p.title||'Untitled'}</h3><div class="price">${money(p.price||0)}</div>
      <div style="display:flex;gap:8px;margin-top:8px"><button class="btn" onclick="addToCart('${p.id}')">Add to cart</button><button class="ghost" onclick="openProduct('${p.id}')">View</button></div>`;
    if(p.category === 'Clothing') clothingGrid.appendChild(card); else jewelryGrid.appendChild(card);
  });
}
async function renderShop(){
  const node = el('shopGrid'); if(!node) return; node.innerHTML='';
  const snap = await db.collection('products').orderBy('createdAt','desc').get();
  snap.forEach(doc=>{
    const p = doc.data(); p.id = doc.id;
    const card = document.createElement('div'); card.className='card';
    card.innerHTML = `<img src="${p.img||'https://via.placeholder.com/600x400'}" alt=""><h3>${p.title||'Untitled'}</h3><div class="price">${money(p.price||0)}</div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" onclick="addToCart('${p.id}')">Add</button><button class="ghost" onclick="openProduct('${p.id}')">View</button></div>`;
    node.appendChild(card);
  });
}
async function openProduct(id){
  hideAllSections(); el('productView').classList.remove('hidden');
  const doc = await db.collection('products').doc(id).get();
  if(!doc.exists){ el('productDetail').innerHTML = '<p>Product not found.</p>'; return; }
  const p = doc.data(); p.id = doc.id;
  el('productDetail').innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><img src="${p.img||'https://via.placeholder.com/800x600'}" style="width:100%;border-radius:8px"></div>
    <div><h2>${p.title}</h2><div class="price">${money(p.price)}</div><p class="small">${p.description||''}</p><p class="small">Specs: ${p.specs||'N/A'}</p><div style="margin-top:12px"><button class="btn" onclick="addToCart('${p.id}')">Add to cart</button><button class="ghost" onclick="showShop()">Back</button></div></div></div>`;
}

/* ========== CART (localStorage) ========== */
function getCart(){ return JSON.parse(localStorage.getItem('cart')||'[]') }
function setCart(c){ localStorage.setItem('cart', JSON.stringify(c)) }
function addToCart(pid){ const cart = getCart(); const found = cart.find(i=>i.id===pid); if(found) found.qty += 1; else cart.push({id:pid, qty:1}); setCart(cart); alert('Added to cart'); updateCartBadge(); }
function updateCartBadge(){ const n = getCart().reduce((s,i)=>s+i.qty,0); document.title = (n?('('+n+') '):'') + 'FADs by PHURAY'; }
async function renderCart(){
  const container = el('cartContainer'); container.innerHTML=''; const cart = getCart(); if(cart.length===0){ container.innerHTML = '<p>Your cart is empty.</p>'; return; }
  let total = 0;
  for(let i=0;i<cart.length;i++){
    const item = cart[i]; const doc = await db.collection('products').doc(item.id).get(); const p = doc.data();
    const subtotal = p.price * item.qty; total += subtotal;
    const row = document.createElement('div'); row.className='card'; row.style.display='flex'; row.style.gap='12px';
    row.innerHTML = `<img src="${p.img||'https://via.placeholder.com/300x200'}" style="width:120px;height:90px;object-fit:cover;border-radius:6px"><div style="flex:1"><strong>${p.title}</strong><div class="small">Qty: ${item.qty}</div><div class="price">${money(subtotal)}</div></div><div style="display:flex;flex-direction:column;gap:8px"><button class="ghost" onclick="removeFromCart(${i})">Remove</button></div>`;
    container.appendChild(row);
  }
  const summary = document.createElement('div'); summary.style.marginTop='12px'; summary.innerHTML = `<div class="small">Order total: <strong>${money(total)}</strong></div><div style="margin-top:8px"><button class="btn" onclick="startCheckout()">Checkout</button></div>`;
  container.appendChild(summary);
}
function removeFromCart(i){ const cart = getCart(); cart.splice(i,1); setCart(cart); renderCart(); updateCartBadge(); }

/* ========== AUTH & ACCOUNT ========== */
async function registerUser(name,email,password){
  const res = await auth.createUserWithEmailAndPassword(email,password);
  const uid = res.user.uid; const code = 'R' + Math.random().toString(36).slice(2,8).toUpperCase();
  await db.collection('users').doc(uid).set({ name, email, wallet:0, ref:code, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  alert('Account created. Referral code: ' + code);
}
async function loginUser(email,password){ await auth.signInWithEmailAndPassword(email,password); alert('Logged in'); }
async function logoutUser(){ await auth.signOut(); alert('Logged out'); }

function renderAccount(){
  const area = el('accountArea'); area.innerHTML=''; const user = auth.currentUser;
  if(user){
    db.collection('users').doc(user.uid).get().then(doc=>{
      const u = doc.data();
      area.innerHTML = `<h3>Welcome, ${u.name || user.email}</h3><p class="small">Wallet: <strong>${money(u.wallet||0)}</strong></p><p class="small">Referral code: <strong>${u.ref}</strong></p><p class="small">Share link: <input style="width:100%;padding:6px" value="${location.origin+location.pathname+'?ref='+u.ref}" readonly></p><div style="display:flex;gap:8px"><button class="btn" onclick="logoutUser()">Logout</button><button class="ghost" onclick="openWithdrawalForm()">Request Withdrawal</button></div>`;
    });
  } else {
    area.innerHTML = `<div><h3>Create account</h3><input class="input" id="reg_name" placeholder="Full name"><input class="input" id="reg_email" placeholder="Email"><input class="input" id="reg_pass" placeholder="Password" type="password"><div style="display:flex;gap:8px"><button class="btn" onclick="doRegister()">Create</button><button class="ghost" onclick="showLoginForm()">Login</button></div></div>`;
  }
}
function doRegister(){ const n = el('reg_name').value.trim(), e = el('reg_email').value.trim(), p = el('reg_pass').value; if(!n||!e||!p) return alert('Fill all'); registerUser(n,e,p).then(()=>{ showAccount(); location.hash='account' }) }
function showLoginForm(){ el('accountArea').innerHTML = `<h3>Login</h3><input class="input" id="li_email" placeholder="Email"><input class="input" id="li_pass" placeholder="Password" type="password"><div style="display:flex;gap:8px"><button class="btn" onclick="doLogin()">Login</button><button class="ghost" onclick="renderAccount()">Back</button></div>` }
function doLogin(){ const e = el('li_email').value.trim(), p = el('li_pass').value; if(!e||!p) return alert('Fill details'); loginUser(e,p).then(()=>{ location.hash=''; renderAccount(); }) }

/* ========== CHECKOUT with Flutterwave (client) ========== */
async function startCheckout(){
  const cart = getCart(); if(cart.length===0) return alert('Cart empty');
  const name = prompt('Full name (for shipping):'); if(!name) return;
  const email = prompt('Email:'); if(!email) return;
  const phone = prompt('Phone (e.g. +234...):'); if(!phone) return;
  const address = prompt('Shipping Address:'); if(!address) return;
  const refCode = (new URLSearchParams(location.search)).get('ref') || null;

  // compute total
  let total = 0;
  for(const item of cart){
    const doc = await db.collection('products').doc(item.id).get();
    const p = doc.data(); total += (p.price||0) * item.qty;
  }

  // create unique tx_ref, create order as pending
  const tx_ref = 'FADS_' + Date.now() + '_' + Math.random().toString(36).slice(2,6).toUpperCase();

  const orderPayload = {
    customer: { name, email, phone, address },
    items: cart,
    total,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    paymentRef: tx_ref,
    status: 'pending',
    refUsed: refCode || null
  };

  // Save pending order BEFORE launching checkout
  await db.collection('orders').add(orderPayload);

  // Launch Flutterwave checkout
  FlutterwaveCheckout({
    public_key: FLW_PUBLIC_KEY,
    tx_ref: tx_ref,
    amount: total,
    currency: "NGN",
    payment_options: "card,banktransfer,ussd",
    customer: { email, phonenumber: phone, name },
    customizations: { title: "FADs by PHURAY", description: "Payment for your order", logo: "" },
    callback: function (data) {
      // The webhook will verify and update the order to 'paid'.
      alert('Payment process finished. Verification is done server-side; order will be updated when confirmed.');
      localStorage.removeItem('cart'); updateCartBadge(); showHome();
    },
    onclose: function() { console.log('checkout closed'); }
  });
}

/* SaveOrder used only for fallback or manual creation */
async function saveOrderLocal(order){ await db.collection('orders').add(order) }

/* ========== Withdrawals ========== */
async function openWithdrawalForm(){ const user = auth.currentUser; if(!user) return alert('Please login'); const ref = await db.collection('users').doc(user.uid).get(); const ud = ref.data(); const available = ud.wallet || 0; if(available < WITHDRAWAL_MIN) return alert('Minimum withdrawal ₦' + WITHDRAWAL_MIN + ' required. Your balance: ' + money(available)); const amount = prompt('Enter amount to withdraw (₦). Available: ' + money(available)); if(!amount) return; const num = Number(amount); if(isNaN(num) || num<=0) return alert('Invalid amount'); if(num > available) return alert('Amount exceeds wallet'); const bank = prompt('Bank name:'); if(!bank) return; const acc = prompt('Account number:'); if(!acc) return; await db.collection('withdrawals').add({ userId: user.uid, userEmail: ud.email, amount: num, bank, account: acc, status:'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); await db.collection('users').doc(user.uid).update({ wallet: (available - num) }); alert('Withdrawal request submitted. Admin will review.'); }

/* ========== ADMIN UI & actions ========== */
async function renderAdmin(){ const adminArea = el('adminArea'); if(!adminArea) return; adminArea.innerHTML=''; const user = auth.currentUser; if(!user){ adminArea.innerHTML = `<p class="small">Sign in as admin (Firebase Authentication required).</p><div><input class="input" id="adm_email" placeholder="Admin email"><input class="input" id="adm_pass" placeholder="Admin password" type="password"><div style="display:flex;gap:8px"><button class="btn" onclick="adminLogin()">Login as Admin</button></div></div>`; return; } if(user.email !== ADMIN_EMAIL){ adminArea.innerHTML = '<p class="small">You are not admin. Logout and login with admin account.</p><div><button class="btn" onclick="auth.signOut()">Logout</button></div>'; return; }

  adminArea.innerHTML = `
    <div><h3>Products</h3><div id="adminProducts" class="grid"></div>
      <h4>Add product</h4>
      <input class="input" id="a_title" placeholder="Title">
      <input class="input" id="a_price" placeholder="Price">
      <input class="input" id="a_img" placeholder="Image URL (Cloudinary or other)">
      <select class="input" id="a_cat"><option>Clothing</option><option>Jewelry</option></select>
      <textarea class="input" id="a_desc" placeholder="Description / sizes / material"></textarea>
      <div style="display:flex;gap:8px"><button class="btn" onclick="adminAddProduct()">Save</button></div></div>
    <hr><div><h3>Orders</h3><div id="adminOrders"></div></div>
    <hr><div><h3>Withdrawals</h3><div id="adminWithdrawals"></div></div>
    <div style="margin-top:12px"><button class="ghost" onclick="auth.signOut()">Logout Admin</button></div>
  `;
  // load lists
  const prods = await db.collection('products').orderBy('createdAt','desc').get();
  const prodsNode = el('adminProducts'); prodsNode.innerHTML='';
  prods.forEach(doc=>{ const p=doc.data(); p.id=doc.id; const d=document.createElement('div'); d.className='card'; d.innerHTML=`<img src="${p.img||'https://via.placeholder.com/400x300'}"><h3>${p.title}</h3><div class="small">${p.category}</div><div class="price">${money(p.price)}</div><div style="display:flex;gap:8px;margin-top:8px"><button class="ghost" onclick="editProduct('${p.id}')">Edit</button><button class="ghost" onclick="deleteProduct('${p.id}')">Delete</button></div>`; prodsNode.appendChild(d) });
  // orders
  const orders = await db.collection('orders').orderBy('createdAt','desc').get();
  const ordNode = el('adminOrders'); ordNode.innerHTML='';
  orders.forEach(doc=>{ const o = doc.data(); const d=document.createElement('div'); d.className='card'; d.style.padding='8px'; d.innerHTML=`<strong>Order ${doc.id}</strong><div class="small">${o.customer.name} | ${money(o.total)}</div><div class="small">Ref: ${o.refUsed || '—'}</div>`; ordNode.appendChild(d) });
  // withdrawals
  const w = await db.collection('withdrawals').orderBy('createdAt','desc').get();
  const wnode = el('adminWithdrawals'); wnode.innerHTML='';
  w.forEach(doc=>{ const req = doc.data(); const d=document.createElement('div'); d.className='card'; d.style.padding='8px'; d.innerHTML=`<strong>${doc.id}</strong><div class="small">User: ${req.userEmail} | ${money(req.amount)} | ${req.status}</div><div style="display:flex;gap:8px;margin-top:8px"><button class="btn" onclick="approveWithdrawal('${doc.id}')">Approve</button><button class="ghost" onclick="rejectWithdrawal('${doc.id}')">Reject</button></div>`; wnode.appendChild(d) });
}
async function adminLogin(){ const e=el('adm_email').value.trim(), p=el('adm_pass').value; try{ await auth.signInWithEmailAndPassword(e,p); alert('Admin logged in'); renderAdmin(); } catch(err){ alert('Admin login failed: '+err.message) } }
async function adminAddProduct(){ const title=el('a_title').value.trim(), price=Number(el('a_price').value), img=el('a_img').value.trim(), category=el('a_cat').value, desc=el('a_desc').value.trim(); if(!title||!price||!category) return alert('Fill title, price and category'); await db.collection('products').add({ title, price, img, category, description: desc, specs:'', createdAt: firebase.firestore.FieldValue.serverTimestamp() }); alert('Saved'); renderAdmin(); renderHomeGrids(); renderShop(); }
async function deleteProduct(id){ if(!confirm('Delete product?')) return; await db.collection('products').doc(id).delete(); renderAdmin(); renderHomeGrids(); renderShop(); }
async function editProduct(id){ const doc = await db.collection('products').doc(id).get(); const p = doc.data(); const t = prompt('Title', p.title); if(!t) return; await db.collection('products').doc(id).update({ title: t }); renderAdmin(); renderHomeGrids(); renderShop(); }
async function approveWithdrawal(id){ await db.collection('withdrawals').doc(id).update({ status:'approved', processedAt: firebase.firestore.FieldValue.serverTimestamp() }); alert('Marked approved. Pay the user manually.'); renderAdmin(); }
async function rejectWithdrawal(id){ await db.collection('withdrawals').doc(id).delete(); alert('Rejected'); renderAdmin(); }

/* ========== INIT ========== */
async function init(){
  if(location.pathname.endsWith('/admin') || location.hash === 'admin'){ hideAllSections(); el('adminView').classList.remove('hidden'); renderAdmin(); return; }
  const ref = new URLSearchParams(location.search).get('ref');
  if(ref){
    const b = document.createElement('div'); b.style.background='linear-gradient(90deg,#CC5500,#000)'; b.style.color='#fff'; b.style.padding='8px'; b.style.textAlign='center';
    b.innerHTML = `Visiting with referral <strong>${ref}</strong>. If purchase completes, referrer gets ₦${REFERRAL_BONUS}.`;
    document.body.insertBefore(b, document.body.firstChild);
  }
  showHome(); updateCartBadge(); renderHomeGrids(); renderShop();
}
init();
                        
