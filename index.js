const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// --- إعدادات الموقع والتحقق (Dashboard & Auth) ---
app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'rks-power-secret-key-99', 
    resave: false, 
    saveUninitialized: false 
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
passport.deserializeUser((obj, done) => done(obj, done));

app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/servers');
});
app.get('/logout', (req, res) => { 
    req.logout(() => res.redirect('/')); 
});

// --- واجهة الموقع الرئيسية الكبيرة والفخمة ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>RKS•ＰＯＷＥＲ Dashboard</title>
            <style>
                body {
                    background-color: #0f1015;
                    color: #ffffff;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .card {
                    background: #1e1f26;
                    padding: 50px 40px;
                    border-radius: 20px;
                    text-align: center;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    max-width: 500px;
                    width: 90%;
                    border: 1px solid #2f3136;
                }
                h1 {
                    font-size: 32px;
                    margin-bottom: 15px;
                    color: #5865F2;
                }
                p {
                    font-size: 18px;
                    color: #b9bbbe;
                    margin-bottom: 35px;
                }
                .btn {
                    background-color: #5865F2;
                    color: white;
                    padding: 16px 32px;
                    font-size: 20px;
                    font-weight: bold;
                    text-decoration: none;
                    border-radius: 12px;
                    display: inline-block;
                    transition: background 0.3s, transform 0.2s;
                    box-shadow: 0 4px 15px rgba(88, 101, 242, 0.4);
                }
                .btn:hover {
                    background-color: #4752c4;
                    transform: scale(1.05);
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم الاحترافية لإدارة سيرفرات ديسكورد بكل كفاءة وسرعة.</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد 🚀</a>
            </div>
        </body>
        </html>
    `);
});

// --- صفحة عرض السيرفرات ---
app.get('/servers', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.redirect('/login');
    
    const guilds = req.user.guilds || [];
    const adminServers = guilds.filter(g => (g.permissions & 0x8) === 0x8);
    
    let html = `
        <div style="font-family: Arial; padding: 30px; background: #1a1a1a; color: white; min-height: 100vh;">
            <h2>مرحباً، ${req.user.username}! اختر سيرفر للبدء في إدارته:</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
    `;
    
    if (adminServers.length === 0) {
        html += `<p style="color: #f04747;">لا توجد سيرفرات تمتلك فيها صلاحية الأدمن (Administrator).</p>`;
    }

    adminServers.forEach(s => {
        const iconUrl = s.icon ? `https://cdn.discordapp.com/icons/${s.id}/${s.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
        html += `
            <a href="/dashboard/${s.id}" style="background: #2f3136; padding: 15px; border-radius: 8px; text-decoration: none; color: white; width: 200px; text-align: center; display: inline-block;">
                <img src="${iconUrl}" width="60" height="60" style="border-radius: 50%;"><br>
                <h4 style="margin: 10px 0 0 0;">${s.name}</h4>
            </a>
        `;
    });
    
    html += `</div></div>`;
    res.send(html);
});

// --- لوحة تحكم السيرفر المحدد ---
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guildId = req.params.guildId;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    if (!guild || (guild.permissions & 0x8) !== 0x8) return res.send('غير مسموح لك بالدخول أو ليس لديك صلاحيات.');

    res.send(`
        <div style="font-family: Arial; padding: 30px; background: #1a1a1a; color: white; min-height: 100vh;">
            <h2>لوحة تحكم السيرفر: ${guild.name} ⚙️</h2>
            <hr style="border-color: #444;">
            <h3>إرسال إعلان عبر البوت:</h3>
            <form action="/send-announcement" method="POST" style="background: #2f3136; padding: 20px; border-radius: 8px; width: 400px;">
                <input type="hidden" name="guildId" value="${guildId}">
                <textarea name="message" rows="4" style="width: 100%; padding: 8px; border-radius: 4px; background: #202225; color: white;" placeholder="اكتب نص الإعلان..."></textarea><br><br>
                <button type="submit" style="background: #3ba55d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">إرسال</button>
            </form>
            <br>
            <a href="/servers" style="color: #00aff4; text-decoration: none;">← العودة لقائمة السيرفرات</a>
        </div>
    `);
});

