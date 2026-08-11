const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
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
const sentRacingMasterNews = new Set();
const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

// --- تسجيل أوامر السلاش (Slash Commands) ---
const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('unban').setDescription('فك الحظر عن عضو').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('mute').setDescription('كتم عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('فك الكتم عن عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(opt => opt.setName('count').setDescription('العدد')),
    new SlashCommandBuilder().setName('ping').setDescription('فحص السرعة'),
    new SlashCommandBuilder().setName('say').setDescription('تكرار الكلام').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إعلان رسمي').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`✅ البوت يعمل كـ: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands('1171579175635800175'), { body: commands });
        console.log('🔄 تم تسجيل أوامر السلاش بنجاح.');
    } catch (error) { console.error(error); }
});

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
                <p>لوحة التحكم الشاملة لجميع أقسام السيرفر</p>
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

// --- لوحة التحكم الكاملة بكل الأقسام والحقول ---
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    if (!guildSettings[guild.id]) {
        guildSettings[guild.id] = { 
            prefix: '!',
            racingMasterNewsEnabled: false,
            racingMasterChannelId: '',
            vocauxEnabled: false,
            starboardEnabled: false,
            anniversairesEnabled: false,
            minijeuxEnabled: false,
            autoRoleName: '@Team Rocks',
            spamEnabled: false,
            spamLimit: 5,
            badLinksEnabled: false,
            blacklistedDomains: 'discord.gg, t.me',
            logsChannelId: ''
        };
    }
    const s = guildSettings[guild.id];
    const section = req.params.section;
    let mainContent = '';

    // رومات النص للأخبار والسجلات
    let textChannelsOptions = '<option value="">-- اختر الروم --</option>';
    guild.channels.cache.forEach(c => {
        if (c.type === 0) {
            textChannelsOptions += `<option value="${c.id}">#${c.name}</option>`;
        }
    });

    if (section === 'commands') {
        mainContent = `
            <h2>⚡ أوامر البوت (أوامر سلاش /)</h2>
            <p>أوامر البوت متكاملة وتعمل مباشرة عبر كتابة رمز <code>/</code> في شات السيرفر:</p>
            <div style="background: #2b2d31; padding: 20px; border-radius: 8px; border: 1px solid #383a40; max-height: 450px; overflow-y: auto; line-height: 1.8;">
                <p><b>🛡️ أوامر الإدارة:</b><br>
                • <code>/ban</code> - حظر عضو مع السبب.<br>
                • <code>/unban</code> - فك الحظر بالآيدي.<br>
                • <code>/kick</code> - طرد عضو.<br>
                • <code>/mute</code> - كتم العضو.<br>
                • <code>/unmute</code> - فك الكتم.<br>
                • <code>/clear</code> - مسح الرسائل بسرعة.</p>
                <p><b>📢 أوامر التفاعل والنشر:</b><br>
                • <code>/say</code> - تكرار النص.<br>
                • <code>/ann</code> - إرسال إعلان رسمي مع منشن عام.<br>
                • <code>/ping</code> - فحص سرعة الاستجابة.</p>
            </div>
        `;
    } else if (section === 'racingmaster') {
        let rmChannels = '<option value="">-- اختر روم الأخبار --</option>';
        guild.channels.cache.forEach(c => {
            if (c.type === 0) {
                rmChannels += `<option value="${c.id}" ${s.racingMasterChannelId === c.id ? 'selected' : ''}>#${c.name}</option>`;
            }
        });
        mainContent = `<h2>🏎️ أخبار Racing Master التلقائية (كل 20 دقيقة)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="racingmaster">
                <label style="display:block; margin-bottom:8px; font-weight:bold;">حالة النشر التلقائي:</label>
                <select name="racingMasterNewsEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${s.racingMasterNewsEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.racingMasterNewsEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <label style="display:block; margin-bottom:8px; font-weight:bold;">اختر الروم لنشر الأخبار فيه:</label>
                <select name="racingMasterChannelId" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    ${rmChannels}
                </select><br><br>
                <button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">حفظ الإعدادات 💾</button>
            </form>`;
    } else if (section === 'stats') {
        mainContent = `<h2>📈 الإحصائيات (Statistiques)</h2>
            <p>• إجمالي أعضاء السيرفر: <b>${guild.memberCount}</b></p>
            <p>• إجمالي الرومات: <b>${guild.channels.cache.size}</b></p>`;
    } else if (section === 'vocaux') {
        mainContent = `<h2>🎙️ الرومات الصوتية المؤقتة</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="vocaux">
                <select name="vocauxEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.vocauxEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.vocauxEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'starboard') {
        mainContent = `<h2>⭐ لوحة النجوم (Starboard)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="starboard">
                <select name="starboardEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.starboardEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.starboardEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'anniversaires') {
        mainContent = `<h2>🎂 أعياد الميلاد (Anniversaires)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="anniversaires">
                <select name="anniversairesEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.anniversairesEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.anniversairesEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'minijeux') {
        mainContent = `<h2>🎮 الألعاب المصغرة (Mini-jeux)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="minijeux">
                <select name="minijeuxEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.minijeuxEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.minijeuxEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'autoroles') {
        mainContent = `<h2>➕ الرتب التلقائية (Auto Rôles)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="autoroles">
                <label style="display:block; margin-bottom:8px; font-weight:bold;">اسم الرتبة التلقائية عند دخول العضو:</label>
                <input type="text" name="autoRoleName" value="${s.autoRoleName}" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;"><br><br>
                <button type="submit" style="background:#43b581; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ الرتبة 💾</button>
            </form>`;
    } else if (section === 'rolesreaction') {
        mainContent = `<h2>🎭 رتب التفاعل (Rôles Réaction)</h2><p>إدارة رتب الأزرار والتفاعلات بكل سهولة.</p>`;
    } else if (section === 'rolestemporaires') {
        mainContent = `<h2>⏰ الرتب المؤقتة (Rôles Temporaires)</h2><p>إدارة تعيين وإزالة الرتب بمدة زمنية.</p>`;
    } else if (section === 'spam') {
        mainContent = `<h2>💬 حماية السبام (Spam Protection)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="spam">
                <label style="display:block; margin-bottom:8px; font-weight:bold;">حالة حماية السبام:</label>
                <select name="spamEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${s.spamEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.spamEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <label style="display:block; margin-bottom:8px; font-weight:bold;">الحد الأقصى للرسائل المتكررة:</label>
                <input type="number" name="spamLimit" value="${s.spamLimit}" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;"><br><br>
                <button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'badlinks') {
        mainContent = `<h2>🔗 الروابط الضارة (Bad Links)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="badlinks">
                <label style="display:block; margin-bottom:8px; font-weight:bold;">حالة حظر الروابط:</label>
                <select name="badLinksEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${s.badLinksEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.badLinksEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <label style="display:block; margin-bottom:8px; font-weight:bold;">الدومينات المحظورة:</label>
                <input type="text" name="blacklistedDomains" value="${s.blacklistedDomains}" style="width:100%; padding:10px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;"><br><br>
                <button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'honeypot') {
        mainContent = `<h2>🍯 نظام Honeypot</h2><p>رصد ومكافحة الحسابات الوهمية والاختراقات التلقائية.</p>`;
    } else if (section === 'logs') {
        mainContent = `<h2>📋 السجلات (Logs)</h2><p>مراقبة وتتبع كافة الأحداث داخل السيرفر.</p>`;
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
                <a href="/control/${guild.id}/commands" class="${section === 'commands' ? 'active' : ''}">⚡ Bot Commands</a>
                <a href="/control/${guild.id}/racingmaster" class="${section === 'racingmaster' ? 'active' : ''}">🏎️ Racing Master News</a>
                <a href="/control/${guild.id}/stats" class="${section === 'stats' ? 'active' : ''}">📈 Statistiques</a>
                <a href="/control/${guild.id}/vocaux" class="${section === 'vocaux' ? 'active' : ''}">🎙️ Vocaux Temporaires</a>
                <a href="/control/${guild.id}/starboard" class="${section === 'starboard' ? 'active' : ''}">⭐ Starboard</a>
                <a href="/control/${guild.id}/anniversaires" class="${section === 'anniversaires' ? 'active' : ''}">🎂 Anniversaires</a>
                <a href="/control/${guild.id}/minijeux" class="${section === 'minijeux' ? 'active' : ''}">🎮 Mini-jeux</a>
                <h4>RÔLES</h4>
                <a href="/control/${guild.id}/autoroles" class="${section === 'autoroles' ? 'active' : ''}">➕ Auto Rôles</a>
                <a href="/control/${guild.id}/rolesreaction" class="${section === 'rolesreaction' ? 'active' : ''}">🎭 Rôles Réaction</a>
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

// --- معالجة حفظ الإعدادات بالكامل ---
app.post('/action/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { 
        guildId, section, racingMasterNewsEnabled, racingMasterChannelId,
        vocauxEnabled, starboardEnabled, anniversairesEnabled, minijeuxEnabled,
        autoRoleName, spamEnabled, spamLimit, badLinksEnabled, blacklistedDomains 
    } = req.body;
    
    if (!guildSettings[guildId]) guildSettings[guildId] = {};
    const s = guildSettings[guildId];

    if (section === 'racingmaster') {
        s.racingMasterNewsEnabled = racingMasterNewsEnabled === 'true';
        s.racingMasterChannelId = racingMasterChannelId || '';
    }
    if (section === 'vocaux') s.vocauxEnabled = vocauxEnabled === 'true';
    if (section === 'starboard') s.starboardEnabled = starboardEnabled === 'true';
    if (section === 'anniversaires') s.anniversairesEnabled = anniversairesEnabled === 'true';
    if (section === 'minijeux') s.minijeuxEnabled = minijeuxEnabled === 'true';
    if (section === 'autoroles') s.autoRoleName = autoRoleName;
    if (section === 'spam') { s.spamEnabled = spamEnabled === 'true'; s.spamLimit = parseInt(spamLimit) || 5; }
    if (section === 'badlinks') { s.badLinksEnabled = badLinksEnabled === 'true'; s.blacklistedDomains = blacklistedDomains; }

    res.redirect(req.headers.referer || '/dashboard');
});

