const CLOUD_NAME='das8chiyz';
const UPLOAD_PRESET='photowebsite';
const ADMIN_EMAILS=['greencucumbertube@gmail.com'];
const STORAGE_KEYS={shoots:'photo_gallery_shoots',slides:'photo_gallery_home_slides',users:'photo_gallery_users',session:'photo_gallery_session'};

/* ── SUPABASE CONFIG ─────────────────────────────────────────────── */
const SUPABASE_URL='https://ohxezoxiuxbqrzfomdyt.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9oeGV6b3hpdXhicXJ6Zm9tZHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzIwNTEsImV4cCI6MjA5Mzc0ODA1MX0.f4XCp9NammBkHsv72a2-iSQogqw6l2qOi2rLpZk5SLQ';
const SB_HEADERS={apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'};

async function sbGet(table,query=''){
    const res=await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+query,{headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}});
    if(!res.ok)throw new Error('Supabase GET failed: '+table+' '+res.status);
    return res.json();
}
async function sbUpsert(table,data){
    const res=await fetch(SUPABASE_URL+'/rest/v1/'+table,{
        method:'POST',
        headers:{...SB_HEADERS,'Prefer':'resolution=merge-duplicates'},
        body:JSON.stringify(Array.isArray(data)?data:[data])
    });
    if(!res.ok){const t=await res.text();throw new Error('Supabase UPSERT failed: '+table+' '+res.status+' '+t);}
}
async function sbDelete(table,filter){
    const res=await fetch(SUPABASE_URL+'/rest/v1/'+table+'?'+filter,{
        method:'DELETE',
        headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+SUPABASE_KEY}
    });
    if(!res.ok)throw new Error('Supabase DELETE failed: '+table+' '+res.status);
}

/* ── CLOUDINARY URL OPTIMIZER ────────────────────────────────────── */
// Inject f_auto,q_auto,w_1200 into Cloudinary URLs to save bandwidth
function optimizeCldUrl(url, opts){
    if(!url||typeof url!=='string')return url;
    if(!url.includes('res.cloudinary.com'))return url;
    const {w=1200,q='auto',f='auto'}=opts||{};
    const transform='f_'+f+',q_'+q+',w_'+w;
    // Already has this transform → skip
    if(url.includes(transform))return url;
    // Insert after /image/upload/ (or /video/upload/)
    return url.replace(/(\/image\/upload\/|\/video\/upload\/)/,'$1'+transform+'/');
}
// Cover images (smaller thumbs)
function cldCover(url){return optimizeCldUrl(url,{w:800,q:'auto',f:'auto'})}
// Gallery / lightbox images
function cldFull(url){return optimizeCldUrl(url,{w:1200,q:'auto',f:'auto'})}

let SHOOTS=[],monthSet=new Set(),currentUser=null,isAdmin=false;
let currentLang=localStorage.getItem('lang')||'zh',activeObservers=[];
let editGalleryImages=[];
const YEARS=[2024,2025,2026],app=document.getElementById('app');
const DEFAULT_COVER='https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600&q=80';
const DEFAULT_IMAGE='https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=1200&q=85';

/* Photo brand click -> homepage */
document.getElementById('navBrand').addEventListener('click',e=>{e.preventDefault();location.hash='#/'});

/* TRANSLATIONS */
const LANG={
    zh:{
        months:['','一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月'],
        home:'首页',login:'登录',register:'注册',logout:'退出',admin:'管理员',
        email:'邮箱',password:'密码',loginTitle:'登录账号',registerTitle:'注册新账号',
        noAccount:'没有账号？',hasAccount:'已有账号？',goRegister:'去注册',goLogin:'去登录',
        back:'返回',download:'前往 Google Drive 下载素材',noData:'暂无素材',
        notFound:'未找到该素材',loadFail:'数据加载失败',shoots:'组素材',
        clickHint:'点击查看详情 →',adminPanel:'管理员面板',newShoot:'新增',
        batchDel:'批量删除',batchCover:'批量换封面',selected:'已选',
        cancel:'取消',save:'保存',edit:'编辑',delete:'删除',
        confirmDel:'确认删除？',noPermission:'无权限访问',pleaseLogin:'请先登录',
        loginOk:'登录成功',regOk:'注册成功',logoutOk:'已退出',close:'关闭',
        slug:'标识',titleLabel:'标题',dateLabel:'日期',descLabel:'描述',
        peopleLabel:'人物（逗号分隔）',equipLabel:'设备',driveLink:'Drive 链接',
        coverImage:'封面图片',galleryPhotos:'详情页相册',uploadImage:'上传图片',
        pasteUrl:'粘贴链接',newShootTitle:'新增素材',editShootTitle:'编辑素材',
        cover:'封面',photos:'张照片',detailInfo:'详细信息',basicInfo:'基本信息',
        clickUpload:'点击上传封面',coverUrl:'封面图片URL',addPhoto:'添加照片',
        noGallery:'暂无更多照片',galleryTitle:'相关影像'
    },
    en:{
        months:['','January','February','March','April','May','June','July','August','September','October','November','December'],
        home:'Home',login:'Login',register:'Register',logout:'Logout',admin:'Admin',
        email:'Email',password:'Password',loginTitle:'Login',registerTitle:'Register',
        noAccount:"Don't have an account?",hasAccount:'Already have an account?',
        goRegister:'Register',goLogin:'Login',back:'Back',
        download:'Go to Google Drive',noData:'No data',notFound:'Not found',
        loadFail:'Load failed',shoots:'shoots',
        clickHint:'Click for detail →',adminPanel:'Admin Panel',newShoot:'New',
        batchDel:'Batch Delete',batchCover:'Batch Cover',selected:'selected',
        cancel:'Cancel',save:'Save',edit:'Edit',delete:'Delete',
        confirmDel:'Confirm delete?',noPermission:'No permission',pleaseLogin:'Please login',
        loginOk:'Login OK',regOk:'Registered',logoutOk:'Logged out',close:'Close',
        slug:'Slug',titleLabel:'Title',dateLabel:'Date',descLabel:'Description',
        peopleLabel:'People (comma separated)',equipLabel:'Equipment',driveLink:'Drive Link',
        coverImage:'Cover Image',galleryPhotos:'Detail Gallery',uploadImage:'Upload',
        pasteUrl:'Paste URL',newShootTitle:'New Shoot',editShootTitle:'Edit Shoot',
        cover:'Cover',photos:'photos',detailInfo:'Details',basicInfo:'Basic Info',
        clickUpload:'Click to upload cover',coverUrl:'Cover Image URL',addPhoto:'Add Photo',
        noGallery:'No additional photos',galleryTitle:'Gallery'
    },
    ms:{
        months:['','Januari','Februari','Mac','April','Mei','Jun','Julai','Ogos','September','Oktober','November','Disember'],
        home:'Utama',login:'Log Masuk',register:'Daftar',logout:'Keluar',admin:'Admin',
        email:'E-mel',password:'Kata Laluan',loginTitle:'Log Masuk',registerTitle:'Daftar',
        noAccount:'Tiada akaun?',hasAccount:'Sudah ada akaun?',goRegister:'Daftar',
        goLogin:'Log Masuk',back:'Kembali',download:'Pergi ke Google Drive',
        noData:'Tiada data',notFound:'Tidak dijumpai',loadFail:'Gagal muat',
        shoots:'foto',clickHint:'Klik untuk butiran →',adminPanel:'Panel Admin',
        newShoot:'Baru',batchDel:'Padam Pukal',batchCover:'Kulit Pukal',selected:'dipilih',
        cancel:'Batal',save:'Simpan',edit:'Sunting',delete:'Padam',
        confirmDel:'Pasti padam?',noPermission:'Tiada kebenaran',
        pleaseLogin:'Sila log masuk',loginOk:'Berjaya',regOk:'Berjaya daftar',
        logoutOk:'Telah keluar',close:'Tutup',
        slug:'Slug',titleLabel:'Tajuk',dateLabel:'Tarikh',descLabel:'Penerangan',
        peopleLabel:'Orang (dipisah koma)',equipLabel:'Peralatan',driveLink:'Pautan Drive',
        coverImage:'Gambar Kulit',galleryPhotos:'Galeri Butiran',uploadImage:'Muat Naik',
        pasteUrl:'Tampal URL',newShootTitle:'Foto Baru',editShootTitle:'Sunting Foto',
        cover:'Kulit',photos:'foto',detailInfo:'Butiran',basicInfo:'Maklumat Asas',
        clickUpload:'Klik untuk muat naik',coverUrl:'URL Gambar Kulit',addPhoto:'Tambah Foto',
        noGallery:'Tiada foto lagi',galleryTitle:'Galeri'
    }
};
function t(k){return LANG[currentLang][k]||k}
function mName(m){return LANG[currentLang].months[m]||''}
function fmtDate(ds){const d=new Date(ds.includes('T')?ds:ds+'T00:00:00'),y=d.getFullYear(),mo=d.getMonth()+1,dy=d.getDate();if(currentLang==='zh')return y+'年'+mo+'月'+dy+'日';if(currentLang==='ms')return dy+' '+mName(mo)+' '+y;return mName(mo)+' '+dy+', '+y}
function updateI18n(){document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.dataset.i18n;if(LANG[currentLang][k])el.textContent=LANG[currentLang][k]})}

