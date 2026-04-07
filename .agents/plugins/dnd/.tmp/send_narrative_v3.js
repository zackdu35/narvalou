import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/Users/zaccharie/Documents/narvalou/.agents/plugins/dnd/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const msgText = `La poussière ne s'est pas encore déposée que le sol tremble à nouveau sous un poids titanesque. À travers la brèche béante de la porte, une première tête dépasse. Un Titan de 15 mètres, au visage étrangement jovial et aux yeux fixes, franchit le seuil d'un pas lourd. Derrière lui, la "vague" commence : des spécimens de 4, 7 et 10 mètres s'engouffrent dans le District de Trost. 

La foule, jusque-là pétrifiée, explose en hurlements de terreur. @Bigorneau, tu fuis à perdre haleine dans les ruelles, tes poumons te brûlant encore, alors qu'un petit Titan de 3 mètres commence à dévorer un étal de boucher à quelques mètres de toi ! 

@diAz, tu suis Bigorneau de près pour le protéger, mais ton regard est attiré par @Moultar qui est resté au sommet du mur. @Moultar, de ton perchoir, tu as une vue d'ensemble sur le massacre... et tu aperçois au pied du mur une famille (un père et sa petite fille) coincés sous une charrette renversée par le souffle de l'explosion. Ils hurlent à l'aide alors qu'un Titan s'approche d'eux d'un pas lent. 

Que faites-vous ? @Moultar, vas-tu les sauver ? @diAz, @Bigorneau, continuez-vous de fuir vers le mur intérieur ou faites-vous volte-face ?`;

async function run() {
  const { error } = await supabase.from('messages').insert([{
    sender_id: 'Le Maître du Donjon',
    receiver_id: 'global',
    content: msgText,
    campaign_id: 4
  }]);
  if (error) console.error(error);
  else console.log('Message Envoyé !');
}
run();