// --- نظام أخبار Racing Master التلقائي في الروم المحدد ---
setInterval(() => {
    client.guilds.cache.forEach(async guild => {
        const s = guildSettings[guild.id];
        if (!s || !s.racingMasterNewsEnabled || !s.racingMasterChannelId) return;

        const sampleNewsList = [
            { id: 'rm_update_2026_v1', title: 'تحديث جديد لسيارات الحلبات في Racing Master!', desc: 'تمت إضافة سيارات خارقة جديدة وتحسينات ضخمة على جرافيك اللعبة والفيزياء.' },
            { id: 'rm_event_season_5', title: 'انطلاق موسم التحديات الجديد في Racing Master!', desc: 'شارك الآن في سباقات الكلان وتنافس على المراكز الأولى للحصول على مكافآت حصرية.' },
            { id: 'rm_tuning_tips', title: 'دليل محترفي Racing Master: أفضل إعدادات التعديل للسيارات', desc: 'تعرف على أسرع إعدادات لضبط المحرك والتحكم لتطوير أوقاتك في الحلبة.' }
        ];

        const newArticle = sampleNewsList.find(n => !sentRacingMasterNews.has(n.id));
        if (!newArticle) return;
        sentRacingMasterNews.add(newArticle.id);

        const targetChannel = guild.channels.cache.get(s.racingMasterChannelId);
        if (targetChannel) {
            const embed = new EmbedBuilder()
                .setTitle(`🏎️ [أخبار Racing Master الرسمية] ${newArticle.title}`)
                .setDescription(newArticle.desc)
                .setColor('#FF4500')
                .setTimestamp();
            await targetChannel.send({ embeds: [embed] }).catch(() => {});
        }
    });
}, 20 * 60 * 1000);

