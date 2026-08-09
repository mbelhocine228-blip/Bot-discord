require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cron = require('node-cron');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let lastNewsTime = "لم يتم النشر بعد";

const commands = [
    new SlashCommandBuilder().setName('help-bot').setDescription('قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('حالة البوت'),
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('اسأل الذكاء الاصطناعي عن أي شيء وسيجيبك')
        .addStringOption(option => option.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح الرسائل')
        .addIntegerOption(option => option.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة')
        .addStringOption(option => option.setName('message').setDescription('النص').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error(error);
    }
});

async function askAI(promptText) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            { text: "أنت مساعد ذكي ومحترف. أجب بوضوح باللغة العربية: " + promptText }
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(error);
        return "عذراً، تأكد من صحة مفتاح الذكاء الاصطناعي في إعدادات Render.";
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help-bot') {
        await interaction.reply({ content: '🛠️ الأوامر المتاحة:\n`/ask` - للسؤال والبحث\n`/status` - لحالة البوت', ephemeral: true });
    } 
    else if (commandName === 'status') {
        await interaction.reply({ content: '🟢 البوت يعمل بكفاءة تامة!', ephemeral: true });
    }
    else if (commandName === 'ask') {
        await interaction.deferReply();
        const query = interaction.options.getString('question');
        const answer = await askAI(query);
        await interaction.editReply(answer);
    }
    else if (commandName === 'clear') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) 
            return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
        const count = interaction.options.getInteger('count');
        await interaction.channel.bulkDelete(count, true).catch(() => {});
        await interaction.reply({ content: `✅ تم مسح ${count} رسالة.`, ephemeral: true });
    }
    else if (commandName === 'say') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) 
            return interaction.reply({ content: '❌ للمشرفين!', ephemeral: true });
        await interaction.channel.send(interaction.options.getString('message'));
        await interaction.reply({ content: '✅ تم الإرسال.', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.mentions.has(client.user)) {
        const cleanMessage = message.content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();
        if (cleanMessage.length > 0) {
            await message.channel.sendTyping();
            const replyText = await askAI(cleanMessage);
            message.reply(replyText);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
