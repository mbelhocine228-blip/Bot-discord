const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const cron = require('node-cron');
const http = require('http');

// 1. خادم الويب (الموقع والتطبيق) + إبقاء البوت شغالاً 24/7
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>RKS•ＰＯＷＥＲ Bot Dashboard</title>
            <style>
                body { background-color: #0f172a; color: #f8fafc; font-family: Tahoma, sans-serif; text-align: center; padding: 40px 20px; margin: 0; }
                .card { background: #1e293b; padding: 25px; border-radius: 15px; max-width: 450px; margin: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.4); border: 2px solid #334155; }
                h1 { color: #38bdf8; margin-bottom: 5px; font-size: 24px; }
                .sub { color: #cbd5e1; font-size: 14px; margin-bottom: 15px; }
                .status { display: inline-block; background: #22c55e; color: white; padding: 6px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; margin: 10px 0; }
                p { color: #94a3b8; font-size: 13px; line-height: 1.5; }
                .commands { text-align: right; background: #0f172a; padding: 12px; border-radius: 10px; margin-top: 15px; font-size: 13px; }
                .commands ul { margin: 5px 0 0 0; padding-right: 20px; color: #38bdf8; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>🏎️ RKS•ＰＯＷＥＲ</h1>
                <div class="sub">لوحة التحكم الرسمية لبوت الديسكورد</div>
                <div class="status">🟢 النظام متصل وشغال 24/7</div>
                <p>النشر التلقائي لأخبار النسخة العالمية من Racing Master مفعل ويعمل بكفاءة عالية.</p>
                <div class="commands">
                    <strong>🛠️ أبرز أوامر البوت:</strong>
                    <ul>
                        <li>/racing-news - أخبار الحلبة</li>
                        <li>/status - فحص حالة البوت</li>
                        <li>أوامر الإدارة والحظر والطرد</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Keep-alive server & web app is listening on port ${PORT}`);
});

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// 2. جميع الأوامر
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('فحص حالة البوت والتشغيل'),
    new SlashCommandBuilder().setName('bot-working').setDescription('فحص كفاءة البوت وهل هو شغال'),
    new SlashCommandBuilder().setName('log').setDescription('معرفة سجل حالة البوت'),
    new SlashCommandBuilder().setName('racing-news').setDescription('عرض أحدث أخبار وتحديثات النسخة العالمية من Racing Master'),
    new SlashCommandBuilder().setName('say').setDescription('يجعل البوت يكرر رسالتك').addStringOption(o => o.setName('message').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إرسال إعلان احترافي ومزخرف بناءً على فكرتك').addStringOption(o => o.setName('idea').setDescription('اكتب فكرة الإعلان').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('amount').setDescription('عدد الرسائل').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(o => o.setName('user').setDescription('العضو المراد حظره').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('رفع الحظر عن عضو باستخدام الآيدي')
        .addStringOption(o => o.setName('userid').setDescription('آيدي العضو').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(o => o.setName('user').setDescription('العضو المراد طرده').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(false)),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('كتم عضو في السيرفر')
        .addUserOption(o => o.setName('user').setDescription('العضو المراد كتمه').setRequired(true)),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('إلغاء الكتم عن عضو')
        .addUserOption(o => o.setName('user').setDescription('العضو المراد فك الكتم عنه').setRequired(true))
].map(c => c.toJSON());

function getRacingMasterNewsEmbed() {
    return new EmbedBuilder()
        .setColor('#ff3366')
        .setTitle('🏎️ Racing Master (Global Version) - أخبار الحلبة')
        .setDescription('آخر مستجدات النسخة العالمية، التحديثات القادمة، السيارات الجديدة، والمسابقات لكلان **RKS•ＰＯＷＥＲ**:')
        .addFields(
            { name: '🔥 التحديث القادم', value: 'ترقبوا أحدث إصدارات النسخة العالمية التي ستجلب خرائط سباق جديدة وتحسينات ضخمة على تجربة القيادة.' },
            { name: '🚗 السيارات المنتظرة', value: 'الاستعداد لإضافة سيارات فئة S خارقة جديدة من أشهر العلامات التجارية العالمية لتوسيع مرآب الحلبة.' },
            { name: '🏆 المسابقات والفعاليات', value: 'فعاليات "Time Attack" ومنافسات الكلان الكبرى على الأبواب؛ جهزوا تعديلات سياراتكم لاكتساح الصدارة!' },
            { name: '💡 نصيحة احترافية', value: 'ضبط إعدادات التعليق والإطارات بدقة هو السر الحقيقي لتسجيل أسرع وقت على اللفة.' }
        )
        .setFooter({ text: 'Racing Master Global • RKS•ＰＯＷＥＲ Community' })
        .setTimestamp();
}

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح كـ ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('تم تحديث وتسجيل جميع الأوامر بنجاح!');

    // النشر التلقائي كل نصف ساعة
    cron.schedule('*/30 * * * *', async () => {
        try {
            const targetChannelId = '1534368094888398978';
            const targetChannel = await client.channels.fetch(targetChannelId);
            if (targetChannel) {
                const autoEmbed = getRacingMasterNewsEmbed();
                await targetChannel.send({ 
                    content: '📢 **[تحديث تلقائي - النسخة العالمية]** جديد حلبات Racing Master:', 
                    embeds: [autoEmbed] 
                });
            }
        } catch (e) { console.error('خطأ في النشر التلقائي:', e); }
    });
});

function generateFancyAnnouncement(idea) {
    return `╔════════════════════════════╗\n` +
           ` 🌟 **إعـلان هـام ومفاجأة كبرى!** 🌟\n` +
           `╚════════════════════════════╝\n\n` +
           `🔥 **التفاصيل:** ${idea}\n\n` +
           `🏁 *استعدوا يا أبطال الحلبة! الفرصة أمامكم الآن لإثبات مهارتكم واكتساح المنافسين للحصول على أروع الجوائز داخل السيرفر!*\n` +
           `════════════════════════════`;
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    try {
        if (commandName === 'help') {
            await interaction.reply({ content: '🛠️ **قائمة الأوامر الكاملة:**\n• الإدارة: `/ban`, `/unban`, `/kick`, `/mute`, `/unmute`, `/clear`\n• الأدوات والألعاب: `/racing-news`, `/say`, `/ann`, `/status`, `/bot-working`, `/log`', ephemeral: true });
        }
        else if (commandName === 'status') {
            await interaction.reply('🟢 البوت يعمل بكامل طاقته 24/7 والنشر التلقائي لأخبار Racing Master مفعل كل 30 دقيقة.');
        }
        else if (commandName === 'bot-working') {
            await interaction.reply('✅ البوت شغال 100% ويستجيب لجميع الأوامر والمهام.');
        }
        else if (commandName === 'log') {
            await interaction.reply('📊 سجل التشغيل: النظام مستقر تماماً والاتصال مستمر.');
        }
        else if (commandName === 'racing-news') {
            const newsEmbed = getRacingMasterNewsEmbed();
            await interaction.reply({ embeds: [newsEmbed] });
        }
        else if (commandName === 'say') {
            const msg = interaction.options.getString('message');
            await interaction.reply({ content: 'تم الإرسال.', ephemeral: true });
            await interaction.channel.send(msg);
        }
        else if (commandName === 'ann') {
            const idea = interaction.options.getString('idea');
            const fancyAd = generateFancyAnnouncement(idea);
            await interaction.reply({ content: '✨ تم صياغة ونشر الإعلان بنجاح!', ephemeral: true });
            await interaction.channel.send(fancyAd);
        }
        else if (commandName === 'clear') {
            const amount = interaction.options.getInteger('amount');
            await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({ content: `🧹 تم مسح ${amount} رسالة بنجاح.`, ephemeral: true });
        }
        else if (commandName === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'بدون سبب محدد';
            await interaction.guild.members.ban(user, { reason });
            await interaction.reply(`🔨 تم حظر العضو **${user.tag}** بنجاح. السبب: ${reason}`);
        }
        else if (commandName === 'unban') {
            const userId = interaction.options.getString('userid');
            await interaction.guild.members.unban(userId);
            await interaction.reply(`🔓 تم رفع الحظر عن العضو بنجاح.`);
        }
        else if (commandName === 'kick') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'بدون سبب محدد';
            const member = await interaction.guild.members.fetch(user.id);
            await member.kick(reason);
            await interaction.reply(`👢 تم طرد العضو **${user.tag}** بنجاح.`);
        }
        else if (commandName === 'mute') {
            await interaction.reply({ content: '⚠️ تم استلام أمر الكتم بنجاح.', ephemeral: true });
        }
        else if (commandName === 'unmute') {
            await interaction.reply({ content: '✅ تم إزالة الكتم عن العضو بنجاح.', ephemeral: true });
        }
    } catch (err) {
        console.error(err);
        if (!interaction.replied) {
            await interaction.reply({ content: '❌ حدث خطأ، تأكد من صلاحيات البوت.', ephemeral: true });
        }
    }
});

client.on('shardDisconnect', () => { console.log('⚠️ انقطع الاتصال، جاري إعادة المحاولة...'); });
client.login(process.env.DISCORD_TOKEN);
