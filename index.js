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

// تخزين الإعدادات الشاملة لكل سيرفر
const guildSettings = {};
const userMessageTracker = new Map();
const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

// --- الصفحة الرئيسية ---
app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>RKS•ＰＯＷＥＲ Dashboard</title>
        <style>
            body { background-color: #2f3136; color: #fff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .card { background: #36393f; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 380px; }
            .btn { background-color: #5865F2; color: white; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 6px; display: block; margin-bottom: 12px; font-weight: bold; }
            .btn-invite { background-color: #43b581; }
        </style></head>
        <body>
            <div class="card">
                <h2>RKS•ＰＯＷＥＲ</h2>
                <p>لوحة التحكم الشاملة مع جميع الأقسام والحماية</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد 🎮</a>
                <a href="${INVITE_URL}" target="_blank" class="btn btn-invite">إضافة البوت لسيرفرك ➕</a>
            </div>
        </body></html>
    `);
});

// --- قائمة السيرفرات ---
app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}/commands" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #36393f; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 140px;">
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

// --- لوحة التحكم الشاملة بكل الأقسام ---
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود أو البوت غير مضاف إليه.');
    
    if (!guildSettings[guild.id]) {
        guildSettings[guild.id] = { 
            prefix: '!',
            welcomeMessage: 'مرحباً بك في السيرفر!',
            autoRoleName: '@Team Rocks',
            spamEnabled: false,
            spamLimit: 5,
            badLinksEnabled: false,
            blacklistedDomains: 'discord.gg, t.me',
            honeypotEnabled: false,
            honeypotChannelId: 'ALL',
            vocauxEnabled: false,
            starboardEnabled: false,
            anniversairesEnabled: false,
            minijeuxEnabled: false,
            rolesReactionEnabled: false,
            rolesTemporairesEnabled: false,
            logsEnabled: false
        };
    }
    const settings = guildSettings[guild.id];
    const section = req.params.section;

    let mainContent = '';

    // توليد المحتوى حسب القسم المطلوب
    if (section === 'commands') {
        mainContent = `
            <h2>⚡ إعدادات الأوامر (Bot Commands)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="commands">
                <label style="display:block; margin-top:15px; font-weight:bold;">بادئة الأوامر (Prefix):</label>
                <input type="text" name="prefix" value="${settings.prefix}" style="padding: 10px; width: 200px; background: #1e1f22; color: white; border: 1px solid #383a40; border-radius: 6px;">
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ البادئة 💾</button>
            </form>
        `;
    } else if (section === 'stats') {
        mainContent = `
            <h2>📈 الإحصائيات (Statistiques)</h2>
            <p>إجمالي أعضاء السيرفر: <b>${guild.memberCount}</b></p>
        `;
    } else if (section === 'vocaux') {
        mainContent = `
            <h2>🎙️ الرومات الصوتية المؤقتة (Vocaux Temporaires)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="vocaux">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="vocauxEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.vocauxEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.vocauxEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'starboard') {
        mainContent = `
            <h2>⭐ لوحة النجوم (Starboard)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="starboard">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="starboardEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.starboardEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.starboardEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'anniversaires') {
        mainContent = `
            <h2>🎂 أعياد الميلاد (Anniversaires)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="anniversaires">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="anniversairesEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.anniversairesEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.anniversairesEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'minijeux') {
        mainContent = `
            <h2>🎮 الألعاب المصغرة (Mini-jeux)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="minijeux">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="minijeuxEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.minijeuxEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.minijeuxEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'autoroles') {
        mainContent = `
            <h2>➕ رتب الأعضاء التلقائية (Auto Rôles)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="autoroles">
                <label style="display:block; margin-top:15px; font-weight:bold;">اسم الرتبة:</label>
                <input type="text" name="autoRoleName" value="${settings.autoRoleName}" style="padding: 10px; width: 250px; background: #1e1f22; color: white; border: 1px solid #383a40; border-radius: 6px;">
                <br><br><button type="submit" style="background: #43b581; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ الرتبة 💾</button>
            </form>
        `;
    } else if (section === 'rolesreaction') {
        mainContent = `
            <h2>🏷️ رتب التفاعل (Rôles Réaction)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="rolesreaction">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="rolesReactionEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.rolesReactionEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.rolesReactionEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'rolestemporaires') {
        mainContent = `
            <h2>⏰ الرتب المؤقتة (Rôles Temporaires)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="rolestemporaires">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="rolesTemporairesEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.rolesTemporairesEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.rolesTemporairesEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'spam') {
        mainContent = `
            <h2>💬 منع السبام (Spam Protection)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="spam">
                <label style="display:block; margin-top:15px; font-weight:bold;">حالة الحماية:</label>
                <select name="spamEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border: 1px solid #383a40;">
                    <option value="true" ${settings.spamEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.spamEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <label style="display:block; margin-top:15px; font-weight:bold;">الحد الأقصى للرسائل:</label>
                <input type="number" name="spamLimit" value="${settings.spamLimit}" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'badlinks') {
        mainContent = `
            <h2>🔗 الروابط الضارة (Bad Links)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="badlinks">
                <label style="display:block; margin-top:15px; font-weight:bold;">حالة الحماية:</label>
                <select name="badLinksEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.badLinksEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.badLinksEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <label style="display:block; margin-top:15px; font-weight:bold;">الدومينات الممنوعة:</label>
                <input type="text" name="blacklistedDomains" value="${settings.blacklistedDomains}" style="width:100%; padding:10px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else if (section === 'honeypot') {
        let channelsOptions = `<option value="ALL" ${settings.honeypotChannelId === 'ALL' ? 'selected' : ''}>🌐 كل رومات السيرفر (All Channels)</option>`;
        
        guild.channels.cache
            .filter(c => c.type === 0)
            .forEach(ch => {
                let isSelected = settings.honeypotChannelId === ch.id ? 'selected' : '';
                channelsOptions += `<option value="${ch.id}" ${isSelected}># ${ch.name}</option>`;
            });

        mainContent = `
            <h2>🍯 قنوات الفخ (Honeypot)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="honeypot">
                <label style="display:block; margin-top:15px; font-weight:bold;">حالة الحماية:</label>
                <select name="honeypotEnabled" style="padding:10px; width:100%; background:#1e1f22; color:white; border-radius:6px; border: 1px solid #383a40;">
                    <option value="true" ${settings.honeypotEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.honeypotEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <label style="display:block; margin-top:15px; font-weight:bold;">اختر الروم (أو كل الرومات):</label>
                <select name="honeypotChannelId" style="padding:10px; width:100%; background:#1e1f22; color:white; border-radius:6px; border: 1px solid #383a40;">
                    ${channelsOptions}
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ الإعدادات 💾</button>
            </form>
        `;
    } else if (section === 'logs') {
        mainContent = `
            <h2>📋 سجلات البوت (Logs)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="logs">
                <label style="display:block; margin-top:15px; font-weight:bold;">الحالة:</label>
                <select name="logsEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${settings.logsEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!settings.logsEnabled ? 'selected' : ''}>❌ معطل</option>
                </select>
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ 💾</button>
            </form>
        `;
    } else {
        mainContent = `<h2>⚙️ القسم غير موجود</h2>`;
    }

    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إدارة ${guild.name}</title>
        <style>
            * { box-sizing: border-box; }
            body { background-color: #313338; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; overflow: hidden; }
            .content { flex: 1; padding: 40px; overflow-y: auto; background: #313338; }
            .sidebar { width: 280px; background: #2b2d31; padding: 20px; display: flex; flex-direction: column; border-right: 1px solid #1f2023; overflow-y: auto; height: 100vh; }
            .sidebar h4 { color: #8e9297; font-size: 11px; margin: 15px 0 5px 0; text-transform: uppercase; }
            .sidebar a { display: block; color: #b9bbbe; text-decoration: none; padding: 9px 12px; margin-bottom: 3px; background: #2b2d31; border-radius: 6px; font-weight: bold; font-size: 13px; }
            .sidebar a:hover { background: #35373c; color: white; }
            .sidebar a.active { background: #5865F2; color: white; }
        </style></head>
        <body>
            <div class="content">
                <div style="background: #2b2d31; padding: 15px 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #383a40;">
                    <span>إدارة سيرفر: <b>${guild.name}</b> 🛡️</span>
                </div>
                ${mainContent}
            </div>
            <div class="sidebar">
                <h3 style="color:white; margin-top:0; font-size: 16px;">RKS Dashboard</h3>
                <a href="/control/${guild.id}/commands" class="${section === 'commands' ? 'active' : ''}">⚡ Bot Commands / الأوامر</a>
                <a href="/control/${guild.id}/stats" class="${section === 'stats' ? 'active' : ''}">📈 Statistiques</a>
                <a href="/control/${guild.id}/vocaux" class="${section === 'vocaux' ? 'active' : ''}">🎙️ Vocaux Temporaires</a>
                <a href="/control/${guild.id}/starboard" class="${section === 'starboard' ? 'active' : ''}">⭐ Starboard</a>
                <a href="/control/${guild.id}/anniversaires" class="${section === 'anniversaires' ? 'active' : ''}">🎂 Anniversaires</a>
                <a href="/control/${guild.id}/minijeux" class="${section === 'minijeux' ? 'active' : ''}">🎮 Mini-jeux</a>
                
                <h4>RÔLES</h4>
                <a href="/control/${guild.id}/autoroles" class="${section === 'autoroles' ? 'active' : ''}">➕ Auto Rôles</a>
                <a href="/control/${guild.id}/rolesreaction" class="${section === 'rolesreaction' ? 'active' : ''}">🏷️ Rôles Réaction</a>
                <a href="/control/${guild.id}/rolestemporaires" class="${section === 'rolestemporaires' ? 'active' : ''}">⏰ Rôles Temporaires</a>

                <h4>MODÉRATION & PROTECTION</h4>
                <a href="/control/${guild.id}/spam" class="${section === 'spam' ? 'active' : ''}">💬 Spam Protection</a>
                <a href="/control/${guild.id}/badlinks" class="${section === 'badlinks' ? 'active' : ''}">🔗 Bad Links</a>
                <a href="/control/${guild.id}/honeypot" class="${section === 'honeypot' ? 'active' : ''}">🍯 Honeypot</a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 Logs</a>

                <div style="margin-top: 20px; border-top: 1px solid #383a40; padding-top: 15px;">
                    <a href="/dashboard" style="background:#5865F2; color:white; text-align:center;">← العودة للسيرفرات</a>
                </div>
            </div>
        </body></html>
    `);
});

// --- حفظ الإعدادات بالكامل ---
app.post('/action/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { 
        guildId, section, prefix, autoRoleName, 
        spamEnabled, spamLimit, badLinksEnabled, blacklistedDomains, 
        honeypotEnabled, honeypotChannelId,
        vocauxEnabled, starboardEnabled, anniversairesEnabled, 
        minijeuxEnabled, rolesReactionEnabled, rolesTemporairesEnabled, logsEnabled 
    } = req.body;
    
    if (!guildSettings[guildId]) guildSettings[guildId] = {};
    const s = guildSettings[guildId];

    if (section === 'commands') s.prefix = prefix || '!';
    if (section === 'autoroles') s.autoRoleName = autoRoleName;
    if (section === 'spam') { s.spamEnabled = spamEnabled === 'true'; s.spamLimit = parseInt(spamLimit) || 5; }
    if (section === 'badlinks') { s.badLinksEnabled = badLinksEnabled === 'true'; s.blacklistedDomains = blacklistedDomains; }
    if (section === 'honeypot') { s.honeypotEnabled = honeypotEnabled === 'true'; s.honeypotChannelId = honeypotChannelId; }
    if (section === 'vocaux') s.vocauxEnabled = vocauxEnabled === 'true';
    if (section === 'starboard') s.starboardEnabled = starboardEnabled === 'true';
    if (section === 'anniversaires') s.anniversairesEnabled = anniversairesEnabled === 'true';
    if (section === 'minijeux') s.minijeuxEnabled = minijeuxEnabled === 'true';
    if (section === 'rolesreaction') s.rolesReactionEnabled = rolesReactionEnabled === 'true';
    if (section === 'rolestemporaires') s.rolesTemporairesEnabled = rolesTemporairesEnabled === 'true';
    if (section === 'logs') s.logsEnabled = logsEnabled === 'true';

    res.redirect(req.headers.referer || '/dashboard');
});

// --- الأوامر والحماية ---
client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const settings = guildSettings[message.guild.id] || { prefix: '!' };

    if (message.content.startsWith(settings.prefix)) {
        const args = message.content.slice(settings.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'ping') {
            await message.channel.send(`🏓 Pong! ${client.ws.ping}ms`);
        } else if (command === 'clear') {
            if (!message.member.permissions.has('ManageMessages')) return message.reply('❌ ليس لديك صلاحية.');
            const count = parseInt(args[0]) || 5;
            await message.channel.bulkDelete(count, true).catch(() => {});
        }
    }

    // فحص قنوات الفخ (كل الرومات أو قناة محددة)
    if (settings.honeypotEnabled) {
        const targetChannel = settings.honeypotChannelId || 'ALL';
        if (targetChannel === 'ALL' || message.channel.id === targetChannel) {
            try {
                await message.delete();
                await message.channel.send(`⚠️ ${message.author}, هذه القناة محمية!`);
            } catch (e) {}
            return;
        }
    }

    // فحص الروابط الضارة
    if (settings.badLinksEnabled && settings.blacklistedDomains) {
        const domains = settings.blacklistedDomains.split(',').map(d => d.trim().toLowerCase());
        const contentLower = message.content.toLowerCase();
        if (domains.some(domain => domain && contentLower.includes(domain))) {
            try {
                await message.delete();
                await message.channel.send(`🚫 ${message.author}, ممنوع إرسال هذا الرابط!`);
            } catch (e) {}
            return;
        }
    }

    // منع السبام
    if (settings.spamEnabled) {
        const userId = message.author.id;
        const now = Date.now();
        if (!userMessageTracker.has(userId)) userMessageTracker.set(userId, []);
        let timestamps = userMessageTracker.get(userId);
        timestamps.push(now);
        timestamps = timestamps.filter(time => now - time < 5000);
        userMessageTracker.set(userId, timestamps);

        if (timestamps.length > (settings.spamLimit || 5)) {
            try {
                await message.delete();
                await message.channel.send(`⚠️ ${message.author}, توقف عن السبام!`);
            } catch (e) {}
        }
    }
});

client.on('ready', () => console.log(`✅ البوت شغال بكامل أقسامه: ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);

app.listen(process.env.PORT || 3000, () => console.log('🚀 الداشبورد الشامل يعمل بنجاح!'));