/* THEME / LANG */
function applyTheme(th){document.documentElement.dataset.theme=th;localStorage.setItem('theme',th)}
applyTheme(localStorage.getItem('theme')||'dark');
if(!localStorage.getItem('theme'))applyTheme('dark');
function toggleTheme(){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');buildNavRight()}
function setLang(l){currentLang=l;localStorage.setItem('lang',l);buildNav();buildNavRight();router()}

/* AUTH — still stored locally (session only, not gallery data) */
function readStore(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch(e){return fallback}}
function writeStore(key,value){localStorage.setItem(key,JSON.stringify(value))}
function normalizeEmail(email){return String(email||'').trim().toLowerCase()}
function getEmailAvatar(email){return 'https://api.dicebear.com/9.x/initials/svg?seed='+encodeURIComponent(normalizeEmail(email))+'&backgroundType=gradientLinear&radius=50'}
function checkSession(){const session=readStore(STORAGE_KEYS.session,null);if(session&&session.email){currentUser={email:normalizeEmail(session.email),avatar:getEmailAvatar(session.email)};isAdmin=ADMIN_EMAILS.includes(currentUser.email)}else{currentUser=null;isAdmin=false}buildNavRight()}
const authModal=document.getElementById('authModal');let authMode='login';
function openAuth(mode){authMode=mode;document.getElementById('authTitle').textContent=mode==='login'?t('loginTitle'):t('registerTitle');document.getElementById('authEmailLabel').textContent=t('email');document.getElementById('authPassLabel').textContent=t('password');document.getElementById('authSubmit').textContent=mode==='login'?t('login'):t('register');document.getElementById('authSwitch').innerHTML=mode==='login'?t('noAccount')+' <a id="authSwLink">'+t('goRegister')+'</a>':t('hasAccount')+' <a id="authSwLink">'+t('goLogin')+'</a>';document.getElementById('authEmail').value='';document.getElementById('authPass').value='';document.getElementById('authMsg').textContent='';document.getElementById('authMsg').className='form-msg';authModal.classList.add('active');document.getElementById('authSwLink').addEventListener('click',()=>openAuth(authMode==='login'?'register':'login'))}
document.getElementById('authClose').addEventListener('click',()=>authModal.classList.remove('active'));
authModal.addEventListener('click',e=>{if(e.target===authModal)authModal.classList.remove('active')});
document.getElementById('authSubmit').addEventListener('click',()=>{const email=normalizeEmail(document.getElementById('authEmail').value),pass=document.getElementById('authPass').value,msg=document.getElementById('authMsg');if(!email||!pass){msg.textContent=t('pleaseLogin');msg.className='form-msg err';return}const users=readStore(STORAGE_KEYS.users,{});try{if(authMode==='register'){if(users[email])throw new Error('Account already exists');users[email]={email,password:pass,createdAt:new Date().toISOString()};writeStore(STORAGE_KEYS.users,users)}else{if(!users[email]&&ADMIN_EMAILS.includes(email)){users[email]={email,password:pass,createdAt:new Date().toISOString()};writeStore(STORAGE_KEYS.users,users)}if(!users[email]||users[email].password!==pass)throw new Error('Invalid email or password')}writeStore(STORAGE_KEYS.session,{email});checkSession();msg.textContent=authMode==='login'?t('loginOk'):t('regOk');msg.className='form-msg ok';setTimeout(()=>{authModal.classList.remove('active');router()},500)}catch(e){msg.textContent=e.message||'Error';msg.className='form-msg err'}});
function doLogout(){localStorage.removeItem(STORAGE_KEYS.session);currentUser=null;isAdmin=false;buildNavRight();if(location.hash==='#/admin')location.hash='#/';else router()}

function buildNavRight(){const el=document.getElementById('navRight'),th=document.documentElement.dataset.theme;let h='<button class="nav-btn" id="themeBtn" title="Theme">'+(th==='dark'?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>':'<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>')+'</button>';const ll={zh:'中文',en:'EN',ms:'BM'};h+='<div class="lang-dd" id="langDD"><button class="nav-btn" id="langBtn">'+ll[currentLang]+' <svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="lang-panel">'+Object.entries(ll).map(([k,v])=>'<button class="lang-opt'+(k===currentLang?' active':'')+'\" data-lang="'+k+'">'+v+'</button>').join('')+'</div></div>';if(currentUser){h+='<button class="nav-btn user-chip" id="profileBtn" title="'+currentUser.email+'"><img class="user-avatar" src="'+currentUser.avatar+'" alt=""><span class="user-email">'+currentUser.email+'</span></button>'}else h+='<button class="nav-btn" id="loginBtn">'+t('login')+'</button>';el.innerHTML=h;document.getElementById('themeBtn').addEventListener('click',toggleTheme);const ld=document.getElementById('langDD');document.getElementById('langBtn').addEventListener('click',e=>{e.stopPropagation();ld.classList.toggle('open')});ld.querySelectorAll('.lang-opt').forEach(b=>b.addEventListener('click',()=>{setLang(b.dataset.lang);ld.classList.remove('open')}));if(!buildNavRight._bound){buildNavRight._bound=true;document.addEventListener('click',e=>{if(!e.target.closest('.lang-dd')){const ld2=document.querySelector('.lang-dd');if(ld2)ld2.classList.remove('open')};if(!e.target.closest('#profileBtn')&&!e.target.closest('#profileMenu')){const pm=document.getElementById('profileMenu');if(pm)pm.classList.remove('open')}})
}
const pm=document.getElementById('profileMenu');if(pm){const adminItem=pm.querySelector('#profileMenuAdmin');if(adminItem)adminItem.style.display=isAdmin?'flex':'none'}
if(currentUser){const pb=document.getElementById('profileBtn');if(pb)pb.addEventListener('click',e=>{e.stopPropagation();document.getElementById('profileMenu').classList.toggle('open')})}else{const lb=document.getElementById('loginBtn');if(lb)lb.addEventListener('click',()=>openAuth('login'))}
const pmMe=document.getElementById('profileMenuMe');if(pmMe)pmMe.onclick=()=>{document.getElementById('profileMenu').classList.remove('open');openProfilePage()};const pmAdmin=document.getElementById('profileMenuAdmin');if(pmAdmin)pmAdmin.onclick=()=>{document.getElementById('profileMenu').classList.remove('open');openNewAdminPanel()};updateAdminFab()}

/* ── CLOUDINARY — direct unsigned upload ─────────────────────────── */
function openCldUpload(cb, opts={}) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (opts.multiple) input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);

    input.addEventListener('change', async () => {
        const files = Array.from(input.files || []);
        document.body.removeChild(input);
        if (!files.length) return;

        for (const file of files) {
            try {
                const fd = new FormData();
                fd.append('file', file);
                fd.append('upload_preset', UPLOAD_PRESET);
                fd.append('folder', 'gallery');
                const res = await fetch(
                    'https://api.cloudinary.com/v1_1/' + CLOUD_NAME + '/image/upload',
                    { method: 'POST', body: fd }
                );
                if (!res.ok) throw new Error('Upload failed: ' + res.status);
                const data = await res.json();
                if (data.secure_url) {
                    // Always pass back the optimized URL
                    const optimizedUrl = optimizeCldUrl(data.secure_url, {w:1200,q:'auto',f:'auto'});
                    cb(optimizedUrl, data);
                }
            } catch (e) {
                console.error('Cloudinary upload error:', e);
                alert('图片上传失败，请检查网络或 Cloudinary 配置。\n' + e.message);
            }
        }
    });

    input.addEventListener('cancel', () => {
        document.body.removeChild(input);
    });

    input.click();
}

/* ── DATA HELPERS ────────────────────────────────────────────────── */
function parseGalleryImages(value){if(Array.isArray(value))return value;if(!value)return[];try{return JSON.parse(value)}catch(e){return[]}}

function isValidImageUrl(url){
    if(!url||typeof url!=='string')return false;
    if(url.includes('your-bucket.supabase.co'))return false;
    if(url.includes('your-bucket'))return false;
    if(url.startsWith('https://example'))return false;
    if(url.length<10)return false;
    return true;
}

function normalizeShoot(s){
    const date=s.date||s.shoot_date||new Date().toISOString().slice(0,10),d=new Date(date);
    return{
        slug:s.slug,id:s.id||s.slug,date,
        year:s.year||s.year_num||d.getFullYear(),
        month:s.month||s.month_num||d.getMonth()+1,
        title:s.title||'',description:s.description||'',
        people:Array.isArray(s.people)?s.people:[],
        equipment:s.equipment||'',drive:s.drive||s.drive_link||'',
        cover:cldCover(s.cover||s.cover_url||DEFAULT_COVER),
        images:[cldFull(s.cover||s.cover_url||DEFAULT_IMAGE)],
        galleryImages:parseGalleryImages(s.galleryImages||s.gallery_images).map(u=>cldFull(u)),
        dateDisplay:fmtDate(date)
    }
}

