const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { OpenAI } = require('openai');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(port, () => console.log(`Server running on port ${port}`));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const newsList = [
    "🏎️ تحديث جديد لـ Racing Master: إضافة سيارات أسطورية جديدة!",
    "🛠️ صيانة دورية للسيرفرات تبدأ بعد ساعة، استعدوا!",
    "🏆 انطلاق الموسم الجديد من السباقات التنافسية، ادخلوا للمنافسة!",
    "🔥 تخفيضات خاصة على قطع تطوير المحركات في المتجر الآن.",
    "📢 إعلان هام: تحسينات في نظام الفيزيائية والتحكم في السيارات."
];

let usedNews = new Set();

function sendRacingNews(clientInstance) {
    const channel = clientInstance.channels.cache.get('1534368094888398978');
    if (!channel) return false;
    if (usedNews.size >= newsList.length) usedNews.clear();
    let news;
    do { news = newsList[Math.floor(Math.random() * newsList.length)]; } while (usedNews.has(news));
    usedNews.add(news);
    channel.send(news).catch(console.error);
    return true;
}

const commands = [
    new SlashCommandBuilder().setName('ai').setDescription('اسأل الذكاء الاصطناعي').addStringOption(o => o.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر الشاملة'),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة البوت'),
    new SlashCommandBuilder().setName('userinfo').setDescription('معلومات عن حسابك'),
    new SlashCommandBuilder().setName('serverinfo').setDescription('معلومات عن السيرفر'),
    new SlashCommandBuilder().setName('avatar').setDescription('صورة بروفيل العضو').addUserOption(o => o.setName('user').setDescription('العضو').setRequired(false)),
    new SlashCommandBuilder().setName('say').setDescription('اجعل البوت يكرر رسالتك').addStringOption(o => o.setName('message').setDescription('الرسالة').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder().setName('testnews').setDescription('تجربة نشر خبر Racing Master فوراً').setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('modstatus').setDescription('مراقبة حالة السيرفر').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل').addIntegerOption(o => o.setName('count').setDescription('العدد').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    setInterval(() => { sendRacingNews(client); }, 30 * 60 * 1000);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ping') await interaction.reply(`Pong! ${client.ws.ping}ms`);
    else if (commandName === 'help') {
        const embed = new EmbedBuilder().setTitle('📌 قائمة الأوامر').setDescription('`/ai`, `/ping`, `/userinfo`, `/serverinfo`, `/avatar`, `/say`, `/testnews`, `/modstatus`, `/clear`, `/kick`, `/ban`');
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    else if (commandName === 'testnews') {
        const sent = sendRacingNews(client);
        await interaction.reply({ content: sent ? '✅ تم النشر!' : '❌ فشل النشر.', ephemeral: true });
    }
    else if (commandName === 'modstatus') await interaction.reply({ content: `🛡️ السيرفر: ${interaction.guild.name}\n👥 الأعضاء: ${interaction.guild.memberCount}\n✅ الحالة: آمن`, ephemeral: true });
    else if (commandName === 'say') { await interaction.channel.send(interaction.options.getString('message')); await interaction.reply({ content: 'تم الإرسال!', ephemeral: true }); }
    else if (commandName === 'userinfo') await interaction.reply({ content: `👤 اسم المستخدم: ${interaction.user.tag}\n🆔 الآيدي: ${interaction.user.id}`, ephemeral: true });
    else if (commandName === 'serverinfo') await interaction.reply({ content: `🏰 السيرفر: ${interaction.guild.name}\n👥 الأعضاء: ${interaction.guild.memberCount}`, ephemeral: true });
    else if (commandName === 'avatar') await interaction.reply({ content: interaction.options.getUser('user') ? interaction.options.getUser('user').displayAvatarURL() : interaction.user.displayAvatarURL() });
    else if (commandName === 'clear') { await interaction.channel.bulkDelete(interaction.options.getInteger('count'), true); await interaction.reply({ content: '🧹 تم مسح الرسائل!', ephemeral: true }); }
    else if (commandName === 'kick') { await interaction.options.getMember('user').kick(); await interaction.reply({ content: '👢 تم الطرد.', ephemeral: true }); }
    else if (commandName === 'ban') { await interaction.options.getMember('user').ban(); await interaction.reply({ content: '🔨 تم الحظر.', ephemeral: true }); }
    else if (commandName === 'ai') {
        await interaction.deferReply();
        const completion = await openai.chat.completions.create({ model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: interaction.options.getString('question') }] });
        await interaction.editReply(completion.choices[0].message.content);
    }
});

client.login(process.env.DISCORD_TOKEN);
