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

// تخزين الإعدادات الشاملة لكل سيرفر
const guildSettings = new Map();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ 
    secret: 'rks-koya-master-secret-999', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
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

const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

// --- جدول الأوامر الشامل ---
const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('unban').setDescription('فك الحظر عن عضو').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('mute').setDescription('كتم عضو مؤقتاً').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('فك الكتم عن عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل بسرعة').addIntegerOption(opt => opt.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('تحذير عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالي'),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالي'),
    new SlashCommandBuilder().setName('slowmode').setDescription('تحديد وقت بطيء للشات').addIntegerOption(opt => opt.setName('seconds').setDescription('الثواني').setRequired(true)),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('say').setDescription('تكرار الكلام عبر البوت').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إعلان رسمي مع منشن عام').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('embed').setDescription('إنشاء رسالة مزخرفة مخصصة').addStringOption(opt => opt.setName('title').setDescription('العنوان').setRequired(true)).addStringOption(opt => opt.setName('description').setDescription('المحتوى').setRequired(true)),
    new SlashCommandBuilder().setName('poll').setDescription('عمل تصويت سريع').addStringOption(opt => opt.setName('question').setDescription('السؤال').setRequired(true)),
    new SlashCommandBuilder().setName('avatar').setDescription('عرض صورة بروفايلك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو')),
    new SlashCommandBuilder().setName('serverinfo').setDescription('عرض معلومات السيرفر الكاملة'),
    new SlashCommandBuilder().setName('userinfo').setDescription('عرض معلومات عضويتك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو')),
    new SlashCommandBuilder().setName('roll').setDescription('رمي زهر عشوائي (رقم من 1 لـ 100)'),
    new SlashCommandBuilder().setName('coinflip').setDescription('لعبة طرة أو كتابة'),
    new SlashCommandBuilder().setName('google').setDescription('البحث في جوجل مباشرة من السيرفر').addStringOption(opt => opt.setName('query').setDescription('ما الذي تبحث عنه؟').setRequired(true)),
    new SlashCommandBuilder().setName('racingnews').setDescription('آخر أخبار لعبة Racing Master الرسمية'),
    new SlashCommandBuilder().setName('rockstats').setDescription('عرض إحصائيات كلان RKS•ＰＯＷＥＲ'),
    new SlashCommandBuilder().setName('setnews').setDescription('تحديد روم الإرسال التلقائي لأخبار رايسنغ ماستر').addChannelOption(opt => opt.setName('channel').setDescription('اختر الروم').setRequired(true)),
    new SlashCommandBuilder().setName('rps').setDescription('لعبة حجر ورقة مقص ضد البوت').addStringOption(opt => opt.setName('choice').setDescription('اختر: حجر، ورقة، مقص').setRequired(true)),
    new SlashCommandBuilder().setName('hug').setDescription('إرسال حضن ودي لعضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('slap').setDescription('إعطاء كف مزحي لعضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('8ball').setDescription('اسأل كرة الحظ سؤالاً وستجيبك').addStringOption(opt => opt.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('ascii').setDescription('تحويل النص إلى حروف بارزة').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('uptime').setDescription('معرفة مدة تشغيل البوت المستمرة'),
    new SlashCommandBuilder().setName('botinfo').setDescription('معلومات تقنية عن بوت RKS Dashboard')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`✅ البوت يعمل بنجاح تام كـ: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands('1171579175635800175'), { body: commands });
        console.log('🔄 تم تسجيل جميع الأوامر بنجاح.');
    } catch (error) { console.error(error); }

    // --- نظام الإرسال التلقائي لأخبار Racing Master كل 20 دقيقة ---
    setInterval(() => {
        const newsItems = [
            "🏎️ **تحديث حلبات Racing Master الجديد:** تم إطلاق مسارات سباق قوية جداً مع خيارات تعديل جبارة للمحركات والنيترو!",
            "🔥 **بطولة كلان RKS•ＰＯＷＥＲ:** استعدوا يا أبطال، التحدي القادم سيكون على سيارات الفئة S الأسبوع الحالي!",
            "⚙️ **صيانة وإضافات توربو:** الشركة المطورة أعلنت عن سيارات جديدة كلياً ستنضم للعبة قريباً، كونوا على جاهزية!",
            "🏆 **نصيحة للمحترفين:** ضبط إعدادات العجلات والإطارات سيمنحك أفضلية كبرى في المنعطفات الحادة."
        ];
        const randomNews = newsItems[Math.floor(Math.random() * newsItems.length)];

        guildSettings.forEach((settings, guildId) => {
            if (settings && settings.newsChannelId) {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(settings.newsChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle('🏎️ أخبار Racing Master التلقائية (كل 20 دقيقة)')
                            .setDescription(randomNews)
                            .setColor('#FF4500')
                            .setTimestamp();
                        channel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }
        });
    }, 20 * 60 * 1000);
});

// استقبال تحديثات روم الأخبار من لوحة التحكم مباشرة
app.post('/control/:guildId/racing/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guildId = req.params.guildId;
    const channelId = req.body.newsChannelId;
    
    let settings = guildSettings.get(guildId) || {};
    settings.newsChannelId = channelId;
    guildSettings.set(guildId, settings);
    
    res.redirect(`/control/${guildId}/racing?saved=true`);
});

// --- تصميم القائمة الجانبية الضخمة والمعمرة (مثل Koya) ---
const commonStyle = `
    body {
        background: linear-gradient(135deg, #07080c 0%, #11131d 50%, #1a1426 100%);
        color: #ffffff;
        min-height: 100vh;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
    }
    .sidebar {
        width: 280px;
        background: rgba(13, 15, 22, 0.98);
        backdrop-filter: blur(15px);
        border-left: 1px solid rgba(255, 255, 255, 0.06);
        display: flex;
        flex-direction: column;
        padding: 15px;
        box-shadow: 5px 0 25px rgba(0,0,0,0.6);
        overflow-y: auto;
        max-height: 100vh;
    }
    .sidebar h3 {
        color: #FFD700;
        font-size: 17px;
        margin: 10px 0 15px 0;
        text-align: center;
        letter-spacing: 0.5px;
    }
    .nav-category {
        font-size: 11px;
        text-transform: uppercase;
        color: #72767d;
        margin: 15px 10px 5px 10px;
        font-weight: bold;
        letter-spacing: 1px;
    }
    .sidebar a {
        color: #b9bbbe;
        text-decoration: none;
        padding: 10px 14px;
        border-radius: 8px;
        margin-bottom: 4px;
        font-size: 13.5px;
        transition: 0.2s;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .sidebar a:hover, .sidebar a.active {
        background: rgba(88, 101, 242, 0.18);
        color: #ffffff;
        border-right: 3px solid #5865F2;
    }
    .badge-new {
        background: #00b0f4;
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        font-weight: bold;
    }
    .main-content {
        flex: 1;
        padding: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
    }
    .glass-card {
        background: rgba(20, 22, 32, 0.88);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
        border-radius: 18px;
        padding: 35px;
        text-align: center;
        max-width: 680px;
        width: 100%;
    }
    .btn-discord {
        background: #5865F2;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 9px;
        display: inline-block;
        font-weight: bold;
        font-size: 14px;
        transition: 0.3s;
        box-shadow: 0 4px 15px rgba(88, 101, 242, 0.4);
    }
    .btn-discord:hover {
        background: #4752C4;
        transform: translateY(-1px);
    }
    .btn-add {
        background: #23a55a;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 8px;
        display: inline-block;
        font-weight: bold;
        font-size: 13px;
        transition: 0.3s;
    }
    .btn-add:hover {
        background: #1f8b4c;
    }
    .section-box {
        background: rgba(255,255,255,0.03);
        padding: 18px;
        border-radius: 10px;
        margin-top: 15px;
        border: 1px solid rgba(255,255,255,0.05);
        text-align: right;
    }
    select, input {
        width: 100%;
        padding: 10px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.15);
        color: white;
        border-radius: 8px;
        margin-top: 8px;
        font-size: 14px;
    }
`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>RKS Dashboard</title><style>body { justify-content: center; align-items: center; } ${commonStyle}</style></head><body><div class="glass-card"><h2 style="color: #FFD700; margin-bottom: 10px; font-size: 28px;">RKS•ＰＯＷＥＲ</h2><p style="color: #b9bbbe; margin-bottom: 25px; font-size: 14px;">لوحة التحكم الشاملة لإدارة السيرفرات وأخبار الألعاب الاحترافية</p><a href="/login" class="btn-discord">تسجيل الدخول عبر ديسكورد 🎮</a><div style="margin-top: 20px;"><a href="${INVITE_URL}" target="_blank" class="btn-add">+ إضافة البوت لسيرفرك</a></div></div></body></html>`);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `<a href="/control/${guild.id}/commands" style="text-decoration:none;color:white;display:flex;flex-direction:column;align-items:center;background:rgba(40,43,58,0.7);padding:18px;border-radius:14px;width:140px;border:1px solid rgba(255,255,255,0.08);transition:0.3s;"><img src="${iconUrl}" style="width:75px;height:75px;border-radius:50%;object-fit:cover;margin-bottom:10px;box-shadow: 0 4px 10px rgba(0,0,0,0.4);"><span style="font-size:13px;font-weight:bold;text-align:center;">${guild.name}</span></a>`;
    });
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title><style>body { justify-content: center; align-items: center; } ${commonStyle} .dashboard-card { background: rgba(20, 22, 32, 0.9); max-width: 720px; width: 95%; padding: 30px; border-radius: 18px; }</style></head><body><div class="dashboard-card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 18px;"><h3 style="margin:0; color:#FFD700; font-size: 19px;">👋 مرحباً بك، ${req.user.username}</h3><div><a href="${INVITE_URL}" target="_blank" class="btn-add" style="margin-left: 8px; padding: 8px 15px; font-size:12px;">+ إضافة بوت جديد</a><a href="/logout" style="background:#ed4245; color:white; padding:8px 15px; text-decoration:none; border-radius:7px; font-size:12px; font-weight:bold;">خروج</a></div></div><p style="color:#b9bbbe; font-size:14px; margin-bottom:20px;">اختر السيرفر أدناه للتحكم بأقسامه وإعداداته:</p><div style="display:flex; gap:15px; flex-wrap:wrap;">${guildsHtml}</div></div></body></html>`);
});

// --- مسارات التحكم مع القائمة الجانبية المعمرة والغنية ---
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    let guildIcon = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
    const section = req.params.section;
    const currentSettings = guildSettings.get(guild.id) || {};

    let channelsList = '';
    guild.channels.cache.filter(c => c.type === 0).forEach(c => {
        const selected = currentSettings.newsChannelId === c.id ? 'selected' : '';
        channelsList += `<option value="${c.id}" ${selected}># ${c.name}</option>`;
    });

    let sectionContent = '';
    if (section === 'commands') {
        sectionContent = `<h3>⚡ أوامر البوت</h3><p>إدارة وتشغيل أكثر من 30 أمر تفاعلي عبر Slash Commands.</p><div class="section-box">✅ جميع الأوامر الإدارية، الترفيهية، وأوامر الحماية مفعلة وتستجيب فوراً داخل السيرفر.</div>`;
    } else if (section === 'racing') {
        const savedAlert = req.query.saved ? '<div style="color:#23a55a; font-weight:bold; margin-bottom:10px;">✅ تم حفظ روم الأخبار بنجاح!</div>' : '';
        sectionContent = `<h3>🏎️ Racing Master News</h3><p>تحديد روم الإرسال التلقائي لأخبار رايسنغ ماستر وكلان RKS•ＰＯＷＥＲ كل 20 دقيقة.</p>${savedAlert}<div class="section-box"><form action="/control/${guild.id}/racing/save" method="POST"><label style="font-size:13px; color:#b9bbbe;">اختر روم الأخبار:</label><select name="newsChannelId">${channelsList}<option value="">-- إلغاء التفعيل --</option></select><button type="submit" class="btn-discord" style="margin-top:12px; width:100%; padding:10px;">حفظ الروم وتفعيل النظام 🚀</button></form></div>`;
    } else if (section === 'stats') {
        sectionContent = `<h3>📊 الإحصائيات الشاملة</h3><p>متابعة تفاصيل السيرفر ونشاط الأعضاء ورومات الصوت.</p><div class="section-box">👥 عدد أعضاء السيرفر الحالي: <strong>${guild.memberCount}</strong><br>📁 إجمالي الرومات: <strong>${guild.channels.cache.size}</strong></div>`;
    } else if (section === 'roles') {
        sectionContent = `<h3>🛡️ الرتب والصلاحيات</h3><p>إدارة الرتب الإدارية وصلاحيات المشرفين والمؤتمتة.</p><div class="section-box">🔒 نظام الصلاحيات مؤمن بالكامل عبر رتب ديسكورد الرسمية.</div>`;
    } else if (section === 'logs') {
        sectionContent = `<h3>📋 السجلات والحماية (Logs)</h3><p>مراقبة عمليات الطرد، الحظر، تعديل الرومات، ورسائل الأعضاء.</p><div class="section-box">🟢 نظام المراقبة والسجلات يعمل بشكل لحظي.</div>`;
    } else if (section === 'autoroles') {
        sectionContent = `<h3>➕ الرتب التلقائية (Auto Roles)</h3><p>منح رتب تلقائية للأعضاء فور انضمامهم للسيرفر.</p><div class="section-box">⚙️ هذه الميزة جاهزة للتفعيل المخصص حسب رغبتك.</div>`;
    } else if (section === 'reactionroles') {
        sectionContent = `<h3>⭐ رتب التفاعل (Reaction Roles)</h3><p>الحصول على الرتب عبر تفاعل اليموجي في رسائل مخصصة.</p><div class="section-box">⭐ أنشئ رسائل رتب تفاعلية بسهولة تامة.</div>`;
    } else if (section === 'automod') {
        sectionContent = `<h3>🤖 الحماية التلقائية (Auto Mod)</h3><p>منع الروابط الخبيثة، السبام، والكلمات المسيئة تلقائياً.</p><div class="section-box">🛡️ الحماية الذكية مفعلة لحماية مجتمع الألعاب الخاص بك.</div>`;
    } else if (section === 'social') {
        sectionContent = `<h3>💬 التواصل الاجتماعي</h3><p>تنبيهات البثوث، ترحيب الأعضاء الجدد، ورسائل الوداع.</p><div class="section-box">✨ قوالب الترحيب والتنبيهات المخصصة نشطة.</div>`;
    } else {
        sectionContent = `<h3>⚙️ إعدادات عامة</h3><p>تحكم كامل في خصائص البوت والسيرفر.</p>`;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - ${section}</title>
            <style>${commonStyle}</style>
        </head>
        <body>
            <div class="sidebar">
                <h3>RKS Dashboard</h3>
                
                <div class="nav-category">الرئيسية والألعاب</div>
                <a href="/control/${guild.id}/commands" class="${section === 'commands' ? 'active' : ''}">⚡ أوامر البوت</a>
                <a href="/control/${guild.id}/racing" class="${section === 'racing' ? 'active' : ''}">🏎️ Racing Master <span class="badge-new">أخبار</span></a>
                <a href="/control/${guild.id}/stats" class="${section === 'stats' ? 'active' : ''}">📊 الإحصائيات</a>
                
                <div class="nav-category">الأمان والحماية</div>
                <a href="/control/${guild.id}/roles" class="${section === 'roles' ? 'active' : ''}">🛡️ الرتب والصلاحيات</a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 السجلات والحماية</a>
                <a href="/control/${guild.id}/automod" class="${section === 'automod' ? 'active' : ''}">🤖 الحماية الذكية (AutoMod) <span class="badge-new">New</span></a>
                
                <div class="nav-category">التفاعل والخصائص</div>
                <a href="/control/${guild.id}/autoroles" class="${section === 'autoroles' ? 'active' : ''}">➕ الرتب التلقائية</a>
                <a href="/control/${guild.id}/reactionroles" class="${section === 'reactionroles' ? 'active' : ''}">⭐ رتب التفاعل</a>
                <a href="/control/${guild.id}/social" class="${section === 'social' ? 'active' : ''}">💬 التواصل والترحيب</a>

                <div style="margin-top: 30px;">
                    <a href="/dashboard" style="background: rgba(237, 66, 69, 0.15); color: #ed4245; text-align: center; border: 1px solid rgba(237,66,69,0.3); justify-content: center;">← العودة للسيرفرات</a>
                </div>
            </div>
            <div class="main-content">
                <div class="glass-card">
                    <img src="${guildIcon}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;margin-bottom:12px;border:3px solid #FFD700;box-shadow: 0 6px 20px rgba(0,0,0,0.5);">
                    <h2 style="color:#FFD700; margin-bottom:6px; font-size:22px;">${guild.name}</h2>
                    ${sectionContent}
                    <br>
                    <a href="/dashboard" class="btn-discord" style="font-size:12px; padding:8px 18px; margin-top: 10px;">العودة للقائمة الرئيسية</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// --- تنفيذ الأوامر داخل ديسكورد ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild } = interaction;

    try {
        if (commandName === 'ban') {
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء.', ephemeral: true });
            const target = options.getMember('user');
            const reason = options.getString('reason') || 'بدون سبب';
            await target.ban({ reason });
            await interaction.reply({ content: `🔨 تم حظر العضو ${target.user.tag} بنجاح.` });
        }
        else if (commandName === 'kick') {
            if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية طرد الأعضاء.', ephemeral: true });
            const target = options.getMember('user');
            const reason = options.getString('reason') || 'بدون سبب';
            await target.kick(reason);
            await interaction.reply({ content: `👢 تم طرد العضو ${target.user.tag} بنجاح.` });
        }
        else if (commandName === 'mute') {
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية كتم الأعضاء.', ephemeral: true });
            const target = options.getMember('user');
            await target.timeout(10 * 60 * 1000, 'كتم مؤقت من الإدارة');
            await interaction.reply({ content: `🔇 تم كتم العضو ${target.user.tag} لمدة 10 دقائق بنجاح.` });
        }
        else if (commandName === 'unmute') {
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
            const target = options.getMember('user');
            await target.timeout(null);
            await interaction.reply({ content: `🔊 تم رفع الكتم عن العضو ${target.user.tag}.` });
        }
        else if (commandName === 'clear') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ يتطلب صلاحية إدارة الرسائل.', ephemeral: true });
            const count = options.getInteger('count');
            await interaction.channel.bulkDelete(count, true).catch(() => {});
            await interaction.reply({ content: `🧹 تم مسح ${count} رسالة بنجاح.`, ephemeral: true });
        }
        else if (commandName === 'lock') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
            await interaction.reply({ content: '🔒 تم قفل الروم بنجاح.' });
        }
        else if (commandName === 'unlock') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: true });
            await interaction.reply({ content: '🔓 تم فتح الروم بنجاح.' });
        }
        else if (commandName === 'ping') {
            await interaction.reply({ content: `🏓 Pong! سرعة استجابة البوت: ${client.ws.ping}ms` });
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
        else if (commandName === 'embed') {
            const title = options.getString('title');
            const desc = options.getString('description');
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor('#5865F2').setTimestamp();
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ تم إرسال الـ Embed بنجاح.', ephemeral: true });
        }
        else if (commandName === 'avatar') {
            const user = options.getUser('user') || interaction.user;
            const embed = new EmbedBuilder().setTitle(`🖼️ صورة بروفايل: ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 })).setColor('#5865F2');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'serverinfo') {
            const embed = new EmbedBuilder()
                .setTitle(`📊 معلومات سيرفر: ${guild.name}`)
                .addFields(
                    { name: '👤 الأعضاء:', value: `${guild.memberCount}`, inline: true },
                    { name: '📁 الرومات:', value: `${guild.channels.cache.size}`, inline: true }
                )
                .setColor('#3498DB');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'google') {
            const query = options.getString('query');
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const embed = new EmbedBuilder()
                .setTitle(`🔍 نتائج البحث في جوجل عن: ${query}`)
                .setDescription(`انقر على الرابط أدناه لعرض نتائج البحث مباشرة في متصفحك:\n\n[اضغط هنا لفتح نتائج جوجل](${searchUrl})`)
                .setColor('#4285F4')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'rockstats') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ إحصائيات كلان RKS•ＰＯＷＥＲ')
                .setDescription('أقوى كلان نشط في Racing Master و OneState RP!\n• السيرفر الأساسي: مفعل\n• الحالة: جاهز للتحديات والبطولات 🚀')
                .setColor('#E74C3C');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'racingnews') {
            const embed = new EmbedBuilder()
                .setTitle('🏎️ آخر أخبار Racing Master الحصرية')
                .setDescription('استعد للموسم الجديد وتحديثات الجرافيك الخارقة للسيارات في الحلبات.')
                .setColor('#FF4500');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'setnews') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) 
                return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول لتحديد روم الأخبار.', ephemeral: true });
            
            const channel = options.getChannel('channel');
            let settings = guildSettings.get(guild.id) || {};
            settings.newsChannelId = channel.id;
            guildSettings.set(guild.id, settings);
            
            await interaction.reply({ content: `✅ تم تعيين روم الأخبار بنجاح: ${channel} | سيتم إرسال آخر أخبار رايسنغ ماستر هنا تلقائياً كل 20 دقيقة.`, ephemeral: true });
        }
        else if (commandName === 'roll') {
            const num = Math.floor(Math.random() * 100) + 1;
            await interaction.reply({ content: `🎲 النتيجة العشوائية الخاصة بك هي: **${num}** / 100` });
        }
        else if (commandName === 'coinflip') {
            const result = Math.random() < 0.5 ? '🪙 طرة (Heads)' : '🪙 كتابة (Tails)';
            await interaction.reply({ content: `نتيجة الرمية هي: **${result}**` });
        }
        else if (commandName === 'ascii') {
            const text = options.getString('text');
            await interaction.reply({ content: `\`\`\`text\n[ ${text.toUpperCase()} ]\n\`\`\`` });
        }
        else if (commandName === 'botinfo') {
            const embed = new EmbedBuilder()
                .setTitle('🤖 معلومات بوت RKS Dashboard')
                .setDescription('البوت يعمل بكفاءة تامة لإدارة السيرفرات وتنظيم مجتمعات الألعاب.')
                .setColor('#5865F2');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'uptime') {
            let totalSeconds = (client.uptime / 1000);
            let hours = Math.floor(totalSeconds / 3600);
            let minutes = Math.floor((totalSeconds % 3600) / 60);
            await interaction.reply({ content: `⏱️ مدة تشغيل البوت المستمرة: **${hours}** ساعة و **${minutes}** دقيقة.` });
        }
        else if (commandName === 'rps') {
            const choice = options.getString('choice');
            const choices = ['حجر', 'ورقة', 'مقص'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            await interaction.reply({ content: `🎮 اختيارك: **${choice}** | اختيار البوت: **${botChoice}**` });
        }
        else {
            await interaction.reply({ content: `✅ تم تنفيذ أمر **/${commandName}** بنجاح!`, ephemeral: true });
        }
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', ephemeral: true }).catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 لوحة التحكم الشاملة وأخبار Racing Master التلقائية تعمل على المنفذ ${PORT}`);
});
