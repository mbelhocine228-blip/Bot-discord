const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
app.set('trust proxy', 1);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'rks-koya-ultimate-secret-777', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: '1171579175635800175',         
    clientSecret: 'I1JZsvXEZ_L4iQjAlIMurRy-c_ikOecN', 
    callbackURL: 'https://bot-discord-g9r5.onrender.com/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', { 
    failureRedirect: '/' 
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { 
    req.logout(() => {
        res.redirect('/');
    }); 
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ Koya Ultimate Dashboard</title>
            <style>
                body { background-color: #2f3136; color: #ffffff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #36393f; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 380px; }
                h1 { color: #ffffff; margin-bottom: 10px; font-size: 26px; }
                p { color: #b9bbbe; margin-bottom: 30px; font-size: 14px; }
                .btn { background-color: #5865F2; color: white; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; width: 100%; box-sizing: border-box; }
                .btn:hover { background-color: #4752C4; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم الشاملة والمطورة Koya</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد</a>
            </div>
        </body>
        </html>
    `);
});

// قائمة السيرفرات
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}/autoroles" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #2f3136; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 130px;">
                <img src="${iconUrl}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #5865F2; margin-bottom: 10px;">
                <span style="font-size: 14px; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${guild.name}</span>
            </a>
        `;
    });

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>اختر السيرفر</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; padding: 40px; }
                .container { max-width: 850px; margin: auto; background: #36393f; padding: 30px; border-radius: 12px; border: 1px solid #202225; }
                h2 { margin-top: 0; color: #fff; }
                .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 25px; }
                .logout { display: inline-block; margin-top: 30px; color: #ed4245; text-decoration: none; font-weight: bold; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>مرحباً بك، ${req.user.username} 👋</h2>
                <p style="color: #b9bbbe;">اختر السيرفر المطلوب للبدء في إدارة الأوامر والإعدادات:</p>
                <div class="grid">${guildsHtml || '<p style="color: #ed4245;">لا توجد سيرفرات مشتركة.</p>'}</div>
                <br><a href="/logout" class="logout">تسجيل الخروج 🚪</a>
            </div>
        </body>
        </html>
    `);
});

// لوحة التحكم بالأقسام والأوامر المتعددة
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');

    const section = req.params.section || 'autoroles';
    let contentHtml = '';

    if (section === 'autoroles') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">➕ Auto Rôles (Rôles Automatiques)</div>
                <div class="setting-desc">تحديد الرتب التي يتم منحها تلقائياً لكل عضو جديد ينضم إلى السيرفر.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="font-size:13px; color:#b9bbbe; display:block; margin-bottom:5px;">اسم الرتبة أو الـ ID:</label>
                    <input type="text" name="roleName" placeholder="مثال: Member أو ID الرتبة...">
                    <button type="submit" class="btn-apply">إضافة وحفظ الرتبة 💾</button>
                </form>
            </div>
        `;
    } else if (section === 'welcome') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">👋 Message de Bienvenue (ترحيب بالأعضاء)</div>
                <div class="setting-desc">تخصيص رسالة ترحيبية تفاعلية مع إضافات الـ Embed والمنشن.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="font-size:13px; color:#b9bbbe; display:block; margin-bottom:5px;">نص الترحيب:</label>
                    <textarea name="welcomeText" rows="3">مرحباً بك {user.mention} في سيرفر **{server.name}**!</textarea>
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin:15px 0; cursor:pointer;">
                        <input type="checkbox" name="useEmbedWelcome" style="width:18px; height:18px;"> تفعيل تصميم الـ Embed للترحيب
                    </label>
                    <button type="submit" class="btn-apply">حفظ إعدادات الترحيب 🚀</button>
                </form>
            </div>
        `;
    } else if (section === 'reactions') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">⭐ Rôles Réaction (الأخذ بالرتب عبر التفاعل)</div>
                <div class="setting-desc">إعداد رسالة الأزرار أو الإيموجي ليحصل الأعضاء على رتبهم بأنفسهم.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="reactChannel" placeholder="معرف القناة (Channel ID)...">
                    <input type="text" name="reactEmoji" placeholder="الإيموجي المخصص (مثال: 🔥)...">
                    <input type="text" name="reactRole" placeholder="اسم الرتبة أو ID الرتبة...">
                    <button type="submit" class="btn-apply">إنشاء تفاعل الرتب 🎯</button>
                </form>
            </div>
        `;
    } else if (section === 'banmsg') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📢 Message de Banissement (رسائل الحظر)</div>
                <div class="setting-desc">تخصيص الإشعارات الموجهة عند حظر أي عضو من السيرفر.</div>
                <form action="/action/banmsg" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="font-size:13px; color:#b9bbbe; display:block; margin-bottom:5px;">رسالة الحظر:</label>
                    <textarea name="banText" rows="3">{user.mention} a été banni de **{server.name}**.</textarea>
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin:15px 0; cursor:pointer;">
                        <input type="checkbox" name="useEmbed" style="width:18px; height:18px;"> إرسال Embed مخصص للحظر
                    </label>
                    <input type="text" name="embedTitle" placeholder="عنوان الـ Embed (Titre)..." style="margin-bottom:10px;">
                    <textarea name="embedDesc" rows="2" placeholder="وصف الحظر (Description)..."></textarea>
                    <button type="submit" class="btn-apply">حفظ رسالة الحظر 🛡️</button>
                </form>
            </div>
        `;
    } else if (section === 'automod') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">🛡️ Auto Mod & Sécurité (الحماية التلقائية)</div>
                <div class="setting-desc">منع السبام، الكلمات المسيئة، والروابط الخارجية الضارة فوراً.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin-bottom:12px; cursor:pointer;">
                        <input type="checkbox" name="antiSpam" style="width:18px; height:18px;"> منع السبام والتكرار السريع للمنشورات
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin-bottom:12px; cursor:pointer;">
                        <input type="checkbox" name="antiLinks" style="width:18px; height:18px;"> حظر روابط الدعوات الخارجية والروابط المشبوهة
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin-bottom:15px; cursor:pointer;">
                        <input type="checkbox" name="antiBadWords" style="width:18px; height:18px;"> تصفية الشتائم والكلمات البذيئة تلقائياً
                    </label>
                    <button type="submit" class="btn-apply">تطبيق إعدادات الحماية 🔒</button>
                </form>
            </div>
        `;
    } else if (section === 'logs') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📋 Logs (سجلات الأحداث والمراقبة)</div>
                <div class="setting-desc">تسجيل كل حركة في السيرفر (تعديل الرسائل، دخول وخروج الأعضاء، الحظر).</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="logChannel" placeholder="معرف قناة السجلات (Log Channel ID)...">
                    <button type="submit" class="btn-apply">تفعيل قناة السجلات 📊</button>
                </form>
            </div>
        `;
    } else if (section === 'social') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📡 Flux Sociaux (إشعارات المنصات الخارجية)</div>
                <div class="setting-desc">إرسال إشعارات تلقائية عند بدء بث جديد على يوتيوب أو تويتش أو كيك.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="socialChannel" placeholder="قناة إرسال الإشعارات...">
                    <input type="text" name="creatorLink" placeholder="رابط القناة أو حساب البث...">
                    <button type="submit" class="btn-apply">حفظ ربط المنصة 🔔</button>
                </form>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - Koya Dashboard</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; }
                .sidebar { width: 290px; background: #202225; padding: 20px; display: flex; flex-direction: column; gap: 4px; border-left: 1px solid #2f3136; box-sizing: border-box; overflow-y: auto; }
                .sidebar h3 { font-size: 11px; color: #8e9297; margin: 15px 0 5px 0; text-transform: uppercase; }
                .sidebar a { color: #b9bbbe; text-decoration: none; padding: 9px 12px; border-radius: 6px; font-size: 13px; font-weight: bold; display: flex; align-items: center; gap: 10px; }
                .sidebar a:hover, .sidebar a.active { background: #393c43; color: #ffffff; }
                .content { flex: 1; padding: 40px; overflow-y: auto; background: #36393f; }
                .setting-card { background: #2f3136; padding: 25px; border-radius: 8px; border: 1px solid #202225; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .setting-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #fff; }
                .setting-desc { font-size: 13px; color: #b9bbbe; margin-bottom: 20px; }
                input[type="text"], textarea { width: 100%; padding: 12px; background: #202225; color: white; border: 1px solid #202225; border-radius: 6px; box-sizing: border-box; margin-bottom: 12px; font-size: 14px; }
                .btn-apply { background: #5865F2; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
                .btn-apply:hover { background: #4752C4; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <h3 style="margin-top:0;">Rôles</h3>
                <a href="/control/${guild.id}/autoroles" class="${section === 'autoroles' ? 'active' : ''}">➕ Auto Rôles</a>
                <a href="/control/${guild.id}/reactions" class="${section === 'reactions' ? 'active' : ''}">⭐ Rôles Réaction</a>
                
                <h3>Accueil & Annonces</h3>
                <a href="/control/${guild.id}/welcome" class="${section === 'welcome' ? 'active' : ''}">👋 Message de Bienvenue</a>
                <a href="/control/${guild.id}/banmsg" class="${section === 'banmsg' ? 'active' : ''}">📢 Message de Banissement</a>
                
                <h3>Modération & Logs</h3>
                <a href="/control/${guild.id}/automod" class="${section === 'automod' ? 'active' : ''}">🛡️ Auto Mod</a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 Logs</a>

                <h3>Flux Sociaux</h3>
                <a href="/control/${guild.id}/social" class="${section === 'social' ? 'active' : ''}">📡 YouTube / Twitch / Kick</a>
                
                <h3>Navigation</h3>
                <a href="/dashboard">← اختيار سيرفر آخر</a>
                <a href="/logout" style="color: #ed4245; margin-top: auto;">تسجيل الخروج 🚪</a>
            </div>
            
            <div class="content">
                <h2 style="margin-top:0; color:#fff;">إدارة سيرفر: ${guild.name}</h2>
                ${contentHtml}
            </div>
        </body>
        </html>
    `);
});

app.post('/action/save', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.redirect(req.headers.referer || '/dashboard');
});

app.post('/action/banmsg', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    try {
        const guild = client.guilds.cache.get(req.body.guildId);
        if (guild && req.body.useEmbed) {
            const ch = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (ch) {
                await ch.send({
                    embeds: [{
                        title: req.body.embedTitle || 'إشعار حظر',
                        description: req.body.embedDesc || req.body.banText,
                        color: 0xed4245
                    }]
                });
            }
        }
    } catch (e) {}
    res.redirect(req.headers.referer || '/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Koya Ultimate Dashboard running on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
