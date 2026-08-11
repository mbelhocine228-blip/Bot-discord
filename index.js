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
app.use(express.json());
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
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

const guildSettings = {};
const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

// --- الصفحة الرئيسية ---
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8"><title>RKS•ＰＯＷＥＲ Dashboard</title>
            <style>
                body { background-color: #2f3136; color: #fff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #36393f; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 380px; }
                .btn { background-color: #5865F2; color: white; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 6px; display: block; margin-bottom: 12px; font-weight: bold; }
                .btn-invite { background-color: #43b581; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>RKS•ＰＯＷＥＲ</h2>
                <p>لوحة التحكم الاحترافية الشاملة</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد 🎮</a>
                <a href="${INVITE_URL}" target="_blank" class="btn btn-invite">إضافة البوت لسيرفرك ➕</a>
            </div>
        </body>
        </html>
    `);
});

// --- قائمة السيرفرات ---
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}/welcome" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #36393f; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 140px;">
                <img src="${iconUrl}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
                <span style="font-size: 14px; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${guild.name}</span>
            </a>
        `;
    });
    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title>
        <style>
            body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; padding: 40px; }
            .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 25px; }
            .top-bar { display: flex; justify-content: space-between; align-items: center; background: #36393f; padding: 15px 25px; border-radius: 8px; }
        </style></head>
        <body>
            <div class="top-bar">
                <h2>مرحباً بك، ${req.user.username} 👋</h2>
                <div>
                    <a href="${INVITE_URL}" target="_blank" style="background:#43b581; color:white; padding:10px 18px; text-decoration:none; border-radius:5px; font-weight:bold; margin-left: 10px;">إضافة بوت جديد ➕</a>
                    <a href="/logout" style="background:#ed4245; color:white; padding:10px 18px; text-decoration:none; border-radius:5px; font-weight:bold;">خروج 🚪</a>
                </div>
            </div>
            <h3 style="margin-top: 30px;">اختر السيرفر لإدارته:</h3>
            <div class="grid">${guildsHtml}</div>
        </body></html>
    `);
});

// --- لوحة التحكم الشاملة (القائمة الجانبية مثل Koya والمحتوى) ---
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود أو البوت غير مضاف إليه.');
    
    if (!guildSettings[guild.id]) {
        guildSettings[guild.id] = { 
            welcomeMessage: 'مرحباً بك في السيرفر!',
            embedColor: '#f1c40f',
            autoRoleName: '@Team Rocks'
        };
    }
    const settings = guildSettings[guild.id];
    const section = req.params.section;

    // محتوى الديناميكي حسب القسم المختار
    let mainContent = '';

    if (section === 'welcome' || section === 'announcements') {
        mainContent = `
            <h2>📢 رسائل الترحيب والإعلانات</h2>
            <p style="color: #b9bbbe;">قم بتخصيص رسائل الترحيب التلقائية عند دخول الأعضاء للسيرفر.</p>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="welcome">
                
                <label style="display:block; margin-top:15px; font-weight:bold;">نص رسالة الترحيب:</label>
                <textarea name="welcomeMessage" rows="3" style="width:100%; padding:12px; background:#1e1f22; color:white; border:1px solid #383a40; border-radius:6px;">${settings.welcomeMessage}</textarea>
                
                <label style="display:block; margin-top:15px; font-weight:bold;">لون الـ Embed:</label>
                <input type="color" name="embedColor" value="${settings.embedColor}" style="width: 100px; height: 40px; background: #1e1f22; border: 1px solid #383a40; border-radius: 6px; cursor: pointer;">
                
                <br><br>
                <button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ الإعدادات 💾</button>
            </form>
        `;
    } else if (section === 'autoroles') {
        mainContent = `
            <h2>👑 نظام رتب الأعضاء التلقائية (Auto Rôles)</h2>
            <p style="color: #b9bbbe;">إضافة رتب تلقائية للأعضاء الجدد فور دخولهم السيرفر.</p>
            <div style="background: #2b2d31; padding: 15px; border-radius: 8px; border: 1px solid #383a40; margin-top: 15px;">
                <p><b>الرتبة الحالية المعينة:</b> <span style="color: #43b581;">${settings.autoRoleName}</span></p>
                <form action="/action/save" method="POST">
                    <input type="hidden" name="guildId" value="${guild.id}">
                    <input type="hidden" name="section" value="autoroles">
                    <input type="text" name="autoRoleName" value="${settings.autoRoleName}" style="padding: 10px; width: 250px; background: #1e1f22; color: white; border: 1px solid #383a40; border-radius: 6px;">
                    <button type="submit" style="background: #43b581; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 10px;">تحديث الرتبة</button>
                </form>
            </div>
        `;
    } else if (section === 'stats' || section === 'leaderboard') {
        mainContent = `
            <h2>📊 الإحصائيات والترتيب (Classement & Statistiques)</h2>
            <p style="color: #b9bbbe;">متابعة تفاعل الأعضاء ونشاطهم في السيرفر.</p>
            <div style="display: flex; gap: 20px; margin-top: 20px;">
                <div style="background: #2b2d31; padding: 20px; border-radius: 8px; flex: 1; border: 1px solid #383a40;">
                    <h3>إجمالي الأعضاء</h3>
                    <p style="font-size: 24px; color: #5865F2; font-weight: bold;">${guild.memberCount}</p>
                </div>
                <div style="background: #2b2d31; padding: 20px; border-radius: 8px; flex: 1; border: 1px solid #383a40;">
                    <h3>حالة البوت</h3>
                    <p style="font-size: 24px; color: #43b581; font-weight: bold;">متصل وشغال 🟢</p>
                </div>
            </div>
        `;
    } else {
        mainContent = `
            <h2>⚙️ إعدادات قسم: ${section}</h2>
            <p style="color: #b9bbbe;">هذا القسم قيد التفعيل وسيتم ربطه بكامل خياراته قريباً!</p>
        `;
    }

    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إدارة ${guild.name}</title>
        <style>
            * { box-sizing: border-box; }
            body { background-color: #313338; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; overflow: hidden; }
            .content { flex: 1; padding: 40px; overflow-y: auto; background: #313338; }
            .sidebar { width: 280px; background: #2b2d31; padding: 20px; display: flex; flex-direction: column; border-right: 1px solid #1f2023; overflow-y: auto; height: 100vh; }
            .sidebar h4 { color: #8e9297; font-size: 12px; margin: 15px 0 5px 0; text-transform: uppercase; }
            .sidebar a { display: block; color: #b9bbbe; text-decoration: none; padding: 10px 12px; margin-bottom: 4px; background: #2b2d31; border-radius: 6px; font-weight: bold; font-size: 14px; }
            .sidebar a:hover { background: #35373c; color: white; }
            .sidebar a.active { background: #5865F2; color: white; }
        </style></head>
        <body>
            <!-- المحتوى على اليسار -->
            <div class="content">
                <div style="background: #2b2d31; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #383a40;">
                    <span>إدارة سيرفر: <b>${guild.name}</b> 🛡️</span>
                </div>
                ${mainContent}
            </div>

            <!-- القائمة الجانبية على اليمين (مطابقة لـ Koya) -->
            <div class="sidebar">
                <h3 style="color:white; margin-top:0;">RKS Dashboard</h3>
                <a href="/control/${guild.id}/welcome" class="${section === 'welcome' ? 'active' : ''}">🏆 Classement / الترتيب</a>
                <a href="/control/${guild.id}/stats" class="${section === 'stats' ? 'active' : ''}">📈 Statistiques</a>
                <a href="/control/${guild.id}/vocals" class="${section === 'vocals' ? 'active' : ''}">🔊 Vocaux Temporaires</a>
                <a href="/control/${guild.id}/starboard" class="${section === 'starboard' ? 'active' : ''}">⭐ Starboard</a>
                <a href="/control/${guild.id}/birthdays" class="${section === 'birthdays' ? 'active' : ''}">🎂 Anniversaires</a>
                <a href="/control/${guild.id}/minigames" class="${section === 'minigames' ? 'active' : ''}">🎮 Mini-jeux</a>

                <h4>Rôles</h4>
                <a href="/control/${guild.id}/autoroles" class="${section === 'autoroles' ? 'active' : ''}">➕ Auto Rôles</a>
                <a href="/control/${guild.id}/reactionroles" class="${section === 'reactionroles' ? 'active' : ''}">🏷️ Rôles Réaction</a>
                <a href="/control/${guild.id}/temproles" class="${section === 'temproles' ? 'active' : ''}">⏰ Rôles Temporaires</a>

                <h4>Modération</h4>
                <a href="/control/${guild.id}/automod" class="${section === 'automod' ? 'active' : ''}">🛡️ Auto Mod</a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 Logs</a>

                <div style="margin-top: 30px; border-top: 1px solid #383a40; padding-top: 15px;">
                    <a href="/dashboard" style="background:#5865F2; color:white; text-align:center;">← العودة لاختيار السيرفرات</a>
                </div>
            </div>
        </body></html>
    `);
});

// حفظ البيانات المحدثة
app.post('/action/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { guildId, welcomeMessage, embedColor, autoRoleName } = req.body;
    if (!guildSettings[guildId]) guildSettings[guildId] = {};
    
    if (welcomeMessage !== undefined) guildSettings[guildId].welcomeMessage = welcomeMessage;
    if (embedColor !== undefined) guildSettings[guildId].embedColor = embedColor;
    if (autoRoleName !== undefined) guildSettings[guildId].autoRoleName = autoRoleName;

    res.redirect(req.headers.referer || '/dashboard');
});

client.on('ready', () => console.log(`✅ البوت شغال: ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);

app.listen(process.env.PORT || 3000, () => console.log('🚀 الداشبورد الشاملة شغالة!'));