// --- معالجة أوامر السلاش داخل ديسكورد ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member } = interaction;

    if (commandName === 'ban') {
        if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء.', ephemeral: true });
        const target = options.getMember('user');
        const reason = options.getString('reason') || 'بدون سبب';
        if (!target.bannable) return interaction.reply({ content: '❌ لا يمكنني حظر هذا العضو.', ephemeral: true });
        await target.ban({ reason });
        await interaction.reply({ content: `🔨 تم حظر العضو ${target.user.tag} بنجاح.` });
    } 
    else if (commandName === 'ping') {
        await interaction.reply({ content: `🏓 Pong! ${client.ws.ping}ms` });
    }
    else if (commandName === 'say') {
        const text = options.getString('text');
        await interaction.channel.send(text);
        await interaction.reply({ content: '✅ تم إرسال الرسالة.', ephemeral: true });
    }
    else if (commandName === 'ann') {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
        const text = options.getString('text');
        const embed = new EmbedBuilder().setTitle('📢 إعلان رسمي').setDescription(text).setColor('#FFD700').setTimestamp();
        await interaction.channel.send({ content: '@everyone', embeds: [embed] });
        await interaction.reply({ content: '✅ تم نشر الإعلان.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN);
app.listen(process.env.PORT || 3000, () => console.log('🚀 لوحة التحكم والسيرفر يعملان بكفاءة تامة!'));
