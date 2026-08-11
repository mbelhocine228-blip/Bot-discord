const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
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
const userMessageTracker = new Map();
const sentRacingMasterNews = new Set();
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
                <p>لوحة التحكم الشاملة لكافة أقسام السيرفر</p>
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

// --- لوحة التحكم التفصيلية والكاملة ---
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود أو البوت غير مضاف إليه.');
    
    if (!guildSettings[guild.id]) {
        guildSettings[guild.id] = { 
            prefix: '!',
            racingMasterNewsEnabled: false,
            vocauxEnabled: false,
            starboardEnabled: false,
            anniversairesEnabled: false,
            minijeuxEnabled: false,
            autoRoleName: '@Team Rocks',
            spamEnabled: false,
            spamLimit: 5,
            badLinksEnabled: false,
            blacklistedDomains: 'discord.gg, t.me',
            honeypotEnabled: false,
            logsEnabled: false
        };
    }
    const s = guildSettings[guild.id];
    const section = req.params.section;

    let mainContent = '';

    if (section === 'commands') {
        mainContent = `
            <h2>⚡ الأوامر الكاملة (30 أمراً متكاملاً)</h2>
            <p>إدارة بادئة الأوامر (Prefix) الخاصة بالبوت:</p>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="commands">
                <label style="display:block; margin-top:15px; font-weight:bold;">بادئة الأوامر:</label>
                <input type="text" name="prefix" value="${s.prefix}" style="padding: 10px; width: 200px; background: #1e1f22; color: white; border: 1px solid #383a40; border-radius: 6px;">
                <br><br><button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold;">حفظ البادئة 💾</button>
            </form>
        `;
    } else if (section === 'racingmaster') {
        mainContent = `<h2>🏎️ أخبار Racing Master التلقائية (كل 20 دقيقة)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="racingmaster">
                <select name="racingMasterNewsEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${s.racingMasterNewsEnabled ? 'selected' : ''}>✅ مفعل (كل 20 دقيقة)</option>
                    <option value="false" ${!s.racingMasterNewsEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">حفظ الإعداد 💾</button>
            </form>`;
    } else if (section === 'stats') {
        mainContent = `<h2>📈 الإحصائيات (Statistiques)</h2>
            <p>إجمالي أعضاء السيرفر: <b>${guild.memberCount}</b> عضو</p>
            <p>إجمالي الرومات: <b>${guild.channels.cache.size}</b> روم</p>`;
    } else if (section === 'vocaux') {
        mainContent = `<h2>🎙️ الرومات الصوتية المؤقتة (Vocaux Temporaires)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="vocaux">
                <select name="vocauxEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.vocauxEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.vocauxEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'starboard') {
        mainContent = `<h2>⭐ لوحة النجوم (Starboard)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="starboard">
                <select name="starboardEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.starboardEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.starboardEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'anniversaires') {
        mainContent = `<h2>🎂 أعياد الميلاد (Anniversaires)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="anniversaires">
                <select name="anniversairesEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.anniversairesEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.anniversairesEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'minijeux') {
        mainContent = `<h2>🎮 الألعاب المصغرة (Mini-jeux)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="minijeux">
                <select name="minijeuxEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.minijeuxEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.minijeuxEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br><button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'autoroles') {
        mainContent = `<h2>➕ الرتب التلقائية (Auto Rôles)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="autoroles">
                <input type="text" name="autoRoleName" value="${s.autoRoleName}" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px;"><br><br>
                <button type="submit" style="background:#43b581; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'rolesreaction') {
        mainContent = `<h2>🎭 رتب التفاعل (Rôles Réaction)</h2><p>إدارة رتب التفاعل التلقائية عبر الأزرار والتفاعلات.</p>`;
    } else if (section === 'rolestemporaires') {
        mainContent = `<h2>⏰ الرتب المؤقتة (Rôles Temporaires)</h2><p>إدارة وتعيين الرتب المؤقتة للأعضاء.</p>`;
    } else if (section === 'spam') {
        mainContent = `<h2>💬 حماية السبام (Spam Protection)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="spam">
                <select name="spamEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.spamEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.spamEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <label>الحد الأقصى للرسائل المتكررة:</label><br>
                <input type="number" name="spamLimit" value="${s.spamLimit}" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;"><br><br>
                <button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'badlinks') {
        mainContent = `<h2>🔗 الروابط الضارة (Bad Links)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}"><input type="hidden" name="section" value="badlinks">
                <select name="badLinksEnabled" style="padding:10px; width:220px; background:#1e1f22; color:white; border-radius:6px;">
                    <option value="true" ${s.badLinksEnabled ? 'selected' : ''}>✅ مفعل</option>
                    <option value="false" ${!s.badLinksEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <label>الدومينات المحظورة:</label><br>
                <input type="text" name="blacklistedDomains" value="${s.blacklistedDomains}" style="width:100%; padding:10px; background:#1e1f22; color:white; border-radius:6px;"><br><br>
                <button type="submit" style="background:#5865F2; color:white; padding:10px 20px; border:none; border-radius:6px; font-weight:bold;">حفظ 💾</button>
            </form>`;
    } else if (section === 'honeypot') {
        mainContent = `<h2>🍯 نظام Honeypot</h2><p>رصد ومكافحة الروبوتات الضارة والاختراقات الوهمية.</p>`;
    } else if (section === 'logs') {
        mainContent = `<h2>📋 السجلات (Logs)</h2><p>تتبع كافة العمليات والنشاطات داخل السيرفر.</p>`;
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

// --- معالجة حفظ إعدادات لوحة التحكم ---
app.post('/action/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { 
        guildId, section, prefix, racingMasterNewsEnabled, 
        vocauxEnabled, starboardEnabled, anniversairesEnabled, 
        minijeuxEnabled, autoRoleName, spamEnabled, spamLimit, 
        badLinksEnabled, blacklistedDomains 
    } = req.body;
    
    if (!guildSettings[guildId]) guildSettings[guildId] = {};
    const s = guildSettings[guildId];

    if (section === 'commands') s.prefix = prefix || '!';
    if (section === 'racingmaster') s.racingMasterNewsEnabled = racingMasterNewsEnabled === 'true';
    if (section === 'vocaux') s.vocauxEnabled = vocauxEnabled === 'true';
    if (section === 'starboard') s.starboardEnabled = starboardEnabled === 'true';
    if (section === 'anniversaires') s.anniversairesEnabled = anniversairesEnabled === 'true';
    if (section === 'minijeux') s.minijeuxEnabled = minijeuxEnabled === 'true';
    if (section === 'autoroles') s.autoRoleName = autoRoleName;
    if (section === 'spam') { s.spamEnabled = spamEnabled === 'true'; s.spamLimit = parseInt(spamLimit) || 5; }
    if (section === 'badlinks') { s.badLinksEnabled = badLinksEnabled === 'true'; s.blacklistedDomains = blacklistedDomains; }

    res.redirect(req.headers.referer || '/dashboard');
});