/* ── SUPABASE SYNC ───────────────────────────────────────────────── */

// Convert local shoot shape → Supabase shoots row shape
function shootToSbRow(s){
    return{
        id:s.id||s.slug,
        slug:s.slug,
        shoot_date:s.date,
        year_num:s.year,
        month_num:s.month,
        title:s.title||'',
        description:s.description||'',
        people:s.people||[],
        equipment:s.equipment||'',
        drive_link:s.drive||'',
        cover_url:s.cover||DEFAULT_COVER,
        gallery_images:JSON.stringify(s.galleryImages||[])
    };
}

// Convert Supabase row → local shoot shape
function sbRowToShoot(r){
    return normalizeShoot({
        id:r.id||r.slug,slug:r.slug,date:r.shoot_date,
        year_num:r.year_num,month_num:r.month_num,
        title:r.title,description:r.description,
        people:Array.isArray(r.people)?r.people:[],
        equipment:r.equipment,drive_link:r.drive_link,
        cover_url:r.cover_url,gallery_images:r.gallery_images
    });
}

// Convert local slide → Supabase home_slides row
function slideToSbRow(s,i){
    return{
        id:s.id||('slide-'+i),
        image_url:s.image_url,
        caption:s.caption||'',
        sub:s.sub||'',
        sort_order:s.sort_order!==undefined?s.sort_order:i
    };
}

// Push any shoots/slides from localStorage to Supabase (one-time migration)
async function migrateLocalDataToSupabase(){
    try{
        const localShoots=readStore(STORAGE_KEYS.shoots,[]);
        if(localShoots.length){
            console.log('[migrate] pushing',localShoots.length,'local shoots to Supabase…');
            await sbUpsert('shoots',localShoots.map(s=>shootToSbRow(normalizeShoot(s))));
            localStorage.removeItem(STORAGE_KEYS.shoots);
            console.log('[migrate] shoots done');
        }
        const localSlides=readStore(STORAGE_KEYS.slides,[]).filter(s=>isValidImageUrl(s.image_url));
        if(localSlides.length){
            console.log('[migrate] pushing',localSlides.length,'local slides to Supabase…');
            await sbUpsert('home_slides',localSlides.map(slideToSbRow));
            localStorage.removeItem(STORAGE_KEYS.slides);
            console.log('[migrate] slides done');
        }
    }catch(e){
        console.warn('[migrate] migration error (will still load from Supabase):',e);
    }
}

// Load shoots from Supabase into SHOOTS[]
async function loadShootsFromSupabase(){
    const rows=await sbGet('shoots','select=*&order=shoot_date.desc');
    SHOOTS=rows.map(sbRowToShoot).sort((a,b)=>new Date(a.date)-new Date(b.date));
    monthSet=new Set(SHOOTS.map(s=>s.year+'-'+s.month));
    buildNav();
}

// Save a single shoot to Supabase
async function saveShootToSupabase(shoot){
    await sbUpsert('shoots',[shootToSbRow(shoot)]);
}

// Delete a shoot from Supabase
async function deleteShootFromSupabase(slug){
    await sbDelete('shoots','slug=eq.'+encodeURIComponent(slug));
}

// In-memory SHOOTS list helpers (kept for compatibility)
function saveShoots(){
    // Persist all current SHOOTS to Supabase
    return sbUpsert('shoots',SHOOTS.map(s=>shootToSbRow(s))).catch(e=>console.error('saveShoots error',e));
}

/* ── HOME SLIDES ─────────────────────────────────────────────────── */
let HOME_SLIDES=[];

async function loadSlidesFromSupabase(){
    const rows=await sbGet('home_slides','select=*&order=sort_order.asc');
    HOME_SLIDES=rows.filter(s=>isValidImageUrl(s.image_url)).map(s=>({
        id:s.id,
        image_url:cldFull(s.image_url),
        caption:s.caption||'',
        sub:s.sub||'',
        sort_order:s.sort_order
    }));
    if(!HOME_SLIDES.length){
        HOME_SLIDES=SHOOTS.slice(0,5).map(s=>({id:'slide-'+s.slug,image_url:s.cover,caption:s.title,sub:''}));
    }
}

async function saveSlidesToSupabase(){
    // Delete all, then re-insert with updated sort_order
    try{
        await sbDelete('home_slides','id=neq.___none___');
    }catch(e){/* ignore if table empty */}
    if(HOME_SLIDES.length){
        await sbUpsert('home_slides',HOME_SLIDES.map(slideToSbRow));
    }
}

function saveHomeSlides(){return saveSlidesToSupabase().catch(e=>console.error('saveHomeSlides error',e))}

/* ── INIT & REFRESH ──────────────────────────────────────────────── */
async function refreshSite(){
    // 1. Migrate any localStorage data to Supabase first (one-time)
    await migrateLocalDataToSupabase();
    // 2. Load fresh data from Supabase
    await loadShootsFromSupabase();
    await loadSlidesFromSupabase();
    router();
}

function shootsByMonth(y,m){return SHOOTS.filter(s=>s.year===y&&s.month===m)}
function shootBySlug(sl){return SHOOTS.find(s=>s.slug===sl)}

/* NAV */
function buildNav(){const c=document.getElementById('navCenter');c.innerHTML=YEARS.map(y=>'<div class="nav-dd" data-year="'+y+'"><button class="nav-trigger">'+y+' <svg viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="dd-panel">'+[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>{const has=monthSet.has(y+'-'+m);return'<button class="dd-month'+(has?' has-data':'')+'\" data-year="'+y+'" data-month="'+m+'">'+mName(m)+'</button>'}).join('')+'</div></div>').join('');c.querySelectorAll('.nav-dd').forEach(dd=>{let tm;dd.addEventListener('mouseenter',()=>{clearTimeout(tm);dd.classList.add('open')});dd.addEventListener('mouseleave',()=>{tm=setTimeout(()=>dd.classList.remove('open'),180)});dd.querySelector('.nav-trigger').addEventListener('click',e=>{e.preventDefault();const w=dd.classList.contains('open');c.querySelectorAll('.nav-dd').forEach(d=>d.classList.remove('open'));if(!w)dd.classList.add('open')})});c.querySelectorAll('.dd-month.has-data').forEach(btn=>btn.addEventListener('click',()=>{c.querySelectorAll('.nav-dd').forEach(d=>d.classList.remove('open'));location.hash='#/month/'+btn.dataset.year+'/'+btn.dataset.month}));if(!buildNav._bound){buildNav._bound=true;document.addEventListener('click',e=>{if(!e.target.closest('.nav-dd')){const c2=document.getElementById('navCenter');if(c2)c2.querySelectorAll('.nav-dd').forEach(d=>d.classList.remove('open'))}})}}

/* LIGHTBOX */
let lbImgs=[],lbIdx=0;
function openLB(imgs,idx){lbImgs=imgs;lbIdx=idx;const lb=document.getElementById('lightbox');document.getElementById('lbImg').src=imgs[idx];document.getElementById('lbCounter').textContent=(idx+1)+' / '+imgs.length;lb.classList.add('open');document.body.style.overflow='hidden'}
function closeLB(){document.getElementById('lightbox').classList.remove('open');document.body.style.overflow=''}
function lbNav(d){lbIdx=(lbIdx+d+lbImgs.length)%lbImgs.length;document.getElementById('lbImg').src=lbImgs[lbIdx];document.getElementById('lbCounter').textContent=(lbIdx+1)+' / '+lbImgs.length}
document.getElementById('lbClose').addEventListener('click',closeLB);
document.getElementById('lbPrev').addEventListener('click',e=>{e.stopPropagation();lbNav(-1)});
document.getElementById('lbNext').addEventListener('click',e=>{e.stopPropagation();lbNav(1)});
document.getElementById('lightbox').addEventListener('click',e=>{if(e.target.id==='lightbox')closeLB()});

