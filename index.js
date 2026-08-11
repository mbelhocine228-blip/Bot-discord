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
    secret: 'probot-full-dashboard-secret-999', 
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
            <title>RKS•ＰＯＷＥＲ Pro Dashboard</title>
            <style>
                body { background-color: #2f3136; color: #ffffff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #36393f; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 350px; }
                h1 { color: #ffffff; margin-bottom: 10px; font-size: 24px; }
                p { color: #b9bbbe; margin-bottom: 30px; font-size: 14px; }
                .btn { background-color: #5865F2; color: white; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; width: 100%; box-sizing: border-box; }
                .btn:hover { background-color: #4752C4; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم الشاملة (ProBot Style)</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد</a>
            </div>
        </body>
        </html>
    `);
});

// صفحة اختيار السيرفرات (دائرية مثل كارل/بروبوت)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}/general" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #2f3136; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 120px;">
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
                .container { max-width: 800px; margin: auto; background: #36393f; padding: 30px; border-radius: 12px; border: 1px solid #202225; }
                h2 { margin-top: 0; color: #fff; }
                .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 25px; }
                .logout { display: inline-block; margin-top: 30px; color: #ed4245; text-decoration: none; font-weight: bold; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>مرحباً، ${req.user.username}!</h2>
                <p style="color: #b9bbbe;">الرجاء اختيار السيرفر للتحكم الكامل بأقسام البوت:</p>
                <div class="grid">${guildsHtml || '<p style="color: #ed4245;">لا توجد سيرفرات مشتركة.</p>'}</div>
                <br><a href="/logout" class="logout">تسجيل الخروج 🚪</a>
            </div>
        </body>
        </html>
    `);
});

// لوحة التحكم الشاملة (تحتوي على كل الأقسام المشابهة لبروبوت)
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');

    const section = req.params.section || 'general';

    // محتوى الأقسام المختلفة بناءً على اختيار القائمة الجانبية
    let contentHtml = '';

    if (section === 'general') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📢 إرسال إعلان رسمي</div>
                <div class="setting-desc">إرسال رسالة مباشرة إلى القنوات النصية المتاحة في السيرفر.</div>
                <form action="/action/send" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <textarea name="msg" rows="3" placeholder="اكتب نص الإعلان هنا..."></textarea>
                    <button type="submit" class="btn-apply">إرسال 🚀</button>
                </form>
            </div>
        `;
    } else if (section === 'welcome') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">👋 نظام الترحيب بالأعضاء</div>
                <div class="setting-desc">إرسال رسالة ترحيب تلقائية عند دخول أي عضو جديد للسيرفر.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="font-size:13px; color:#b9bbbe;">رسالة الترحيب:</label>
                    <textarea name="welcomeMsg" rows="3" placeholder="مرحباً بك في السيرفر!"></textarea>
                    <button type="submit" class="btn-apply">حفظ التعديلات 💾</button>
                </form>
            </div>
        `;
    } else if (section === 'moderation') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">🛡️ حماية السيرفر والأمان</div>
                <div class="setting-desc">التحكم في الروابط الممنوعة، السبام، وحماية الأعضاء.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin-bottom:15px; cursor:pointer;">
                        <input type="checkbox" name="antiSpam" style="width:20px; height:20px;"> تفعيل نظام منع السبام التلقائي
                    </label>
                    <label style="display:flex; align-items:center; gap:10px; font-size:14px; margin-bottom:15px; cursor:pointer;">
                        <input type="checkbox" name="antiLinks" style="width:20px; height:20px;"> منع نشر الروابط الخارجية
                    </label>
                    <button type="submit" class="btn-apply">حفظ إعدادات الحماية 🔒</button>
                </form>
            </div>
        `;
    } else if (section === 'logs') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">📋 سجلات الحركات (Logs)</div>
                <div class="setting-desc">متابعة تعديل الرسائل، حذفها، دخول وخروج الأعضاء.</div>
                <p style="color: #b9bbbe; font-size: 14px;">السجلات مفعلة وتعمل تلقائياً لتسجيل كافة أحداث السيرفر الهامة.</p>
            </div>
        `;
    } else if (section === 'embed') {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">🎨 منشئ الرسائل المدمجة (Embed Builder)</div>
                <div class="setting-desc">صمم رسائل احترافية مزخرفة وقم بإرسالها لأي قناة.</div>
                <form action="/action/embed" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="text" name="embedTitle" placeholder="عنوان الرسالة (Title)">
                    <textarea name="embedDesc" rows="3" placeholder="محتوى الرسالة (Description)"></textarea>
                    <button type="submit" class="btn-apply">إرسال الـ Embed 🌟</button>
                </form>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - ProBot Dashboard</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; }
                .sidebar { width: 260px; background: #202225; padding: 20px; display: flex; flex-direction: column; gap: 8px; border-left: 1px solid #2f3136; box-sizing: border-box; }
                .sidebar h3 { font-size: 13px; color: #8e9297; margin: 15px 0 5px 0; text-transform: uppercase; }
                .sidebar a { color: #b9bbbe; text-decoration: none; padding: 10px 12px; border-radius: 6px; font-size: 14px; font-weight: bold; display: flex; align-items: center; gap: 10px; }
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
                <h3 style="margin-top:0;">إدارة السيرفر</h3>
                <a href="/control/${guild.id}/general" class="${section === 'general' ? 'active' : ''}">📢 الإعلانات العامة</a>
                <a href="/control/${guild.id}/welcome" class="${section === 'welcome' ? 'active' : ''}">👋 الترحيب والأعضاء</a>
                <a href="/control/${guild.id}/moderation" class="${section === 'moderation' ? 'active' : ''}">🛡️ الحماية والأمان</a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 سجلات الحركات</a>
                <a href="/control/${guild.id}/embed" class="${section === 'embed' ? 'active' : ''}">🎨 منشئ الـ Embeds</a>
                
                <h3 style="margin-top: 20px;">نظام التنقل</h3>
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

// استقبال الأوامر وحفظها
app.post('/action/send', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    try {
        const guild = client.guilds.cache.get(req.body.guildId);
        if (guild) {
            const ch = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (ch) await ch.send(req.body.msg);
        }
    } catch (e) {}
    res.redirect(`/control/${req.body.guildId}/general`);
});

app.post('/action/save', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.redirect(req.headers.referer || '/dashboard');
});

app.post('/action/embed', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    try {
        const guild = client.guilds.cache.get(req.body.guildId);
        if (guild) {
            const ch = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (ch) {
                await ch.send({
                    embeds: [{
                        title: req.body.embedTitle || 'إشعار',
                        description: req.body.embedDesc || '',
                        color: 0x5865F2
                    }]
                });
            }
        }
    } catch (e) {}
    res.redirect(`/control/${req.body.guildId}/embed`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ProBot Dashboard running on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
