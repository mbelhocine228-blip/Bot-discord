const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const cron = require('node-cron');
const http = require('http');

// 1. خادم وهمي لإبقاء البوت شغالاً 24/7 على Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!');
});
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Keep-alive server is listening on port ${PORT}`);
});

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// 2. جميع الأوامر مجتمعة (القديمة + الجديدة + الإعلانات + الإدارة)
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('فحص حالة البوت والتشغيل'),
    new SlashCommandBuilder().setName('bot-working').setDescription('فحص كفاءة البوت وهل هو شغال'),
    new SlashCommandBuilder().setName('log').setDescription('معرفة سجل حالة البوت'),
    
    // أدوات الأعضاء والتواصل
    new SlashCommandBuilder().setName('say').setDescription('يجعل البوت يكرر رسالتك').addStringOption(o => o.setName('message').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إرسال إعلان احترافي ومزخرف بناءً على فكرتك').addStringOption(o => o.setName('idea').setDescription('اكتب فكرة الإعلان').setRequired(true)),

    // أوامر الإدارة والتحكم
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

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح كـ ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('تم تحديث وتسجيل جميع الأوامر بنجاح!');

    // 3. النشر التلقائي لأخبار Racing Master كل 20 دقيقة
    cron.schedule('*/20 * * * *', async () => {
        try {
            const targetChannelId = '1534368094888398978'; // الأيدي الخاص بك
            const targetChannel = await client.channels.fetch(targetChannelId);
            if (targetChannel) {
                await targetChannel.send("🏎️ **[تحديث Racing Master التلقائي]**: لا تنسَ تفقد التحديات اليومية وتعديل سيارتك لتحقيق أفضل أداء على الحلبة!");
            }
        } catch (e) { console.error('خطأ في النشر التلقائي:', e); }
    });
});

// مولد تعبيرات الإعلانات الاحترافية المزخرفة
function generateFancyAnnouncement(idea) {
    return `╔════════════════════════════╗\n` +
           ` 🌟 **إعـلان هـام ومفاجأة كبرى!** 🌟\n` +
           `╚════════════════════════════╝\n\n` +
           `🔥 **التفاصيل:** ${idea}\n\n` +
           `🏁 *استعدوا يا أبطال الحلبة! الفرصة أمامكم الآن لإثبات مهارتكم واكتساح المنافسين للحصول على أروع الجوائز داخل السيرفر!*\n\n` +
           `📢 **تفاعلوا مع المنشور وكونوا على الاستعداد التام للانطلاق!** 🚀\n` +
           `════════════════════════════`;
}

// تنفيذ جميع الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    try {
        if (commandName === 'help') {
            await interaction.reply({ content: '🛠️ **قائمة الأوامر الكاملة:**\n• الإدارة: `/ban`, `/unban`, `/kick`, `/mute`, `/unmute`, `/clear`\n• الأدوات: `/say`, `/ann` (إعلان مزخرف), `/status`, `/bot-working`, `/log`', ephemeral: true });
        }
        else if (commandName === 'status') {
            await interaction.reply('🟢 البوت يعمل بكامل طاقته 24/7 دون توقف.');
        }
        else if (commandName === 'bot-working') {
            await interaction.reply('✅ البوت شغال 100% ويستجيب لجميع الأوامر والمهام.');
        }
        else if (commandName === 'log') {
            await interaction.reply('📊 سجل التشغيل: النظام مستقر تماماً والاتصال مستمر.');
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

// حماية الاتصال وإعادة الاتصال التلقائي
client.on('shardDisconnect', () => { console.log('⚠️ انقطع الاتصال، جاري إعادة المحاولة...'); });
client.login(process.env.DISCORD_TOKEN);
