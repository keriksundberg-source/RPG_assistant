import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { cfg } from './config.js';


export async function registerCommands(token: string, clientId: string) {
const rest = new REST({ version: '10' }).setToken(token);


const commands = [
new SlashCommandBuilder().setName('start-rec').setDescription('Starta inspelning i din röstkanal'),
new SlashCommandBuilder().setName('stop-rec').setDescription('Stoppa inspelning och posta recap'),
new SlashCommandBuilder().setName('privacy').setDescription('Visa policy för inspelning')
].map(c => c.toJSON());


await rest.put(Routes.applicationCommands(clientId), { body: commands });
}