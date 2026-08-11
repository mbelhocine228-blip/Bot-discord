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

// --- تسجيل أوامر السلاش (Slash Commands) تلقائياً ---
const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو المراد حظره').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('unban').setDescription('فك الحظر عن عضو').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو المراد طرده').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('mute').setDescription('كتم عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('فك الكتم عن عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(opt => opt.setName('count').setDescription('عدد الرسائل')),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('say').setDescription('تكرار الكلام').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إعلان رسمي').addStringOption(opt => opt.setName('text').setDescription('نص الإعلان').setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`✅ البوت يعمل كـ: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands('1171579175635800175'), { body: commands });
        console.log('🔄 تم تسجيل أوامر السلاش (Slash Commands) بنجاح.');
    } catch (error) {
        console.error(error);
    }
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

// --- لوحة التحكم والتفاصيل ---
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
            blacklistedDomains: 'discord.gg, t.me'
        };
    }
    const s = guildSettings[guild.id];
    const section = req.params.section;
    let mainContent = '';

    // توليد قائمة الرومات لاختيار روم الأخبار
    let channelsOptions = '<option value="">-- اختر روم الأخبار --</option>';
    guild.channels.cache.forEach(c => {
        if (c.type === 0) { // Text Channel
            channelsOptions += `<option value="${c.id}" ${s.racingMasterChannelId === c.id ? 'selected' : ''}>#${c.name}</option>`;
        }
    });

    if (section === 'commands') {
        mainContent = `
            <h2>⚡ الأوامر المتاحة للبوت (أوامر سلاش /)</h2>
            <p>أوامر البوت تعمل مباشرة عبر كتابة رمز <code>/</code> في أي روم داخل سيرفرك:</p>
            <div style="background: #2b2d31; padding: 20px; border-radius: 8px; border: 1px solid #383a40; max-height: 450px; overflow-y: auto; line-height: 1.8;">
                <p><b>🛡️ أوامر الإدارة:</b><br>
                • <code>/ban</code> - حظر عضو من السيرفر مع سبب.<br>
                • <code>/unban</code> - فك الحظر بواسطة الآيدي.<br>
                • <code>/kick</code> - طرد عضو.<br>
                • <code>/mute</code> - كتم عضو.<br>
                • <code>/unmute</code> - فك الكتم.<br>
                • <code>/clear</code> - مسح الرسائل بسرعة.</p>
                <p><b>📢 أوامر التفاعل:</b><br>
                • <code>/say</code> - تكرار الكلام.<br>
                • <code>/ann</code> - إرسال إعلان رسمي مع منشن عام.<br>
                • <code>/ping</code> - فحص سرعة الاستجابة.</p>
            </div>
        `;
    } else if (section === 'racingmaster') {
        mainContent = `<h2>🏎️ أخبار Racing Master التلقائية (كل 20 دقيقة)</h2>
            <form action="/action/save" method="POST">
                <input type="hidden" name="guildId" value="${guild.id}">
                <input type="hidden" name="section" value="racingmaster">
                <label style="display:block; margin-bottom:8px; font-weight:bold;">حالة النشر التلقائي:</label>
                <select name="racingMasterNewsEnabled" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    <option value="true" ${s.racingMasterNewsEnabled ? 'selected' : ''}>✅ مفعل (كل 20 دقيقة)</option>
                    <option value="false" ${!s.racingMasterNewsEnabled ? 'selected' : ''}>❌ معطل</option>
                </select><br><br>
                <label style="display:block; margin-bottom:8px; font-weight:bold;">اختر الروم المخصص لنشر الأخبار:</label>
                <select name="racingMasterChannelId" style="padding:10px; width:250px; background:#1e1f22; color:white; border-radius:6px; border:1px solid #383a40;">
                    ${channelsOptions}
                </select><br><br>
                <button type="submit" style="background: #5865F2; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer;">حفظ الإعدادات 💾</button>
            </form>`;
    } else if (section === 'stats') {
        mainContent = `<h2>📈 الإحصائيات</h2><p>أعضاء السيرفر: <b>${guild.memberCount}</b></p>`;
    } else if (section === 'vocaux') {
        mainContent = `<h2>🎙️ الرومات الصوتية المؤقتة</h2><p>قريباً تفعيل الإعدادات.</p>`;
    } else if (section === 'starboard') {
        mainContent = `<h2>⭐ لوحة النجوم</h2><p>قريباً تفعيل الإعدادات.</p>`;
    } else if (section === 'anniversaires') {
        mainContent = `<h2>🎂 أعياد الميلاد</h2><p>قريباً تفعيل الإعدادات.</p>`;
    } else if (section === 'minijeux') {
        mainContent = `<h2>🎮 الألعاب المصغرة</h2><p>قريباً تفعيل الإعدادات.</p>`;
    } else if (section === 'autoroles') {
        mainContent = `<h2>➕ الرتب التلقائية</h2><p>إدارة الرتب.</p>`;
    } else if (section === 'rolesreaction') {
        mainContent = `<h2>🎭 رتب التفاعل</h2>`;
    } else if (section === 'rolestemporaires') {
        mainContent = `<h2>⏰ الرتب المؤقتة</h2>`;
    } else if (section === 'spam') {
        mainContent = `<h2>💬 حماية السبام</h2>`;
    } else if (section === 'badlinks') {
        mainContent = `<h2>🔗 الروابط الضارة</h2>`;
    } else if (section === 'honeypot') {
        mainContent = `<h2>🍯 نظام Honeypot</h2>`;
    } else if (section === 'logs') {
        mainContent = `<h2>📋 السجلات</h2>`;
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

// --- حفظ الإعدادات ---
app.post('/action/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { guildId, section, racingMasterNewsEnabled, racingMasterChannelId } = req.body;
    
    if (!guildSettings[guildId]) guildSettings[guildId] = {};
    const s = guildSettings[guildId];

    if (section === 'racingmaster') {
        s.racingMasterNewsEnabled = racingMasterNewsEnabled === 'true';
        s.racingMasterChannelId = racingMasterChannelId || '';
    }

    res.redirect(req.headers.referer || '/dashboard');
});

// --- نظام أخبار Racing Master التلقائي (الروم المخصص) ---
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

// --- معالجة أوامر السلاش (Slash Commands) داخل ديسكورد ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, guild, member } = interaction;

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
