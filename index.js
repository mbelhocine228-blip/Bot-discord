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
    secret: 'rks-power-carlbot-style-99', 
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

// الصفحة الرئيسية (نفس ستايل واجهة كارل بوت)
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ Dashboard</title>
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
                <p>لوحة التحكم الاحترافية لإدارة السيرفرات</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد</a>
            </div>
        </body>
        </html>
    `);
});

// صفحة اختيار السيرفرات (نفس تصميم Server Picker الدائري الخاص بكارل بوت)
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    
    let guildsHtml = '';
    // استعراض السيرفرات التي يشترك فيها البوت والمستخدم
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #2f3136; padding: 15px; border-radius: 12px; border: 1px solid #202225; transition: 0.2s; width: 120px;">
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
            <title>اختيار السيرفر - RKS</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; padding: 40px; }
                .container { max-width: 800px; margin: auto; background: #36393f; padding: 30px; border-radius: 12px; border: 1px solid #202225; }
                h2 { margin-top: 0; font-size: 22px; color: #fff; }
                p { color: #b9bbbe; font-size: 14px; }
                .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 25px; }
                .logout { display: inline-block; margin-top: 30px; color: #ed4245; text-decoration: none; font-weight: bold; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>مرحباً، ${req.user.username || 'مستخدم'}!</h2>
                <p>الرجاء اختيار السيرفر للبدء في الإدارة:</p>
                <div class="grid">
                    ${guildsHtml || '<p style="color: #ed4245;">لا توجد سيرفرات مشتركة مع البوت.</p>'}
                </div>
                <br>
                <a href="/logout" class="logout">تسجيل الخروج 🚪</a>
            </div>
        </body>
        </html>
    `);
});

// لوحة التحكم الخاصة بالسيرفر (بنفس ستايل إعدادات كارل بوت الجانبية)
app.get('/control/:guildId', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود أو البوت ليس داخله.');

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - كارل ستايل</title>
            <style>
                body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; }
                .sidebar { width: 240px; background: #202225; padding: 20px; display: flex; flex-direction: column; gap: 10px; border-left: 1px solid #2f3136; }
                .sidebar h3 { font-size: 14px; color: #8e9297; margin-bottom: 5px; text-transform: uppercase; }
                .sidebar a { color: #b9bbbe; text-decoration: none; padding: 10px; border-radius: 6px; font-size: 14px; font-weight: bold; }
                .sidebar a:hover, .sidebar a.active { background: #393c43; color: #ffffff; }
                .content { flex: 1; padding: 40px; overflow-y: auto; background: #36393f; }
                .setting-card { background: #2f3136; padding: 20px; border-radius: 8px; border: 1px solid #202225; margin-bottom: 20px; }
                .setting-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #fff; }
                .Setting-desc { font-size: 13px; color: #b9bbbe; margin-bottom: 15px; }
                input, textarea { width: 100%; padding: 10px; background: #202225; color: white; border: 1px solid #202225; border-radius: 4px; box-sizing: border-box; margin-bottom: 10px; }
                .btn-apply { background: #00b0f4; color: white; border: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; cursor: pointer; }
                .btn-apply:hover { background: #0096d6; }
            </style>
        </head>
        <body>
            <div class="sidebar">
                <h3>إعدادات السيرفر</h3>
                <a href="#" class="active">⚙️ إعدادات البوت</a>
                <a href="/dashboard">← العودة للسيرفرات</a>
                <a href="/logout" style="color: #ed4245; margin-top: auto;">تسجيل الخروج</a>
            </div>
            <div class="content">
                <h2>إدارة سيرفر: ${guild.name}</h2>
                
                <div class="setting-card">
                    <div class="setting-title">إرسال إعلان رسمي للسيرفر</div>
                    <div class="Setting-desc">إرسال رسالة مباشرة إلى القناة النصية المتاحة في السيرفر.</div>
                    <form action="/send" method="POST">
                        <input type="hidden" name="guildId" value="${guild.id}">
                        <textarea name="msg" rows="3" placeholder="اكتب نص الإعلان هنا..."></textarea>
                        <button type="submit" class="btn-apply">إرسال الإعلان 📢</button>
                    </form>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/send', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    try {
        const guild = client.guilds.cache.get(req.body.guildId);
        if (guild) {
            const ch = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (ch) await ch.send(req.body.msg);
        }
    } catch (e) {}
    res.redirect(`/control/${req.body.guildId}`);
});

app.use((err, req, res, next) => {
    console.error("خطأ في الخادم:", err);
    res.status(500).send(`حدث خطأ داخلي في الخادم: ${err.message}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
