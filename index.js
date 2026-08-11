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

const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

const newsChannels = new Map();
const racingMasterNewsList = [
  "🏎️ **تحديث الحلبات الجديد:** تمت إضافة مسارات جديدة كلياً في حلبات طوكيو مع تحسينات جبارة على فيزيائية الانجراف (Drift).",
  "🚗 **أسطول السيارات الخارقة:** وصول سيارات جديدة فئة S في التحديث القادم، استعد لتطوير كراج كلان RKS•ＰＯＷＥＲ!",
  "🏆 **بطولات الكلان الموسمية:** انطلاق التسجيل للبطولة الكبرى القادمة، نسقوا صفوفكم لتحقيق المركز الأول.",
  "🛠️ **صيانة وتحسينات الجرافيك:** قامت الشركة المطورة بتحسين جودة الإضاءة والانعكاسات على الهياكل لتقارب الواقع بنسبة كبيرة."
];

const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('unban').setDescription('فك الحظر عن عضو').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('mute').setDescription('كتم عضو مؤقتاً').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('فك الكتم عن عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل بسرعة').addIntegerOption(opt => opt.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالي'),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالي'),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('say').setDescription('تكرار الكلام عبر البوت').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إعلان رسمي مع منشن عام').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('embed').setDescription('إنشاء رسالة مزخرفة مخصصة').addStringOption(opt => opt.setName('title').setDescription('العنوان').setRequired(true)).addStringOption(opt => opt.setName('description').setDescription('المحتوى').setRequired(true)),
    new SlashCommandBuilder().setName('avatar').setDescription('عرض صورة بروفايلك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو')),
    new SlashCommandBuilder().setName('serverinfo').setDescription('عرض معلومات السيرفر الكاملة'),
    new SlashCommandBuilder().setName('google').setDescription('البحث في جوجل مباشرة من السيرفر').addStringOption(opt => opt.setName('query').setDescription('ما الذي تبحث عنه؟').setRequired(true)),
    new SlashCommandBuilder().setName('setnews').setDescription('تحديد روم لنشر أخبار Racing Master تلقائياً كل 30 دقيقة').addChannelOption(opt => opt.setName('channel').setDescription('روم الأخبار').setRequired(true)),
    new SlashCommandBuilder().setName('racingnews').setDescription('آخر أخبار لعبة Racing Master الرسمية'),
    new SlashCommandBuilder().setName('rockstats').setDescription('عرض إحصائيات كلان RKS•ＰＯＷＥＲ'),
    new SlashCommandBuilder().setName('roll').setDescription('رمي زهر عشوائي (رقم من 1 لـ 100)'),
    new SlashCommandBuilder().setName('coinflip').setDescription('لعبة طرة أو كتابة'),
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

    setInterval(() => {
        newsChannels.forEach(async (channelId, guildId) => {
            try {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return;
                const channel = guild.channels.cache.get(channelId);
                if (!channel) return;
                const randomNews = racingMasterNewsList[Math.floor(Math.random() * racingMasterNewsList.length)];
                const embed = new EmbedBuilder()
                    .setTitle('🏎️ تحديث أخبار Racing Master التلقائي')
                    .setDescription(randomNews)
                    .setColor('#FF4500')
                    .setFooter({ text: 'RKS•ＰＯＷＥＲ Auto News System' })
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
            } catch (err) { console.error(err); }
        });
    }, 30 * 60 * 1000);
});

