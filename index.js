const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

// Tạo bot mới với các intent cần thiết
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Token của bot
const TOKEN = 'TOKEN'; // Thay bằng token của bạn

// Prefix mặc định
let prefix = '!';

// Danh sách các lệnh slash
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Trả lời Pong!'),
  new SlashCommandBuilder()
    .setName('setprefix')
    .setDescription('Thay đổi prefix cho bot')
    .addStringOption(option =>
      option.setName('prefix')
        .setDescription('Prefix mới cho bot')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('av')
    .setDescription('Lấy avatar của bot hoặc một người dùng')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Tag người dùng để lấy avatar')),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Cấm một người dùng khỏi server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người dùng cần cấm')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Lý do cấm'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Đuổi một người dùng khỏi server')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Người dùng cần đuổi')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Lý do đuổi'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Bỏ cấm một người dùng khỏi server bằng ID')
    .addStringOption(option =>
      option.setName('user_id')
        .setDescription('ID người dùng cần bỏ cấm')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Lý do bỏ cấm'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Hiển thị danh sách các lệnh'),
  new SlashCommandBuilder()
    .setName('svinfo')
    .setDescription('Hiển thị thông tin về server')
].map(command => command.toJSON());

// Đăng ký lệnh slash
const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    console.log('Bắt đầu đăng ký lệnh slash...');

    await rest.put(
      Routes.applicationCommands(client.user.id), // Sử dụng ID của bot để đăng ký lệnh
      { body: commands }
    );

    console.log('Đăng ký lệnh slash thành công!');
  } catch (error) {
    console.error('Đăng ký lệnh slash thất bại:', error);
  }
})();

// Sự kiện khi bot sẵn sàng
client.once('ready', () => {
  console.log(`Bot đã đăng nhập với tên: ${client.user.tag}`);
  console.log(`Prefix hiện tại: ${prefix}`);
});

// Xử lý tin nhắn từ người dùng cho lệnh có prefix
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Lệnh !ping
  if (command === 'ping') {
    message.channel.send('Pong!');
  }

  // Lệnh !setprefix <prefix_mới>
  if (command === 'setprefix') {
    if (!args[0]) {
      return message.channel.send('Vui lòng cung cấp prefix mới.');
    }

    prefix = args[0];
    message.channel.send(`Prefix đã được thay đổi thành: ${prefix}`);
  }

  // Lệnh !av
  if (command === 'av') {
    let user = message.mentions.users.first() || message.author;
    let avatarURL = user.displayAvatarURL({ dynamic: true, size: 512 });

    if (message.mentions.users.size > 0) {
      message.channel.send(`Avatar của ${user.tag}:\n${avatarURL}`);
    } else {
      message.channel.send(`Avatar của bạn, ${message.author}:\n${avatarURL}`);
    }
  }

  // Lệnh !svinfo
  if (command === 'svinfo') {
    const { name, createdAt, memberCount, members, roles, channels } = message.guild;
    const creationDate = createdAt.toLocaleDateString();
    const botCount = members.cache.filter(member => member.user.bot).size;
    const roleCount = roles.cache.size;
    const channelCount = channels.cache.size;
    const voiceChannelCount = channels.cache.filter(channel => channel.type === 'GUILD_VOICE').size;

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Thông tin về server: ${name}`)
      .addFields(
        { name: 'Ngày tạo:', value: creationDate, inline: true },
        { name: 'Thành viên:', value: `${memberCount}`, inline: true },
        { name: 'Số bot:', value: `${botCount}`, inline: true },
        { name: 'Vai trò:', value: `${roleCount}`, inline: true },
        { name: 'Kênh:', value: `${channelCount}`, inline: true },
        { name: 'Kênh voice:', value: `${voiceChannelCount}`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `ID Server: ${message.guild.id}` });

    message.channel.send({ embeds: [embed] });
  }

  // Lệnh !ban @user [reason]
  if (command === 'ban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send('Bạn không có quyền cấm người dùng.');
    }

    const user = message.mentions.members.first();
    if (!user) {
      return message.channel.send('Vui lòng tag người dùng cần cấm.');
    }

    const reason = args.slice(1).join(' ') || 'Không có lý do';
    try {
      await user.ban({ reason });
      message.channel.send(`Đã cấm ${user.user.tag} vì: ${reason}`);
    } catch (error) {
      message.channel.send('Không thể cấm người dùng này.');
    }
  }

  // Lệnh !kick @user [reason]
  if (command === 'kick') {
    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return message.channel.send('Bạn không có quyền đuổi người dùng.');
    }

    const user = message.mentions.members.first();
    if (!user) {
      return message.channel.send('Vui lòng tag người dùng cần đuổi.');
    }

    const reason = args.slice(1).join(' ') || 'Không có lý do';
    try {
      await user.kick(reason);
      message.channel.send(`Đã đuổi ${user.user.tag} vì: ${reason}`);
    } catch (error) {
      message.channel.send('Không thể đuổi người dùng này.');
    }
  }

  // Lệnh !unban <user_id> [reason]
  if (command === 'unban') {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send('Bạn không có quyền bỏ cấm người dùng.');
    }

    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'Không có lý do';

    try {
      await message.guild.members.unban(userId, reason);
      message.channel.send(`Đã bỏ cấm người dùng với ID ${userId} vì: ${reason}`);
    } catch (error) {
      message.channel.send('Không thể bỏ cấm người dùng này. Hãy kiểm tra ID.');
    }
  }

  // Lệnh !help
  if (command === 'help') {
    const helpMessage = `
**Danh sách các lệnh có sẵn:**
\`${prefix}ping\` - Kiểm tra kết nối của bot (trả về 'Pong!').
\`${prefix}setprefix <prefix mới>\` - Thay đổi prefix cho bot.
\`${prefix}av [@user]\` - Lấy avatar của bạn hoặc người dùng được tag.
\`${prefix}ban @user [reason]\` - Cấm người dùng khỏi server.
\`${prefix}kick @user [reason]\` - Đuổi người dùng khỏi server.
\`${prefix}unban <user_id> [reason]\` - Bỏ cấm người dùng khỏi server bằng ID.
\`${prefix}svinfo\` - Hiển thị thông tin về server.
\`${prefix}help\` - Hiển thị danh sách các lệnh.
    `;
    message.channel.send(helpMessage);
  }
});

// Đăng nhập bot
client.login(TOKEN);
