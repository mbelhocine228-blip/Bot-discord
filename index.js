// إضافة الأوامر (Slash Commands)
client.on('ready', async () => {
    console.log(`البوت شغال باسم: ${client.user.tag}`);
    
    // تسجيل الأوامر
    const commands = [
        {
            name: 'ban',
            description: 'حظر عضو من السيرفر',
            options: [{ name: 'user', type: 6, description: 'العضو', required: true }]
        }
    ];
    
    await client.application.commands.set(commands);
    console.log('تم تسجيل أوامر الـ Slash بنجاح!');
});

// تشغيل الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    if (interaction.commandName === 'ban') {
        const member = interaction.options.getMember('user');
        if (member) {
            await member.ban();
            await interaction.reply(`تم حظر ${member.user.tag} بنجاح! 🔨`);
        }
    }
});