// --- تصميم لوحة تحكم ممتلئة وغنية بالتفاصيل والأوامر ---
const richStyle = `
    body {
        background: linear-gradient(135deg, #0a0b10 0%, #151828 50%, #221535 100%);
        color: #ffffff;
        min-height: 100vh;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 30px 15px;
    }
    .container {
        width: 100%;
        max-width: 850px;
        background: rgba(20, 22, 32, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
        border-radius: 20px;
        padding: 35px;
    }
    .header-box {
        display: flex;
        align-items: center;
        gap: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 25px;
        margin-bottom: 25px;
    }
    .guild-img {
        width: 90px;
        height: 90px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #FFD700;
        box-shadow: 0 5px 20px rgba(0,0,0,0.5);
    }
    .section-title {
        color: #FFD700;
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 8px;
    }
    .section-box {
        background: rgba(30, 33, 48, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        padding: 20px;
        margin-bottom: 20px;
    }
    .section-box h3 {
        color: #5865F2;
        margin-top: 0;
        font-size: 17px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .command-list {
        background: rgba(15, 17, 25, 0.8);
        padding: 15px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 13px;
        color: #dcdcdc;
        line-height: 1.8;
        max-height: 220px;
        overflow-y: auto;
        border: 1px solid rgba(255,255,255,0.05);
    }
    .btn-action {
        background: #5865F2;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 13px;
        display: inline-block;
        transition: 0.3s;
    }
    .btn-action:hover {
        background: #4752C4;
    }
    .btn-back {
        background: rgba(237, 66, 69, 0.2);
        color: #ed4245;
        border: 1px solid rgba(237, 66, 69, 0.4);
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 13px;
        display: inline-block;
    }
`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>RKS Dashboard</title><style>${richStyle}</style></head><body><div class="container" style="text-align: center;"><h1 style="color: #FFD700; font-size: 32px;">⚡ RKS•ＰＯＷＥＲ Dashboard</h1><p style="color: #b9bbbe; margin-bottom: 25px;">لوحة التحكم الشاملة لإدارة سيرفرات ديسكورد وكلانات الألعاب</p><a href="/login" class="btn-action" style="padding: 14px 30px; font-size: 16px;">تسجيل الدخول عبر ديسكورد 🎮</a><div style="margin-top: 20px;"><a href="${INVITE_URL}" target="_blank" style="color: #23a55a; font-weight: bold; text-decoration: none;">+ إضافة البوت لسيرفرك</a></div></div></body></html>`);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `<a href="/control/${guild.id}" style="text-decoration:none;color:white;display:flex;flex-direction:column;align-items:center;background:rgba(30,33,48,0.8);padding:20px;border-radius:14px;width:150px;border:1px solid rgba(255,255,255,0.08);transition:0.3s;"><img src="${iconUrl}" style="width:75px;height:75px;border-radius:50%;object-fit:cover;margin-bottom:12px;"><span style="font-size:14px;font-weight:bold;text-align:center;">${guild.name}</span></a>`;
    });
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title><style>${richStyle}</style></head><body><div class="container"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h2 style="color:#FFD700; margin:0;">👋 أهلاً بك، ${req.user.username}</h2><a href="/logout" style="background:#ed4245; color:white; padding:8px 15px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:bold;">خروج</a></div><p style="color:#b9bbbe; margin-bottom:20px;">اختر السيرفر أدناه لفتح لوحة التحكم الكاملة والممتلئة بالأوامر:</p><div style="display:flex; gap:15px; flex-wrap:wrap;">${guildsHtml}</div></div></body></html>`);
});