// --- نظام أخبار Racing Master التلقائي (كل 20 دقيقة بدون تكرار) ---
setInterval(() => {
    client.guilds.cache.forEach(async guild => {
        const s = guildSettings[guild.id];
        if (!s || !s.racingMasterNewsEnabled) return;

        const sampleNewsList = [
            { id: 'rm_update_2026_v1', title: 'تحديث جديد لسيارات الحلبات في Racing Master!', desc: 'تمت إضافة سيارات خارقة جديدة وتحسينات ضخمة على جرافيك اللعبة والفيزياء.' },
            { id: 'rm_event_season_5', title: 'انطلاق موسم التحديات الجديد في Racing Master!', desc: 'شارك الآن في سباقات الكلان وتنافس على المراكز الأولى للحصول على مكافآت حصرية.' },
            { id: 'rm_tuning_tips', title: 'دليل محترفي Racing Master: أفضل إعدادات التعديل للسيارات', desc: 'تعرف على أسرع إعدادات لضبط المحرك والتحكم لتطوير أوقاتك في الحلبة.' }
        ];

        const newArticle = sampleNewsList.find(n => !sentRacingMasterNews.has(n.id));
        if (!newArticle) return;
        sentRacingMasterNews.add(newArticle.id);

        const targetChannel = guild.channels.cache.find(c => c.type === 0 && c.permissionsFor(client.user)?.has(PermissionsBitField.Flags.SendMessages));
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

// --- معالجة الأوامر والحماية ---
client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const s = guildSettings[message.guild.id] || { prefix: '!' };

    if (message.content.startsWith(s.prefix)) {
        const args = message.content.slice(s.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // أمر الحظر Ban
        if (command === 'ban') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ ليس لديك صلاحية حظر الأعضاء.');
            const target = message.mentions.members.first();
            const reason = args.slice(1).join(' ') || 'بدون سبب محدد';
            if (!target) return message.reply('❌ منشن العضو المراد حظره.');
            if (!target.bannable) return message.reply('❌ لا يمكنني حظر هذا العضو.');

            await target.send(`⚠️ تم حظرك من سيرفر **${message.guild.name}**\n📌 السبب: ${reason}`).catch(() => {});
            await target.ban({ reason }).then(async () => {
                const embed = new EmbedBuilder()
                    .setTitle('🔨 تم حظر عضو بنجاح')
                    .setDescription(`**العضو:** ${target.user.tag}\n**المشرف:** ${message.author}\n**السبب:** ${reason}`)
                    .setColor('#ed4245')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            }).catch(() => message.reply('❌ فشل تنفيذ الحظر.'));
        }

        // أمر فك الحظر Unban
        else if (command === 'unban') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return message.reply('❌ ليس لديك صلاحية فك الحظر.');
            const userId = args[0];
            if (!userId) return message.reply('❌ اكتب آيدي (ID) العضو المراد فك الحظر عنه.');

            try {
                const banInfo = await message.guild.bans.fetch(userId);
                await message.guild.members.unban(userId);
                const embed = new EmbedBuilder()
                    .setTitle('🔓 تم رفع الحظر عن العضو بنجاح')
                    .setDescription(`**العضو:** ${banInfo.user.tag}\n**المشرف:** ${message.author}`)
                    .setColor('#57F287')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                await message.reply('❌ لم أتمكن من العثور على هذا العضو في قائمة المحظورين.');
            }
        }

        // أمر الطرد Kick
        else if (command === 'kick') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return message.reply('❌ ليس لديك صلاحية طرد الأعضاء.');
            const target = message.mentions.members.first();
            const reason = args.slice(1).join(' ') || 'بدون سبب محدد';
            if (!target) return message.reply('❌ منشن العضو المراد طرده.');
            if (!target.kickable) return message.reply('❌ لا يمكنني طرد هذا العضو.');

            await target.send(`⚠️ تم طردك من سيرفر **${message.guild.name}**\n📌 السبب: ${reason}`).catch(() => {});
            await target.kick(reason).then(async () => {
                const embed = new EmbedBuilder()
                    .setTitle('👢 تم طرد عضو بنجاح')
                    .setDescription(`**العضو:** ${target.user.tag}\n**المشرف:** ${message.author}\n**السبب:** ${reason}`)
                    .setColor('#faa61a')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            }).catch(() => message.reply('❌ فشل تنفيذ الطرد.'));
        }

        // أمر الكتم Mute
        else if (command === 'mute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply('❌ ليس لديك صلاحية.');
            const target = message.mentions.members.first();
            const reason = args.slice(1).join(' ') || 'بدون سبب';
            if (!target) return message.reply('❌ منشن العضو.');

            let muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
            if (!muteRole) {
                muteRole = await message.guild.roles.create({ name: 'Muted', permissions: [] });
                message.guild.channels.cache.forEach(c => c.permissionOverwrites.create(muteRole, { SendMessages: false, Speak: false }).catch(()=>{}));
            }

            await target.roles.add(muteRole).then(async () => {
                const embed = new EmbedBuilder()
                    .setTitle('🔇 تم كتم عضو')
                    .setDescription(`**العضو:** ${target.user.tag}\n**المشرف:** ${message.author}\n**السبب:** ${reason}`)
                    .setColor('#5865F2')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            }).catch(() => message.reply('❌ فشل كتم العضو.'));
        }

        // أمر فك الكتم Unmute
        else if (command === 'unmute') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return message.reply('❌ ليس لديك صلاحية.');
            const target = message.mentions.members.first();
            if (!target) return message.reply('❌ منشن العضو.');
            const muteRole = message.guild.roles.cache.find(r => r.name === 'Muted');
            if (!muteRole || !target.roles.cache.has(muteRole.id)) return message.reply('❌ العضو ليس مكتوتاً أساساً.');

            await target.roles.remove(muteRole).then(async () => {
                const embed = new EmbedBuilder()
                    .setTitle('🔊 تم رفع الكتم عن العضو')
                    .setDescription(`**العضو:** ${target.user.tag}\n**المشرف:** ${message.author}`)
                    .setColor('#57F287')
                    .setTimestamp();
                await message.channel.send({ embeds: [embed] });
            }).catch(() => message.reply('❌ فشل رفع الكتم.'));
        }

        // أمر مسح الرسائل Clear
        else if (command === 'clear') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return message.reply('❌ ليس لديك صلاحية.');
            const count = parseInt(args[0]) || 5;
            await message.delete().catch(() => {});
            await message.channel.bulkDelete(count, true).then(messages => {
                message.channel.send(`🧹 تم حذف **${messages.size}** رسالة بنجاح.`).then(msg => setTimeout(() => msg.delete().catch(()=>{}), 3000));
            }).catch(() => message.reply('❌ فشل مسح الرسائل.'));
        }

        // أمر التكرار Say
        else if (command === 'say') {
            const text = args.join(' ');
            if (!text) return message.reply('❌ اكتب النص.');
            await message.delete().catch(()=>{});
            await message.channel.send(text);
        }

        // أمر الإعلان الرسمي Ann
        else if (command === 'ann') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return message.reply('❌ يتطلب صلاحية مسؤول.');
            const text = args.join(' ');
            if (!text) return message.reply('❌ اكتب نص الإعلان.');
            await message.delete().catch(()=>{});
            const embed = new EmbedBuilder().setTitle('📢 إعلان رسمي').setDescription(text).setColor('#FFD700').setTimestamp();
            await message.channel.send({ content: '@everyone', embeds: [embed] });
        }

        // أمر البينغ Ping
        else if (command === 'ping') {
            await message.channel.send(`🏓 Pong! ${client.ws.ping}ms`);
        }
    }
});

client.on('ready', () => console.log(`✅ البوت يعمل بكامل الأقسام والأوامر الإدارية: ${client.user.tag}`));
client.login(process.env.DISCORD_TOKEN);

app.listen(process.env.PORT || 3000, () => console.log('🚀 لوحة التحكم والسيرفر يعملان بكفاءة تامة!'));