app.post('/send-announcement', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { guildId, message } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (channel) await channel.send(message);
        }
    } catch (e) { console.log(e); }
    res.send(`<script>alert('تم إرسال الإعلان بنجاح!'); window.location.href='/dashboard/${guildId}';</script>`);
});

// --- تعريف أوامر البوت (Slash Commands) ---
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('say').setDescription('يجعل البوت يكرر رسالتك').addStringOption(opt => opt.setName('message').setDescription('الرسالة').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('نشر إعلان رسمي من البوت').addStringOption(opt => opt.setName('text').setDescription('نص الإعلان').setRequired(true)),
    new SlashCommandBuilder().setName('avatar').setDescription('عرض صورة بروفايلك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(false)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح عدد معين من الرسائل').addIntegerOption(opt => opt.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب').setRequired(false)),
    new SlashCommandBuilder().setName('unban').setDescription('إلغاء حظر عضو بالآيدي').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('mute').setDescription('ميوت مؤقت').addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true)).addIntegerOption(opt => opt.setName('minutes').setDescription('بالدقائق').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('رفع الميوت').addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('قائمة الأوامر')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
});

// --- ميزة الترحيب التلقائي بالأعضاء الجدد ---
client.on('guildMemberAdd', async member => {
    const welcomeChannel = member.guild.channels.cache.find(c => c.name.includes('welcome') || c.name.includes('الترحيب')) || 
                           member.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(member.guild.members.me).has('SendMessages'));
    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎉 عضو جديد انضم إلينا!')
        .setDescription(`أهلاً بك يا ${member} في سيرفر **${member.guild.name}**! نورتنا وشرفت. 🚀`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
});

// --- تنفيذ الأوامر داخل ديسكورد ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply({ content: `Pong! 🏓 سرعة الاستجابة: ${client.ws.ping}ms`, ephemeral: true });
    } 
    else if (commandName === 'say') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) 
            return interaction.reply({ content: 'عذراً، ليس لديك صلاحية!', ephemeral: true });
        await interaction.reply({ content: 'تم الإرسال ✅', ephemeral: true });
        await interaction.channel.send(interaction.options.getString('message'));
    }
    else if (commandName === 'ann') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) 
            return interaction.reply({ content: 'للإدارة فقط!', ephemeral: true });
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('📢 إعلان رسمي').setDescription(interaction.options.getString('text')).setTimestamp();
        await interaction.reply({ content: 'تم نشر الإعلان بنجاح 📢', ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
    }
    else if (commandName === 'avatar') {
        const user = interaction.options.getUser('user') || interaction.user;
        await interaction.reply({ content: `صورة بروفايل ${user.tag}:\n${user.displayAvatarURL({ size: 1024, dynamic: true })}` });
    }
    else if (commandName === 'clear') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        const count = interaction.options.getInteger('count');
        await interaction.channel.bulkDelete(count, true);
        await interaction.reply({ content: `تم مسح ${count} رسالة بنجاح 🧹`, ephemeral: true });
    }
    else if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        await target.ban({ reason });
        await interaction.reply({ content: `تم حظر ${target.user.tag} بنجاح. 🔨` });
    }
    else if (commandName === 'unban') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        await interaction.guild.members.unban(interaction.options.getString('userid'));
        await interaction.reply({ content: `تم رفع الحظر بنجاح ✅` });
    }
    else if (commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        const target = interaction.options.getMember('target');
        await target.kick();
        await interaction.reply({ content: `تم طرد ${target.user.tag} 👢` });
    }
    else if (commandName === 'mute') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        const target = interaction.options.getMember('target');
        await target.timeout(interaction.options.getInteger('minutes') * 60 * 1000, 'ميوت إداري');
        await interaction.reply({ content: `تم إعطاء ميوت لـ ${target.user.tag} 🔇` });
    }
    else if (commandName === 'unmute') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        await interaction.options.getMember('target').timeout(null);
        await interaction.reply({ content: `تم رفع الميوت 🔊` });
    }
    else if (commandName === 'help') {
        await interaction.reply({ content: '🛠️ جميع أوامر الإدارة والترحيب تعمل بنجاح!', ephemeral: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`اللوحة تعمل على المنفذ ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