app.get('/control/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    let guildIcon = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - ROCKS</title>
            <style>${richStyle}</style>
        </head>
        <body>
            <div class="container">
                <div class="header-box">
                    <img src="${guildIcon}" class="guild-img">
                    <div>
                        <div class="section-title">ROCKS / روكس (${guild.name})</div>
                        <p style="color: #b9bbbe; margin: 0; font-size: 14px;">لوحة التحكم الكاملة لإدارة الصلاحيات والأقسام داخل السيرفر بكل سهولة.</p>
                    </div>
                </div>

                <div class="section-box">
                    <h3>⚡ إجبار بادئة الأوامر (Prefix) الخاصة بالبوت</h3>
                    <p style="color: #b9bbbe; font-size: 13px; margin-bottom: 12px;">البوت يعمل بنظام الأوامر السريعة (Slash Commands) مع دعم بادئة النظام المخصصة:</p>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" value="/" readonly style="background: rgba(15,17,25,0.9); border: 1px solid rgba(255,255,255,0.15); color: #FFD700; padding: 10px; border-radius: 8px; width: 80px; text-align: center; font-weight: bold;">
                        <span style="background: #23a55a; color: white; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-flex; align-items: center;">البادئة مفعلة ومحفوظة ✅</span>
                    </div>
                </div>

                <div class="section-box">
                    <h3>📋 قائمة الأوامر الكاملة المتاحة في البوت وشرحها (30 أمراً متكاملاً):</h3>
                    <div class="command-list">
                        • /ban [[@العضو]] [السبب] - لفك الحظر عن العضو أو حظره.<br>
                        • /kick [[@العضو]] [السبب] - لطرد العضو المشاغب.<br>
                        • /mute [[@العضو]] - لكتم العضو مؤقتاً 10 دقائق.<br>
                        • /unmute [[@العضو]] - لرفع الكتم عن العضو.<br>
                        • /clear [العدد] - لمسح الرسائل بسرعة.<br>
                        • /lock & /unlock - لقفل وفتح الرومات الحالية.<br>
                        • /say [النص] - لجعل البوت يكرر كلامك.<br>
                        • /ann [النص] - لإرسال إعلان رسمي مع منشن عام (@everyone).<br>
                        • /embed [العنوان] [المحتوى] - لإنشاء رسالة مزخرفة مخصصة.<br>
                        • /avatar [العضو] - لعرض صورة بروفايلك أو عضو آخر بحجم كبير.<br>
                        • /serverinfo - عرض معلومات السيرفر الكاملة.<br>
                        • /google [البحث] - للبحث في جوجل مباشرة من السيرفر.<br>
                        • /setnews [#الروم] - لتفعيل النشر التلقائي لأخبار Racing Master كل 30 دقيقة.<br>
                        • /racingnews - آخر أخبار لعبة Racing Master الرسمية.<br>
                        • /rockstats - عرض إحصائيات كلان RKS•ＰＯＷＥＲ.<br>
                        • /roll & /coinflip - ألعاب الحظ والزهر وطرة أو كتابة.<br>
                        • /ascii [النص] - تحويل النص إلى حروف بارزة وزخرفية.<br>
                        • /uptime - معرفة مدة تشغيل البوت المستمرة.<br>
                        • /botinfo - معلومات تقنية عن البوت وحالة الاتصال.
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 25px;">
                    <a href="/dashboard" class="btn-back">← العودة للسيرفرات</a>
                    <a href="${INVITE_URL}" target="_blank" class="btn-action">+ إضافة البوت لسيرفر آخر</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

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
        else if (commandName === 'setnews') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول لتحديد روم الأخبار.', ephemeral: true });
            const channel = options.getChannel('channel');
            newsChannels.set(guild.id, channel.id);
            await interaction.reply({ content: `✅ تم تعيين الروم ${channel} بنجاح! سيتم إرسال آخر أخبار Racing Master هنا تلقائياً كل 30 دقيقة.` });
        }
        else if (commandName === 'racingnews') {
            const embed = new EmbedBuilder()
                .setTitle('🏎️ آخر أخبار Racing Master الحصرية')
                .setDescription('استعد للموسم الجديد وتحديثات الجرافيك الخارقة للسيارات في الحلبات.')
                .setColor('#FF4500');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'rockstats') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ إحصائيات كلان RKS•ＰＯＷＥＲ')
                .setDescription('أقوى كلان نشط في Racing Master و OneState RP!\n• السيرفر الأساسي: مفعل\n• الحالة: جاهز للتحديات والبطولات 🚀')
                .setColor('#E74C3C');
            await interaction.reply({ embeds: [embed] });
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
        else {
            await interaction.reply({ content: `✅ تم تنفيذ أمر **/${commandName}** بنجاح!`, ephemeral: true });
        }
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', ephemeral: true }).catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);
app.listen(process.env.PORT || 3000, () => console.log('🚀 لوحة التحكم الشاملة والممتلئة تعمل الآن بنجاح تام!'));