/* ROUTER */
let homeSliderTimer=null;
function router(){activeObservers.forEach(o=>o.disconnect());activeObservers=[];closeDet();closeLB();if(homeSliderTimer){clearInterval(homeSliderTimer);homeSliderTimer=null}const h=location.hash||'#/',mm=h.match(/^#\/month\/(\d{4})\/(\d{1,2})$/),sm=h.match(/^#\/shoot\/(.+)$/);if(h==='#/admin'){if(!currentUser){location.hash='#/';return}if(!isAdmin){location.hash='#/';return}renderAdmin()}else if(mm)renderMonth(+mm[1],+mm[2]);else if(sm)renderDetail(sm[1]);else renderHome();window.scrollTo({top:0,behavior:'instant'})}
window.addEventListener('hashchange',router);

/* HOME SLIDER */
let sliderIdx=0,sliderTouchX=0;
function renderHome(){
    const slides=HOME_SLIDES.length?HOME_SLIDES:SHOOTS.slice(0,5).map(s=>({image_url:s.cover,caption:s.title,sub:''}));
    if(!slides.length){app.innerHTML='<div class="empty" style="padding-top:200px"><p>'+t('noData')+'</p></div>';return}
    const slideHTML=slides.map((s,i)=>'<div class="slider-slide'+(i===0?' active':'')+'\" data-index="'+i+'"><img class="slide-bg" src="'+s.image_url+'" alt="'+s.caption+'" draggable="false"><div class="slider-overlay"></div><div class="slider-content"><h1 class="slider-title">'+s.caption+'</h1><p class="slider-meta">'+s.sub+'</p></div></div>').join('');
    const dots=slides.map((_,i)=>'<button class="slider-dot'+(i===0?' active':'')+'\" data-index="'+i+'"></button>').join('');
    app.innerHTML='<div class="home-slider" id="homeSlider"><div class="slider-progress" id="sliderProgress"></div>'+slideHTML+'<div class="slider-dots">'+dots+'</div><div class="slider-hint">SCROLL ↓</div></div><div class="home-disclaimer">如果发现照片有点怪，那只表明该相册还未整理</div>';
    const sliderEl=document.getElementById('homeSlider');
    const slideEls=sliderEl.querySelectorAll('.slider-slide');
    const dotEls=sliderEl.querySelectorAll('.slider-dot');
    const progEl=document.getElementById('sliderProgress');
    function goSlide(idx){sliderIdx=(idx+slides.length)%slides.length;slideEls.forEach((s,i)=>s.classList.toggle('active',i===sliderIdx));dotEls.forEach((d,i)=>d.classList.toggle('active',i===sliderIdx));progEl.style.transition='none';progEl.style.width='0%';requestAnimationFrame(()=>{progEl.style.transition='width 10s linear';progEl.style.width='100%'})}
    dotEls.forEach(d=>d.addEventListener('click',()=>{goSlide(+d.dataset.index);resetAuto()}));
    sliderEl.addEventListener('touchstart',e=>{sliderTouchX=e.changedTouches[0].screenX},{passive:true});
    sliderEl.addEventListener('touchend',e=>{const diff=sliderTouchX-e.changedTouches[0].screenX;if(Math.abs(diff)>50){goSlide(sliderIdx+(diff>0?1:-1));resetAuto()}},{passive:true});
    function resetAuto(){clearInterval(homeSliderTimer);homeSliderTimer=setInterval(()=>goSlide(sliderIdx+1),10000)}
    resetAuto();goSlide(0)
}

/* MONTH PAGE */
function adminCardControls(s){return isAdmin?'<div class="gal-card-admin"><button data-admin-edit="'+s.slug+'" title="'+t('edit')+'"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button></div>':''}
function renderMonth(year,month){const list=shootsByMonth(year,month),first=list[0];app.innerHTML='<div class="breadcrumb page-enter"><a href="#/">'+t('home')+'</a><span class="sep">/</span><span>'+year+' '+mName(month)+'</span></div><div class="month-layout page-enter"><div class="month-left"><div class="month-back" id="monthBack"><svg viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'+t('home')+'</div><h1 class="month-title">'+year+'<br>'+mName(month)+'</h1><div class="month-count">'+list.length+' '+t('shoots')+'</div><div class="gal-info-panel" id="galInfoPanel"><div class="gal-info-eyebrow" id="infoEyebrow"><span class="dot"></span><span id="infoDate">'+(first?first.dateDisplay:'')+'</span></div><div class="gal-info-title" id="infoTitle">'+(first?first.title:'')+'</div><div class="gal-info-date" id="infoDateLabel">'+(first?'01 / '+String(list.length).padStart(2,'0'):'')+'</div><div class="gal-info-people" id="infoPeople">'+(first&&first.people.length?first.people.join(' · '):'')+'</div><div class="gal-info-desc" id="infoDesc">'+(first?first.description:'')+'</div><div class="gal-info-equip" id="infoEquip"><svg viewBox="0 0 24 24" fill="none"><rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="17" r="1.5" fill="currentColor"/><line x1="10" y1="5" x2="14" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span>'+(first?first.equipment||'—':'—')+'</span></div><div class="gal-info-hint">'+t('clickHint')+'</div></div></div><div class="month-right"><div class="gal-scroll" id="galScroll"><div class="gal-photo-list" id="galPhotoList">'+(list.length?list.map((s,i)=>'<div class="gal-photo-card" data-index="'+i+'">'+adminCardControls(s)+'<img src="'+s.cover+'" alt="'+s.title+'" loading="lazy"><div class="card-hover-tag">'+s.title+'</div></div>').join(''):'<div class="empty"><p>'+t('noData')+'</p></div>')+'</div></div></div></div>';document.getElementById('monthBack').addEventListener('click',()=>location.hash='#/');document.querySelectorAll('[data-admin-edit]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openEdit(shootBySlug(b.dataset.adminEdit))}));if(list.length)requestAnimationFrame(()=>initMonthGallery(list))}

let _hovering=false;
function initMonthGallery(shoots){const scrollEl=document.getElementById('galScroll'),listEl=document.getElementById('galPhotoList'),cards=document.querySelectorAll('.gal-photo-card');if(!cards.length)return;let scrollIdx=0;const revealObs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')})},{threshold:.15,rootMargin:'0px 0px -40px 0px',root:scrollEl});cards.forEach(c=>revealObs.observe(c));activeObservers.push(revealObs);const activeObs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting&&e.intersectionRatio>.4){const idx=+e.target.dataset.index;if(idx!==scrollIdx){scrollIdx=idx;if(!_hovering)updateInfoPanel(idx,shoots);cards.forEach((c,i)=>c.classList.toggle('active-card',i===idx))}}})},{threshold:[.4,.6],root:scrollEl});cards.forEach(c=>activeObs.observe(c));activeObservers.push(activeObs);cards[0]?.classList.add('active-card','visible');cards.forEach(card=>{card.addEventListener('mouseenter',()=>{_hovering=true;listEl.classList.add('hovering');updateInfoPanel(+card.dataset.index,shoots)});card.addEventListener('mouseleave',()=>{_hovering=false;listEl.classList.remove('hovering');updateInfoPanel(scrollIdx,shoots)});card.addEventListener('click',()=>location.hash='#/shoot/'+shoots[+card.dataset.index].slug)})}

function updateInfoPanel(idx,shoots){const s=shoots[idx],titleEl=document.getElementById('infoTitle'),dateLabelEl=document.getElementById('infoDateLabel'),eyebrowEl=document.getElementById('infoEyebrow');if(!titleEl)return;titleEl.classList.add('sliding-out');dateLabelEl.classList.add('sliding-out');eyebrowEl.classList.add('sliding-out');setTimeout(()=>{document.getElementById('infoDate').textContent=s.dateDisplay;titleEl.textContent=s.title;dateLabelEl.textContent=String(idx+1).padStart(2,'0')+' / '+String(shoots.length).padStart(2,'0');document.getElementById('infoPeople').textContent=s.people.length?s.people.join(' · '):'';document.getElementById('infoDesc').textContent=s.description;document.querySelector('#infoEquip span').textContent=s.equipment||'—';titleEl.classList.remove('sliding-out');titleEl.classList.add('sliding-in');dateLabelEl.classList.remove('sliding-out');dateLabelEl.classList.add('sliding-in');eyebrowEl.classList.remove('sliding-out');eyebrowEl.classList.add('sliding-in');requestAnimationFrame(()=>requestAnimationFrame(()=>{titleEl.classList.remove('sliding-in');dateLabelEl.classList.remove('sliding-in');eyebrowEl.classList.remove('sliding-in')}))},200)}

/* DETAIL OVERLAY */
const detOverlay=document.createElement('div');
detOverlay.className='detail-overlay';detOverlay.id='detOverlay';
detOverlay.innerHTML='<div class="det-top-bar"><button class="det-back" id="detBack"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg><span data-i18n="back">'+t('back')+'</span></button><span class="det-cat" id="detCat"></span><div style="width:70px"></div></div><div class="det-body"><div class="det-hero"><img id="detHeroImg" src="" alt=""></div><div class="det-content"><h2 id="detName"></h2><div class="det-zh" id="detZh"></div><div class="det-tags" id="detTags"></div><div class="det-quote" id="detQuote"></div><p class="det-desc" id="detDesc"></p><div class="det-actions"><button class="det-btn" id="detCloseBtn"><span data-i18n="close">'+t('close')+'</span></button><a class="det-btn primary" id="detDriveBtn" href="#" target="_blank" rel="noopener noreferrer"><span data-i18n="download">'+t('download')+'</span> <svg viewBox="0 0 24 24" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></a></div></div><div class="det-gallery" id="detGallery"></div></div>';
document.body.appendChild(detOverlay);

function openDet(shoot){
    document.getElementById('detCat').textContent=shoot.equipment||'';
    document.getElementById('detHeroImg').src=cldFull(shoot.cover)||DEFAULT_IMAGE;
    document.getElementById('detHeroImg').alt=shoot.title;
    document.getElementById('detName').textContent=shoot.title;
    document.getElementById('detZh').textContent=shoot.dateDisplay;
    document.getElementById('detTags').innerHTML=(shoot.people.length?shoot.people.map(p=>'<span>'+p+'</span>').join(''):'')+'<span>'+shoot.dateDisplay+'</span>'+(shoot.equipment?'<span>'+shoot.equipment+'</span>':'');
    document.getElementById('detQuote').textContent='"'+shoot.description+'"';
    document.getElementById('detDesc').textContent=shoot.description;
    const driveBtn=document.getElementById('detDriveBtn');
    if(shoot.drive){driveBtn.href=shoot.drive;driveBtn.style.display=''}else driveBtn.style.display='none';
    const gal=document.getElementById('detGallery');
    const gi=(shoot.galleryImages||[]).map(u=>cldFull(u));
    if(gi.length){
        gal.innerHTML='<div class="det-gallery-head"><h3>'+t('galleryTitle')+'</h3><span>'+gi.length+' '+t('photos')+'</span></div><div class="det-gallery-grid">'+gi.map((url,i)=>'<div class="det-gal-item" data-idx="'+i+'"><img src="'+url+'" alt="" loading="lazy"></div>').join('')+'</div>';
        requestAnimationFrame(()=>{
            const items=gal.querySelectorAll('.det-gal-item');
            items.forEach((item,i)=>{setTimeout(()=>item.classList.add('vis'),800+i*80);item.addEventListener('click',()=>openLB(gi,i))})
        })
    }else{
        gal.innerHTML='<div class="det-gallery-head"><h3>'+t('galleryTitle')+'</h3></div><div class="det-gallery-empty">'+t('noGallery')+'</div>'
    }
    detOverlay.classList.add('open');document.body.style.overflow='hidden';

    const existingHint=document.getElementById('detScrollHint');
    if(existingHint)existingHint.remove();
    const scrollHint=document.createElement('div');
    scrollHint.className='det-scroll-hint';scrollHint.id='detScrollHint';
    scrollHint.innerHTML='<span class="det-scroll-hint-text">下滑查看更多</span><svg class="det-scroll-hint-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
    detOverlay.appendChild(scrollHint);

    const detBody=detOverlay.querySelector('.det-body');
    const detHero=detOverlay.querySelector('.det-hero');
    if(detBody&&detHero){
        detBody.scrollTop=0;
        scrollHint.classList.add('hidden');
        setTimeout(()=>{scrollHint.classList.remove('hidden');},1200);
        const onScroll=()=>{const heroH=detHero.offsetHeight;if(detBody.scrollTop>=heroH*0.85){scrollHint.classList.add('hidden')}else{scrollHint.classList.remove('hidden')}};
        detBody.addEventListener('scroll',onScroll);
        const origClose=detOverlay._scrollCleanup;if(origClose)origClose();
        detOverlay._scrollCleanup=()=>detBody.removeEventListener('scroll',onScroll);
    }
}

function closeDet(){
    if(!detOverlay.classList.contains('open'))return;
    detOverlay.classList.remove('open');document.body.style.overflow='';
    if(detOverlay._scrollCleanup){detOverlay._scrollCleanup();detOverlay._scrollCleanup=null;}
    const hm=location.hash.match(/^#\/shoot\/(.+)$/);
    if(hm){const s=shootBySlug(hm[1]);location.hash=s?'#/month/'+s.year+'/'+s.month:'#/'}
}

document.getElementById('detBack').addEventListener('click',closeDet);
document.getElementById('detCloseBtn').addEventListener('click',closeDet);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeLB();closeDet();closeAdminCenter();closeNewAdminPanel()}});

function renderDetail(slug){
    const s=shootBySlug(slug);
    if(!s){app.innerHTML='<div class="empty page-enter" style="padding-top:140px"><p>'+t('notFound')+'</p></div>';return}
    app.innerHTML='';openDet(s)
}

/* ADMIN CENTER */
let adminPendingPhotoUrl='';
function updateAdminFab(){const fab=document.getElementById('adminFab');if(fab)fab.classList.toggle('show',!!isAdmin)}
function showAdminMsg(type,msg){const ok=document.getElementById('adminCenterOk'),err=document.getElementById('adminCenterErr');if(!ok||!err)return;ok.classList.remove('show');err.classList.remove('show');const el=type==='ok'?ok:err;el.textContent=msg;el.classList.add('show');if(type==='ok')setTimeout(()=>el.classList.remove('show'),2200)}
function setAdminPanel(panel){document.querySelectorAll('.admin-center-tab').forEach(t=>t.classList.toggle('on',t.dataset.panel===panel));document.querySelectorAll('.admin-center-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+panel))}
function resetAdminUpload(){adminPendingPhotoUrl='';const zone=document.getElementById('adminUploadZone'),label=document.getElementById('adminUploadLabel');if(zone)zone.classList.remove('has-img');if(label)label.innerHTML='<em>点击上传</em> 或选择 Cloudinary 图片<br><span style="font-size:9px;opacity:.6;margin-top:.3rem;display:inline-block">连接 Cloudinary · 使用原图</span>'}
function slugifyTitle(text){const base=(text||'album').toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fa5]+/g,'-').replace(/^-+|-+$/g,'')||'album';let slug=base,i=2;while(SHOOTS.some(s=>s.slug===slug)){slug=base+'-'+i++;}return slug}
function fillAdminAlbumSelect(){const sel=document.getElementById('adminPhotoAlbum');if(!sel)return;sel.innerHTML='<option value="__new__">新建相册</option>'+SHOOTS.map(s=>'<option value="'+s.slug+'">'+s.title+' · '+s.dateDisplay+'</option>').join('')}
function openAdminCenter(){if(!isAdmin){openAuth('login');return}fillAdminAlbumSelect();renderAdminAlbumList();renderHomeSlidesAdmin();resetAdminUpload();document.getElementById('adminCenterErr')?.classList.remove('show');document.getElementById('adminCenterOk')?.classList.remove('show');const dateEl=document.getElementById('adminNewAlbumDate');if(dateEl&&!dateEl.value)dateEl.value=new Date().toISOString().slice(0,10);document.getElementById('adminCenter').classList.add('on');document.body.style.overflow='hidden'}
function closeAdminCenter(){document.getElementById('adminCenter').classList.remove('on');document.body.style.overflow=''}
function renderAdminAlbumList(){const el=document.getElementById('adminAlbumList');if(!el)return;if(!SHOOTS.length){el.innerHTML='<div class="admin-list-meta">暂无相册，先添加一张照片或新建相册。</div>';return}el.innerHTML=SHOOTS.map(s=>'<div class="admin-list-row"><img src="'+s.cover+'" alt=""><div class="admin-list-main"><div class="admin-list-title">'+s.title+'</div><div class="admin-list-meta">'+s.dateDisplay+' · '+(s.galleryImages?s.galleryImages.length:0)+' '+t('photos')+' · '+(s.equipment||'—')+'</div></div><div class="admin-list-actions"><button class="act-btn" data-album-edit="'+s.slug+'">'+t('edit')+'</button><button class="act-btn" data-album-cover="'+s.slug+'">'+t('batchCover')+'</button><button class="act-btn del" data-album-del="'+s.slug+'">'+t('delete')+'</button></div></div>').join('');
el.querySelectorAll('[data-album-edit]').forEach(b=>b.addEventListener('click',()=>openEdit(shootBySlug(b.dataset.albumEdit))));
el.querySelectorAll('[data-album-cover]').forEach(b=>b.addEventListener('click',()=>openCldUpload(url=>{SHOOTS=SHOOTS.map(s=>s.slug===b.dataset.albumCover?{...s,cover:url,images:[url]}:s);saveShoots();refreshSite();renderAdminAlbumList();showAdminMsg('ok','封面已更新')})));
el.querySelectorAll('[data-album-del]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm(t('confirmDel')))return;await deleteShootFromSupabase(b.dataset.albumDel);SHOOTS=SHOOTS.filter(s=>s.slug!==b.dataset.albumDel);refreshSite();renderAdminAlbumList();fillAdminAlbumSelect();showAdminMsg('ok','相册已删除')}))}

async function addPendingPhotoToAlbum(){if(!adminPendingPhotoUrl){showAdminMsg('err','请先上传照片');return}const target=document.getElementById('adminPhotoAlbum').value;if(target==='__new__'){const title=document.getElementById('adminNewAlbumTitle').value.trim()||'Untitled';const date=document.getElementById('adminNewAlbumDate').value||new Date().toISOString().slice(0,10);const d=new Date(date);const slug=slugifyTitle(title);const row=normalizeShoot({id:slug,slug,title,date,year:d.getFullYear(),month:d.getMonth()+1,description:'',people:[],equipment:'',drive:'',cover:adminPendingPhotoUrl,galleryImages:[adminPendingPhotoUrl]});SHOOTS=[row,...SHOOTS]}else{SHOOTS=SHOOTS.map(s=>s.slug===target?{...s,galleryImages:[...(s.galleryImages||[]),adminPendingPhotoUrl]}:s)}await saveShoots();refreshSite();fillAdminAlbumSelect();renderAdminAlbumList();resetAdminUpload();document.getElementById('adminNewAlbumTitle').value='';showAdminMsg('ok','照片已添加')}

/* ADMIN */
function renderAdmin(){if(!currentUser){app.innerHTML='<div class="empty page-enter" style="padding-top:140px"><p>'+t('pleaseLogin')+'</p></div>';return}if(!isAdmin){app.innerHTML='<div class="empty page-enter" style="padding-top:140px"><p>'+t('noPermission')+'</p></div>';return}renderHome();setTimeout(openAdminCenter,0)}
function renderAdminRows(){const tb=document.getElementById('aTbody');tb.innerHTML=SHOOTS.map(s=>'<tr data-slug="'+s.slug+'"><td><input type="checkbox" class="a-chk" data-slug="'+s.slug+'"></td><td><img class="th" src="'+s.cover+'" alt=""></td><td>'+s.title+'</td><td style="font-family:\'DM Mono\',monospace;font-size:.7rem;color:var(--text-secondary)">'+s.dateDisplay+'</td><td style="font-size:.75rem;color:var(--text-secondary)">'+s.equipment+'</td><td style="font-size:.7rem;color:var(--text-dim)">'+(s.galleryImages?s.galleryImages.length:0)+'</td><td><div style="display:flex;gap:.5rem"><button class="act-btn" data-act="edit" data-slug="'+s.slug+'">'+t('edit')+'</button><button class="act-btn del" data-act="del" data-slug="'+s.slug+'">'+t('delete')+'</button></div></td></tr>').join('');tb.querySelectorAll('.a-chk').forEach(c=>c.addEventListener('change',updSel));tb.querySelectorAll('[data-act="edit"]').forEach(b=>b.addEventListener('click',()=>openEdit(shootBySlug(b.dataset.slug))));tb.querySelectorAll('[data-act="del"]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm(t('confirmDel')))return;await deleteShootFromSupabase(b.dataset.slug);SHOOTS=SHOOTS.filter(s=>s.slug!==b.dataset.slug);refreshSite()}))}
function getSel(){return[...document.querySelectorAll('.a-chk:checked')].map(c=>c.dataset.slug)}
function updSel(){const n=getSel(),el=document.getElementById('selCount');if(el)el.textContent=n.length?n.length+' '+t('selected'):''}
async function batchDel(){const sl=getSel();if(!sl.length||!confirm(sl.length+' '+t('confirmDel')))return;for(const slug of sl)await deleteShootFromSupabase(slug);SHOOTS=SHOOTS.filter(s=>!sl.includes(s.slug));refreshSite()}
function batchCov(){const sl=getSel();if(!sl.length)return;openCldUpload(url=>{SHOOTS=SHOOTS.map(s=>sl.includes(s.slug)?{...s,cover:url,images:[url]}:s);saveShoots();refreshSite()})}

/* HOME SLIDES ADMIN */
function renderHomeSlidesAdmin(){
    const el=document.getElementById('homeSlidesAdmin');if(!el)return;
    if(!HOME_SLIDES.length){el.innerHTML='<div style="font-size:.75rem;color:var(--text-dim);font-family:\'DM Mono\',monospace">暂无幻灯片，点击下方按钮添加</div>';return}
    el.innerHTML=HOME_SLIDES.map((s,i)=>'<div style="display:flex;align-items:center;gap:1rem;padding:.8rem;background:var(--surface);border:1px solid var(--border);border-radius:12px"><img src="'+s.image_url+'" style="width:100px;height:60px;object-fit:cover;border-radius:6px;flex-shrink:0"><div style="flex:1;min-width:0"><div style="font-size:.85rem;color:var(--text-primary);margin-bottom:.3rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(s.caption||'(无标题)')+'</div><div style="font-size:.7rem;color:var(--text-dim);font-family:\'DM Mono\',monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(s.sub||'')+'</div></div><div style="display:flex;gap:.5rem;flex-shrink:0">'+(i>0?'<button class="act-btn" data-slidemove="up" data-idx="'+i+'">↑</button>':'')+(i<HOME_SLIDES.length-1?'<button class="act-btn" data-slidemove="down" data-idx="'+i+'">↓</button>':'')+'<button class="act-btn" data-slideedit="'+i+'">编辑</button><button class="act-btn del" data-slidedel="'+i+'">删除</button></div></div>').join('');
    el.querySelectorAll('[data-slideedit]').forEach(b=>b.addEventListener('click',()=>openSlideEdit(+b.dataset.slideedit)));
    el.querySelectorAll('[data-slidedel]').forEach(b=>b.addEventListener('click',()=>{const idx=+b.dataset.slidedel;if(!confirm('确认删除该幻灯片？'))return;HOME_SLIDES.splice(idx,1);saveHomeSlides();renderHomeSlidesAdmin()}));
    el.querySelectorAll('[data-slidemove]').forEach(b=>b.addEventListener('click',()=>{const idx=+b.dataset.idx,dir=b.dataset.slidemove,swapIdx=dir==='up'?idx-1:idx+1;[HOME_SLIDES[idx],HOME_SLIDES[swapIdx]]=[HOME_SLIDES[swapIdx],HOME_SLIDES[idx]];saveSlideOrder();renderHomeSlidesAdmin()}));
}
function saveSlideOrder(){HOME_SLIDES=HOME_SLIDES.map((s,i)=>({...s,sort_order:i}));saveHomeSlides()}
function openSlideEdit(idx){
    const s=idx!==null?HOME_SLIDES[idx]:null;
    const overlay=document.createElement('div');
    overlay.className='edit-overlay active';
    overlay.style.cssText='position:fixed;inset:0;background:var(--overlay);display:flex;align-items:center;justify-content:center;z-index:3000;backdrop-filter:blur(8px)';
    overlay.innerHTML='<div class="edit-box">'
    +'<h2 style="font-family:\'Cormorant Garamond\',serif;font-size:1.8rem;font-weight:500;margin-bottom:1.5rem">'+(s?'编辑幻灯片':'新增幻灯片')+'</h2>'
    +'<div style="margin-bottom:1.5rem"><div class="edit-cover-area" id="slideImgArea" style="aspect-ratio:16/9;margin-bottom:1rem;position:relative">'
    +'<img id="slideImgPreview" src="'+(s?s.image_url:'')+'" style="width:100%;height:100%;object-fit:cover;display:'+(s?'block':'none')+'">'
    +'<div class="cover-empty" id="slideImgEmpty" style="display:'+(s?'none':'flex')+'"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><path d="M21 15l-5-5L5 21" stroke="currentColor"/></svg>点击上传图片</div>'
    +'</div>'
    +'<div class="edit-cover-actions"><button class="upload-btn" id="slideUploadBtn"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>上传图片</button><button class="upload-btn" id="slideUrlToggle"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>粘贴链接</button></div>'
    +'<div id="slideUrlGroup" style="display:none;margin-top:.8rem"><input class="form-input" id="slideUrlInput" placeholder="图片 URL" value="'+(s?s.image_url:'')+'"</div></div>'
    +'<div class="form-group"><label class="form-label">标题文字</label><input class="form-input" id="slideCaptionInput" value="'+(s?s.caption:'')+'" placeholder="首页幻灯片标题"></div>'
    +'<div class="form-group"><label class="form-label">副标题</label><input class="form-input" id="slideSubInput" value="'+(s?s.sub:'')+'" placeholder="副标题（可选）"></div>'
    +'<div class="edit-actions">'
    +'<button class="a-btn" id="slideCancelBtn">取消</button>'
    +'<button class="a-btn" id="slideSaveBtn" style="background:var(--accent);color:var(--bg);border-color:var(--accent);font-weight:bold;">保存</button>'
    +'</div></div>';
    document.body.appendChild(overlay);
    let currentImgUrl=s?s.image_url:'';
    overlay.querySelector('#slideImgArea').addEventListener('click',()=>openCldUpload(url=>{currentImgUrl=url;overlay.querySelector('#slideImgPreview').src=url;overlay.querySelector('#slideImgPreview').style.display='block';overlay.querySelector('#slideImgEmpty').style.display='none';overlay.querySelector('#slideUrlInput').value=url}));
    overlay.querySelector('#slideUploadBtn').addEventListener('click',()=>openCldUpload(url=>{currentImgUrl=url;overlay.querySelector('#slideImgPreview').src=url;overlay.querySelector('#slideImgPreview').style.display='block';overlay.querySelector('#slideImgEmpty').style.display='none';overlay.querySelector('#slideUrlInput').value=url}));
    overlay.querySelector('#slideUrlToggle').addEventListener('click',()=>{const g=overlay.querySelector('#slideUrlGroup');g.style.display=g.style.display==='none'?'block':'none'});
    overlay.querySelector('#slideUrlInput').addEventListener('input',function(){currentImgUrl=this.value;overlay.querySelector('#slideImgPreview').src=this.value;overlay.querySelector('#slideImgPreview').style.display=this.value?'block':'none';overlay.querySelector('#slideImgEmpty').style.display=this.value?'none':'flex'});
    overlay.querySelector('#slideCancelBtn').addEventListener('click',()=>overlay.remove());
    overlay.querySelector('#slideSaveBtn').addEventListener('click',async()=>{
        const imgUrl=currentImgUrl||overlay.querySelector('#slideUrlInput').value.trim();
        const caption=overlay.querySelector('#slideCaptionInput').value.trim();
        const sub=overlay.querySelector('#slideSubInput').value.trim();
        if(!imgUrl)return;
        if(idx!==null)HOME_SLIDES[idx]={...HOME_SLIDES[idx],image_url:cldFull(imgUrl),caption,sub};
        else HOME_SLIDES.push({id:'slide-'+Date.now(),image_url:cldFull(imgUrl),caption,sub,sort_order:HOME_SLIDES.length});
        await saveSlideOrder();
        overlay.remove();renderHomeSlidesAdmin();router();
    });
    overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove()});
}

/* EDIT MODAL */
function openEdit(shoot){
    const isNew=!shoot;
    document.getElementById('editTitle').textContent=isNew?t('newShootTitle'):t('editShootTitle');
    document.getElementById('editOrigSlug').value=shoot?shoot.slug:'';
    document.getElementById('editSlug').value=shoot?shoot.slug:'';
    document.getElementById('editSlug').readOnly=!isNew;
    document.getElementById('editTitleInput').value=shoot?shoot.title:'';
    document.getElementById('editDateInput').value=shoot?shoot.date:'';
    document.getElementById('editDescInput').value=shoot?shoot.description||'':'';
    document.getElementById('editPeopleInput').value=shoot?shoot.people.join(', '):'';
    document.getElementById('editEquipInput').value=shoot?shoot.equipment||'':'';
    document.getElementById('editDriveInput').value=shoot?shoot.drive||'':'';
    document.getElementById('editCoverInput').value=shoot?shoot.cover||'':'';
    document.getElementById('editCoverImg').src=shoot?shoot.cover:'';
    document.getElementById('coverEmpty').style.display=shoot&&shoot.cover?'none':'flex';
    document.getElementById('coverUrlGroup').style.display='none';
    editGalleryImages=shoot&&shoot.galleryImages?[...shoot.galleryImages]:[];
    renderEditGallery();updateI18n();
    document.getElementById('editOverlay').classList.add('active')
}
function renderEditGallery(){const el=document.getElementById('editGallery');el.innerHTML=editGalleryImages.map((url,i)=>'<div class="edit-gallery-thumb"><img src="'+url+'" alt=""><button class="edit-gallery-remove" data-idx="'+i+'">&times;</button></div>').join('');el.querySelectorAll('.edit-gallery-remove').forEach(b=>b.addEventListener('click',()=>{editGalleryImages.splice(+b.dataset.idx,1);renderEditGallery()}))}
document.getElementById('editCoverArea').addEventListener('click',e=>{if(e.target.closest('.upload-btn')||e.target.closest('#coverUrlGroup'))return;openCldUpload(url=>{document.getElementById('editCoverInput').value=url;document.getElementById('editCoverImg').src=url;document.getElementById('coverEmpty').style.display='none'})});
document.getElementById('editUploadBtn').addEventListener('click',e=>{e.stopPropagation();openCldUpload(url=>{document.getElementById('editCoverInput').value=url;document.getElementById('editCoverImg').src=url;document.getElementById('coverEmpty').style.display='none'})});
document.getElementById('editUrlToggle').addEventListener('click',e=>{e.stopPropagation();const g=document.getElementById('coverUrlGroup');g.style.display=g.style.display==='none'?'block':'none';if(g.style.display==='block')document.getElementById('editCoverInput').focus()});
document.getElementById('editCoverInput').addEventListener('change',function(){document.getElementById('editCoverImg').src=this.value||DEFAULT_COVER;document.getElementById('coverEmpty').style.display=this.value?'none':'flex'});
document.getElementById('editGalleryAddBtn').addEventListener('click',()=>openCldUpload(url=>{editGalleryImages.push(url);renderEditGallery()},{multiple:true}));
document.getElementById('editCancelBtn').addEventListener('click',()=>document.getElementById('editOverlay').classList.remove('active'));
document.getElementById('editOverlay').addEventListener('click',e=>{if(e.target.id==='editOverlay')document.getElementById('editOverlay').classList.remove('active')});

document.getElementById('editSaveBtn').addEventListener('click', async () => {
    const origSlug = document.getElementById('editOrigSlug').value;
    const slug = document.getElementById('editSlug').value.trim();
    const title = document.getElementById('editTitleInput').value.trim();
    const date = document.getElementById('editDateInput').value;
    const desc = document.getElementById('editDescInput').value.trim();
    const people = document.getElementById('editPeopleInput').value.split(',').map(s => s.trim()).filter(Boolean);
    const equip = document.getElementById('editEquipInput').value.trim();
    const drive = document.getElementById('editDriveInput').value.trim();
    const cover = document.getElementById('editCoverInput').value.trim() || DEFAULT_COVER;

    if (!slug || !title || !date) { alert('请填写标识、标题和日期'); return; }

    const d = new Date(date);
    const shootData = {
        id: slug, slug, date, year: d.getFullYear(), month: d.getMonth() + 1,
        title, description: desc, people, equipment: equip, drive,
        cover, galleryImages: [...editGalleryImages]
    };

    if (origSlug) {
        const updated = normalizeShoot(shootData);
        SHOOTS = SHOOTS.map(s => s.slug === origSlug ? updated : s);
        await saveShootToSupabase(updated);
    } else {
        if (SHOOTS.some(s => s.slug === slug)) { alert('标识已存在'); return; }
        const newShoot = normalizeShoot(shootData);
        SHOOTS = [newShoot, ...SHOOTS];
        await saveShootToSupabase(newShoot);
    }
    document.getElementById('editOverlay').classList.remove('active');
    refreshSite();
});

document.getElementById('adminCenterClose').addEventListener('click', closeAdminCenter);
document.getElementById('adminAddPhotoBtn').addEventListener('click', addPendingPhotoToAlbum);
document.getElementById('adminUploadZone').addEventListener('click', () => {
    openCldUpload(url => {
        adminPendingPhotoUrl = url;
        const zone = document.getElementById('adminUploadZone');
        zone.classList.add('has-img');
        zone.innerHTML = '<img src="' + url + '" alt="">' +
            '<div class="admin-upload-label" id="adminUploadLabel">' +
            '<em>点击更换</em></div>';
    });
});
document.getElementById('adminNewAlbumBtn').addEventListener('click', () => {
    document.getElementById('adminPhotoAlbum').value = '__new__';
    showAdminMsg('ok', '请在上方选择"新建相册"并填写标题');
});
document.getElementById('adminNewSlideBtn').addEventListener('click', () => openSlideEdit(null));

document.querySelectorAll('.admin-center-tab').forEach(tab => {
    tab.addEventListener('click', () => setAdminPanel(tab.dataset.panel));
});

/* PROFILE PAGE */
function openProfilePage(){
    if(!currentUser)return;
    const ov=document.getElementById('profileOverlay');
    const aw=document.getElementById('profileAvatarWrap');
    aw.innerHTML='<img src="'+currentUser.avatar+'" alt="">';
    document.getElementById('profileEmail').textContent=currentUser.email;
    document.getElementById('profileRole').textContent=isAdmin?'管理员 · Admin':'普通用户';
    const totalPhotos=SHOOTS.reduce((a,s)=>a+(s.galleryImages?s.galleryImages.length:0),0);
    document.getElementById('profileStats').innerHTML='<div class="profile-stat"><div class="profile-stat-num">'+SHOOTS.length+'</div><div class="profile-stat-label">相册</div></div><div class="profile-stat"><div class="profile-stat-num">'+totalPhotos+'</div><div class="profile-stat-label">照片</div></div><div class="profile-stat"><div class="profile-stat-num">'+HOME_SLIDES.length+'</div><div class="profile-stat-label">幻灯片</div></div>';
    ov.classList.add('open');document.body.style.overflow='hidden';
}
function closeProfilePage(){document.getElementById('profileOverlay').classList.remove('open');document.body.style.overflow=''}
document.getElementById('profileClose').addEventListener('click',closeProfilePage);
document.getElementById('profileOverlay').addEventListener('click',e=>{if(e.target.id==='profileOverlay')closeProfilePage()});
document.getElementById('profileLogoutBtn').addEventListener('click',()=>{closeProfilePage();doLogout()});

/* NEW ADMIN PANEL */
let naCurrentSlug=null,naSelectedPhotos=new Set();

function openNewAdminPanel(){
    if(!isAdmin){openAuth('login');return}
    naCurrentSlug=null;naSelectedPhotos=new Set();
    renderNaAlbumList();renderNaSlidesBody();
    document.getElementById('naEmptyState').style.display='flex';
    document.getElementById('naAlbumDetail').style.display='none';
    document.getElementById('naBatchUpload').disabled=true;
    document.getElementById('naBatchDelPhotos').disabled=true;
    document.getElementById('newAdminSelInfo').textContent='请先选择相册';
    document.getElementById('newAdminSelInfo').classList.remove('active');
    setNaTab('albums');
    document.getElementById('newAdminOverlay').classList.add('open');
    document.body.style.overflow='hidden';
}
function closeNewAdminPanel(){document.getElementById('newAdminOverlay').classList.remove('open');document.body.style.overflow=''}
document.getElementById('newAdminClose').addEventListener('click',closeNewAdminPanel);
document.querySelectorAll('.new-admin-tab').forEach(tab=>{tab.addEventListener('click',()=>setNaTab(tab.dataset.tab))});
function setNaTab(tab){document.querySelectorAll('.new-admin-tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));document.querySelectorAll('.new-admin-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+tab))}

function renderNaAlbumList(){
    const el=document.getElementById('naAlbumList');
    if(!SHOOTS.length){el.innerHTML='<div style="padding:1rem;font-family:DM Mono,monospace;font-size:.65rem;color:var(--text-dim)">暂无相册</div>';return}
    el.innerHTML=[...SHOOTS].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(s=>'<div class="na-album-item'+(naCurrentSlug===s.slug?' active':'')+'\" data-slug="'+s.slug+'"><img src="'+s.cover+'" alt="" loading="lazy"><div class="na-album-item-info"><div class="na-album-item-title">'+s.dateDisplay+'</div><div class="na-album-item-meta">'+(s.galleryImages?s.galleryImages.length:0)+' 张照片</div></div></div>').join('');
    el.querySelectorAll('.na-album-item').forEach(item=>{item.addEventListener('click',()=>selectNaAlbum(item.dataset.slug))});
}
function selectNaAlbum(slug){
    naCurrentSlug=slug;naSelectedPhotos=new Set();
    renderNaAlbumList();
    const s=shootBySlug(slug);if(!s)return;
    document.getElementById('naEmptyState').style.display='none';
    document.getElementById('naAlbumDetail').style.display='block';
    document.getElementById('naBatchUpload').disabled=false;
    document.getElementById('naBatchDelPhotos').disabled=true;
    document.getElementById('newAdminSelInfo').textContent='已选：'+s.dateDisplay;
    document.getElementById('newAdminSelInfo').classList.add('active');
    document.getElementById('naDetailCoverImg').src=s.cover;
    document.getElementById('naMetaDate').value=s.date;
    document.getElementById('naMetaDesc').value=s.description||'';
    document.getElementById('naMetaPeople').value=(s.people||[]).join(', ');
    document.getElementById('naMetaEquip').value=s.equipment||'';
    document.getElementById('naMetaDrive').value=s.drive||'';
    renderNaPhotosGrid(s);
}
function renderNaPhotosGrid(s){
    const imgs=s.galleryImages||[];
    document.getElementById('naPhotosCount').textContent=imgs.length+' 张';
    document.getElementById('naSelectAll').checked=false;
    const grid=document.getElementById('naPhotosGrid');
    grid.innerHTML=imgs.map((url,i)=>'<div class="na-photo-item'+(naSelectedPhotos.has(i)?' selected':'')+'\" data-idx="'+i+'"><img src="'+url+'" alt="" loading="lazy"><div class="na-photo-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div></div>').join('');
    grid.querySelectorAll('.na-photo-item').forEach(item=>{item.addEventListener('click',()=>toggleNaPhoto(+item.dataset.idx,s))});
}
function toggleNaPhoto(idx,s){
    if(naSelectedPhotos.has(idx))naSelectedPhotos.delete(idx);else naSelectedPhotos.add(idx);
    document.getElementById('naBatchDelPhotos').disabled=naSelectedPhotos.size===0;
    document.getElementById('naSelectAll').checked=naSelectedPhotos.size===(s.galleryImages||[]).length;
    renderNaPhotosGrid(s);
}
document.getElementById('naSelectAll').addEventListener('change',function(){
    const s=shootBySlug(naCurrentSlug);if(!s)return;
    const imgs=s.galleryImages||[];
    naSelectedPhotos=this.checked?new Set(imgs.map((_,i)=>i)):new Set();
    document.getElementById('naBatchDelPhotos').disabled=naSelectedPhotos.size===0;
    renderNaPhotosGrid(s);
});
document.getElementById('naChangeCover').addEventListener('click',()=>{
    if(!naCurrentSlug)return;
    openCldUpload(url=>{SHOOTS=SHOOTS.map(s=>s.slug===naCurrentSlug?{...s,cover:url,images:[url]}:s);saveShoots();document.getElementById('naDetailCoverImg').src=url;refreshSite();renderNaAlbumList()});
});
document.getElementById('naSaveMeta').addEventListener('click',async()=>{
    if(!naCurrentSlug)return;
    const date=document.getElementById('naMetaDate').value;
    const desc=document.getElementById('naMetaDesc').value.trim();
    const people=document.getElementById('naMetaPeople').value.split(',').map(s=>s.trim()).filter(Boolean);
    const equip=document.getElementById('naMetaEquip').value.trim();
    const drive=document.getElementById('naMetaDrive').value.trim();
    const d=new Date(date);
    SHOOTS=SHOOTS.map(s=>{if(s.slug!==naCurrentSlug)return s;return normalizeShoot({...s,date,year:d.getFullYear(),month:d.getMonth()+1,description:desc,people,equipment:equip,drive})});
    const updated=shootBySlug(naCurrentSlug);
    if(updated)await saveShootToSupabase(updated);
    refreshSite();renderNaAlbumList();
    const btn=document.getElementById('naSaveMeta');btn.textContent='✓ 已保存';btn.style.background='var(--success)';setTimeout(()=>{btn.textContent='保存信息';btn.style.background=''},1800);
});
document.getElementById('naBatchUpload').addEventListener('click',()=>{
    if(!naCurrentSlug){alert('请先选择相册');return}
    openCldUpload(async url=>{
        SHOOTS=SHOOTS.map(s=>s.slug===naCurrentSlug?{...s,galleryImages:[...(s.galleryImages||[]),url]}:s);
        const updated=shootBySlug(naCurrentSlug);if(updated)await saveShootToSupabase(updated);
        const s=shootBySlug(naCurrentSlug);if(s)renderNaPhotosGrid(s);refreshSite();
        document.getElementById('naPhotosCount').textContent=(shootBySlug(naCurrentSlug)?.galleryImages||[]).length+' 张';
    },{multiple:true});
});
document.getElementById('naBatchDelPhotos').addEventListener('click',async()=>{
    if(!naCurrentSlug||naSelectedPhotos.size===0)return;
    if(!confirm('确认删除选中的 '+naSelectedPhotos.size+' 张照片？'))return;
    SHOOTS=SHOOTS.map(s=>{if(s.slug!==naCurrentSlug)return s;const imgs=(s.galleryImages||[]).filter((_,i)=>!naSelectedPhotos.has(i));return{...s,galleryImages:imgs}});
    naSelectedPhotos=new Set();
    document.getElementById('naBatchDelPhotos').disabled=true;
    const updated=shootBySlug(naCurrentSlug);if(updated)await saveShootToSupabase(updated);
    const s=shootBySlug(naCurrentSlug);if(s)renderNaPhotosGrid(s);refreshSite();
    document.getElementById('naPhotosCount').textContent=(shootBySlug(naCurrentSlug)?.galleryImages||[]).length+' 张';
});
document.getElementById('naNewAlbum').addEventListener('click',()=>{openEdit(null)});
function renderNaSlidesBody(){
    const el=document.getElementById('naSlidesBody');if(!el)return;
    if(!HOME_SLIDES.length){el.innerHTML='<div style="font-family:DM Mono,monospace;font-size:.72rem;color:var(--text-dim);padding:2rem;text-align:center">暂无幻灯片，点击右上方按钮添加</div>';return}
    el.innerHTML=HOME_SLIDES.map((s,i)=>'<div class="na-slide-row"><img src="'+s.image_url+'" alt=""><div class="na-slide-row-info"><div class="na-slide-row-caption">'+(s.caption||'(无标题)')+'</div><div class="na-slide-row-sub">'+(s.sub||'—')+'</div></div><div class="na-slide-row-actions">'+(i>0?'<button data-smove="up" data-idx="'+i+'"><svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg></button>':'')+(i<HOME_SLIDES.length-1?'<button data-smove="down" data-idx="'+i+'"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button>':'')+'<button data-sedit="'+i+'"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg></button><button class="del" data-sdel="'+i+'"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button></div></div>').join('');
    el.querySelectorAll('[data-sedit]').forEach(b=>b.addEventListener('click',()=>openSlideEdit(+b.dataset.sedit)));
    el.querySelectorAll('[data-sdel]').forEach(b=>b.addEventListener('click',()=>{if(!confirm('确认删除该幻灯片？'))return;HOME_SLIDES.splice(+b.dataset.sdel,1);saveHomeSlides();renderNaSlidesBody();router()}));
    el.querySelectorAll('[data-smove]').forEach(b=>b.addEventListener('click',()=>{const idx=+b.dataset.idx,dir=b.dataset.smove,si=dir==='up'?idx-1:idx+1;[HOME_SLIDES[idx],HOME_SLIDES[si]]=[HOME_SLIDES[si],HOME_SLIDES[idx]];saveSlideOrder();renderNaSlidesBody();loadSlidesFromSupabase().then(()=>router())}));
}
document.getElementById('naNewSlide').addEventListener('click',()=>openSlideEdit(null));

/* ADMIN FAB */
document.getElementById('adminFab').addEventListener('click',()=>{if(isAdmin)openNewAdminPanel();else openAuth('login')});

/* INIT */
checkSession();
refreshSite();
