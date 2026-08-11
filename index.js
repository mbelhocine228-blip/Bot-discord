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
    secret: 'rks-koya-master-secret-999', 
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

const guildSettings = {};

// الصفحة الرئيسية
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ Koya Master Dashboard</title>
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
                <p>لوحة التحكم الكاملة لجميع أوامر Koya</p>
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
            <a href="/control/${guild.id}/autopseudo" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #2f3136; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 130px;">
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
                <p style="color: #b9bbbe;">اختر السيرفر للتحكم الشامل بجميع الأوامر والخصائص:</p>
                <div class="grid">${guildsHtml || '<p style="color: #ed4245;">لا توجد سيرفرات مشتركة.</p>'}</div>
                <br><a href="/logout" class="logout">تسجيل الخروج 🚪</a>
            </div>
        </body>
        </html>
    `);
});

// لوحة التحكم بالأقسام
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');

    const section = req.params.section || 'autopseudo';
    if (!guildSettings[guild.id]) guildSettings[guild.id] = {};
    let contentHtml = '';

    if (section === 'autopseudo') {
        const savedFormat = guildSettings[guild.id].nicknameFormat || '[RKS] {user.name}';
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">👤 Auto Pseudo 👤</div>
                <div class="setting-desc">إجبار الأعضاء على استخدام تنسيق أسماء محدد تلقائياً عند الدخول.</div>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="hidden" name="section" value="autopseudo">
                    <label style="font-size:13px; color:#b9bbbe; display:block; margin-bottom:5px;">التنسيق المطلوب:</label>
                    <input type="text" name="nicknameFormat" value="${savedFormat}" placeholder="مثال: [RKS] {user.name}">
                    <button type="submit" class="btn-apply">حفظ تنسيق الأسماء ✍️</button>
                </form>
            </div>`;
    } else {
        contentHtml = `
            <div class="setting-card">
                <div class="setting-title">⚙️ إعدادات القسم</div>
                <div class="setting-desc">هذا القسم جاهز ومفعل للتحكم الكامل.</div>
            </div>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name}</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; }
                .sidebar { width: 300px; background: #202225; padding: 15px; display: flex; flex-direction: column; gap: 3px; border-left: 1px solid #2f3136; box-sizing: border-box; overflow-y: auto; }
                .sidebar h3 { font-size: 11px; color: #8e9297; margin: 12px 0 4px 0; text-transform: uppercase; }
                .sidebar a { color: #b9bbbe; text-decoration: none; padding: 8px 10px; border-radius: 6px; font-size: 13px; font-weight: bold; display: flex; align-items: center; justify-content: space-between; }
                .sidebar a:hover, .sidebar a.active { background: #393c43; color: #ffffff; }
                .content { flex: 1; padding: 40px; overflow-y: auto; background: #36393f; }
                .setting-card { background: #2f3136; padding: 25px; border-radius: 8px; border: 1px solid #202225; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .setting-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #fff; }
                .setting-desc { font-size: 13px; color: #b9bbbe; margin-bottom: 20px; }
                input[type="text"] { width: 100%; padding: 12px; background: #202225; color: white; border: 1px solid #202225; border-radius: 6px; box-sizing: border-box; margin-bottom: 12px; font-size: 14px; }
                .btn-apply { background: #5865F2; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <h3 style="margin-top:0;">Modération</h3>
                <a href="/control/${guild.id}/autopseudo" class="active">👤 Auto Pseudo</a>
                <h3>Navigation</h3>
                <a href="/dashboard" style="color: #5865F2;">← اختيار سيرفر آخر</a>
                <a href="/logout" style="color: #ed4245;">تسجيل الخروج 🚪</a>
            </div>
            <div class="content">
                <h2 style="margin-top:0; color:#fff;">إدارة سيرفر: ${guild.name}</h2>
                ${contentHtml}
            </div>
        </body>
        </html>
    `);
});

// حفظ البيانات
app.post('/action/save', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { guildId, section, nicknameFormat } = req.body;
    
    if (section === 'autopseudo' && nicknameFormat) {
        if (!guildSettings[guildId]) guildSettings[guildId] = {};
        guildSettings[guildId].nicknameFormat = nicknameFormat;
    }
    res.redirect(req.headers.referer || '/dashboard');
});

client.on('guildMemberAdd', async (member) => {
    try {
        const settings = guildSettings[member.guild.id];
        if (settings && settings.nicknameFormat) {
            let newName = settings.nicknameFormat.replace('{user.name}', member.user.username);
            await member.setNickname(newName);
        }
    } catch (e) {}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Dashboard running on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
